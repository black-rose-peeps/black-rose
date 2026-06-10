import { supabase } from "@/lib/supabase";
import type { BracketRound, PrizeTier } from "@/features/tournaments/types";
import type { TournamentPlacement } from "@/features/tournaments/utils/tournament-placements";
import type { BestOfFormat, BracketRoundMeta, ManagedMatch } from "../utils/managed-bracket";
import type { SwissBracketState } from "../utils/managed-swiss-bracket";

export type BracketStateStatus = "not_generated" | "draft" | "published";

/** Full snapshot persisted to Supabase — public rounds + admin editing state. */
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

/** Load bracket state for a tournament (any status). */
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

/** Published rounds only — for public display. Returns null when not published. */
export async function fetchPublishedBracket(
  tournamentId: string,
): Promise<BracketRound[] | null> {
  const payload = await fetchPublishedBracketPayload(tournamentId);
  return payload?.rounds ?? null;
}

/** Full published snapshot — rounds, placements, and prize metadata. */
export async function fetchPublishedBracketPayload(
  tournamentId: string,
): Promise<PersistedBracketPayload | null> {
  const state = await fetchBracketState(tournamentId);
  if (!state || state.status !== "published" || !state.payload?.rounds.length) {
    return null;
  }
  return state.payload;
}

/** Upsert published bracket snapshot and lock seeding. */
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
  return rowToState(data as Record<string, unknown>);
}

/** Update an already-published bracket (scores, winners) without changing status. */
export async function updatePublishedBracket(
  tournamentId: string,
  payload: PersistedBracketPayload,
): Promise<TournamentBracketState> {
  const { data, error } = await supabase.rpc("update_tournament_bracket_data", {
    p_tournament_id: tournamentId,
    p_bracket_data: payload,
  });

  if (error) throw new Error(error.message);
  return rowToState(data as Record<string, unknown>);
}

/** Clear published bracket — admin reset. */
export async function resetBracketState(tournamentId: string): Promise<void> {
  const { error } = await supabase.rpc("reset_tournament_bracket_state", {
    p_tournament_id: tournamentId,
  });

  if (error) throw new Error(error.message);
}
