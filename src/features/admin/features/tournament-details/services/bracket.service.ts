import { supabase } from "@/lib/supabase";
import { ADMIN_AUDIT_ACTIONS, logAdminAction } from "@/features/admin/services/audit-log.service";
import type { BracketRound, PrizeTier } from "@/features/tournaments/types";
import type { TournamentPlacement } from "@/features/tournaments/utils/tournament-placements";
import { isTournamentConcluded } from "@/features/tournaments/utils/tournament-status";
import type { BestOfFormat, BracketRoundMeta, ManagedMatch } from "../utils/managed-bracket";
import type { GrandFinalMode } from "../utils/grand-final";
import type { SwissBracketState } from "../utils/managed-swiss-bracket";
import { resolveGrandFinalChampion, resolveStoredGrandFinalMode } from "../utils/grand-final";

export type BracketStateStatus = "not_generated" | "draft" | "published";

export interface PersistedBracketPayload {
  rounds: BracketRound[];
  prizeBreakdown?: PrizeTier[];
  placements?: TournamentPlacement[];
  admin?: {
    managedMatches: ManagedMatch[];
    roundMetas: BracketRoundMeta[];
    roundFormats: Record<string, BestOfFormat>;
    assignmentTeamIds: Array<string | null>;
    swiss?: SwissBracketState;
    includeThirdPlaceMatch?: boolean;
    grandFinalMode?: GrandFinalMode;
  };
}

export interface TournamentBracketState {
  tournamentId: string;
  status: BracketStateStatus;
  seedingLocked: boolean;
  payload: PersistedBracketPayload | null;
  updatedAt: string;
}

function parseBracketData(raw: unknown): PersistedBracketPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const rounds = Array.isArray(data.rounds) ? (data.rounds as BracketRound[]) : [];
  const admin = data.admin as PersistedBracketPayload["admin"];
  const placements = data.placements as TournamentPlacement[] | undefined;
  const hasChampionData =
    placements?.some((p) => p.rank === 1 && p.team?.trim()) ||
    admin?.managedMatches?.some((m) => m.winner) ||
    rounds.some((round) => round.matches?.some((m) => m.winner));
  if (!hasChampionData && rounds.length === 0 && !admin?.managedMatches?.length) {
    return null;
  }
  return {
    rounds,
    prizeBreakdown: data.prizeBreakdown as PrizeTier[] | undefined,
    placements,
    admin,
  };
}

function rowToState(row: Record<string, unknown>): TournamentBracketState {
  return {
    tournamentId: row.tournament_id as string,
    status: row.status as BracketStateStatus,
    seedingLocked: row.seeding_locked as boolean,
    payload: parseBracketData(row.bracket_data),
    updatedAt: row.updated_at as string,
  };
}

export async function fetchBracketState(
  tournamentId: string,
): Promise<TournamentBracketState | null> {
  const { data, error } = await supabase.rpc("get_tournament_bracket_state", {
    p_tournament_id: tournamentId,
  });

  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object") return null;
  return rowToState(data as Record<string, unknown>);
}

export async function fetchPublishedBracket(tournamentId: string): Promise<BracketRound[] | null> {
  const payload = await fetchPublishedBracketPayload(tournamentId);
  return payload?.rounds ?? null;
}

export async function fetchPublishedBracketPayload(
  tournamentId: string,
): Promise<PersistedBracketPayload | null> {
  const state = await fetchBracketState(tournamentId);
  if (!state || state.status !== "published" || !state.payload?.rounds.length) {
    return null;
  }
  return state.payload;
}

export async function savePublishedBracket(
  tournamentId: string,
  payload: PersistedBracketPayload,
): Promise<TournamentBracketState> {
  const { data, error } = await supabase.rpc("upsert_tournament_bracket_state", {
    p_tournament_id: tournamentId,
    p_status: "published",
    p_seeding_locked: true,
    p_bracket_data: payload,
  });

  if (error) throw new Error(error.message);

  const tournamentName = await fetchTournamentNameForAudit(tournamentId);
  void logAdminAction({
    action: ADMIN_AUDIT_ACTIONS.BRACKET_PUBLISHED,
    entityType: "tournament",
    entityId: tournamentId,
    metadata: {
      tournamentName,
      format: payload.admin?.format ?? null,
      roundCount: payload.rounds.length,
    },
  });
  return rowToState(data as Record<string, unknown>);
}

async function fetchTournamentNameForAudit(tournamentId: string): Promise<string | undefined> {
  const { data } = await supabase
    .from("tournaments")
    .select("name")
    .eq("id", tournamentId)
    .maybeSingle();

  return typeof data?.name === "string" ? data.name : undefined;
}

// ── Champion detection ─────────────────────────────────────────────────────

function detectChampionFromPayload(payload: PersistedBracketPayload): string | null {
  const matches = payload.admin?.managedMatches ?? [];
  const grandFinalMode = resolveStoredGrandFinalMode(
    payload.admin?.roundMetas?.map((meta) => meta.id) ?? [],
    payload.admin?.grandFinalMode,
  );

  const fromGrandFinal = resolveGrandFinalChampion(matches, grandFinalMode);
  if (fromGrandFinal) return fromGrandFinal;

  // Legacy: any confirmed grand-side match
  const legacyGrand = matches.find((m) => m.bracketSide === "grand" && m.confirmed && m.winner);
  if (legacyGrand?.winner) return legacyGrand.winner;

  // 2. Single-elim or Swiss playoff final
  const final = matches.find(
    (m) =>
      (m.roundLabel === "Final" || m.roundLabel === "Playoffs — Final") && m.confirmed && m.winner,
  );
  if (final?.winner) return final.winner;

  // 3. Placements array (rank 1 — covers all formats)
  const champion = payload.placements?.find((p) => p.rank === 1 && p.team?.trim());
  if (champion?.team) return champion.team;

  return null;
}

/**
 * Upsert a row in tournament_champions when the bracket has a champion.
 * Uses upsert on tournament_id — safe to call on every save, no duplicates.
 */
async function syncTournamentChampion(
  tournamentId: string,
  tournamentName: string,
  payload: PersistedBracketPayload,
): Promise<void> {
  const { data: tournamentRow, error: statusError } = await supabase
    .from("tournaments")
    .select("status")
    .eq("id", tournamentId)
    .maybeSingle();

  if (statusError) throw new Error(statusError.message);
  if (!tournamentRow || !isTournamentConcluded(tournamentRow.status as string)) return;

  const championName = detectChampionFromPayload(payload);
  if (!championName) return;

  // Resolve team_tag from the teams table
  const { data: teamRow } = await supabase
    .from("teams")
    .select("tag")
    .eq("name", championName)
    .maybeSingle();

  const teamTag: string = teamRow?.tag ?? championName.slice(0, 3).toUpperCase();

  // MVP comes from placements if your bracket writes it
  // const mvp = payload.placements?.find((p) => p.rank === 1)?.mvp ?? null;
  const mvp = null;

  const { data: existing } = await supabase
    .from("tournament_champions")
    .select("completed_at")
    .eq("tournament_id", tournamentId)
    .maybeSingle();

  const completedAt = existing?.completed_at ?? new Date().toISOString().split("T")[0];

  await supabase.from("tournament_champions").upsert(
    {
      tournament_id: tournamentId,
      tournament_name: tournamentName,
      team_name: championName,
      team_tag: teamTag,
      mvp: mvp ?? null,
      completed_at: completedAt,
    },
    { onConflict: "tournament_id" },
  );
}

/** Persist champion archive row after an event is marked concluded. */
export async function syncTournamentChampionArchive(
  tournamentId: string,
  tournamentName: string,
): Promise<void> {
  const state = await fetchBracketState(tournamentId);
  if (!state?.payload) return;
  await syncTournamentChampion(tournamentId, tournamentName, state.payload);
}

// ── Bracket persistence ────────────────────────────────────────────────────

/**
 * Update an already-published bracket (scores, winners) without changing status.
 * Pass tournamentName to auto-sync the champion row whenever a final is decided.
 */
export async function updatePublishedBracket(
  tournamentId: string,
  payload: PersistedBracketPayload,
  tournamentName?: string,
): Promise<TournamentBracketState> {
  const { data, error } = await supabase.rpc("update_tournament_bracket_data", {
    p_tournament_id: tournamentId,
    p_bracket_data: payload,
  });

  if (error) throw new Error(error.message);

  if (tournamentName) {
    // Fire-and-forget — champion sync should never block the bracket save
    syncTournamentChampion(tournamentId, tournamentName, payload).catch((err) => {
      console.error("[bracket.service] syncTournamentChampion failed:", err);
    });
  }

  return rowToState(data as Record<string, unknown>);
}

export async function resetBracketState(tournamentId: string): Promise<void> {
  const { error } = await supabase.rpc("reset_tournament_bracket_state", {
    p_tournament_id: tournamentId,
  });

  if (error) throw new Error(error.message);

  const tournamentName = await fetchTournamentNameForAudit(tournamentId);
  void logAdminAction({
    action: ADMIN_AUDIT_ACTIONS.BRACKET_RESET,
    entityType: "tournament",
    entityId: tournamentId,
    metadata: { tournamentName },
  });

  await deleteTournamentChampion(tournamentId);
}

/** Remove hall-of-champions archive row when a concluded event is reopened or reset. */
export async function deleteTournamentChampion(tournamentId: string): Promise<void> {
  const { error } = await supabase
    .from("tournament_champions")
    .delete()
    .eq("tournament_id", tournamentId);

  if (error) throw new Error(error.message);
}
