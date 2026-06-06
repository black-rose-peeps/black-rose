import { supabase } from "@/lib/supabase";
import type { BracketRound } from "@/features/tournaments/types";
import type { BestOfFormat, BracketRoundMeta, ManagedMatch } from "../utils/managed-bracket";

export type BracketStateStatus = "not_generated" | "draft" | "published";

/** Full snapshot persisted to Supabase — public rounds + admin editing state. */
export interface PersistedBracketPayload {
  rounds: BracketRound[];
  admin?: {
    managedMatches: ManagedMatch[];
    roundMetas: BracketRoundMeta[];
    roundFormats: Record<string, BestOfFormat>;
    assignmentTeamIds: Array<string | null>;
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
  if (!Array.isArray(data.rounds)) return null;
  return {
    rounds: data.rounds as BracketRound[],
    admin: data.admin as PersistedBracketPayload["admin"],
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
  const { data, error } = await supabase
    .from("tournament_bracket_state")
    .select("*")
    .eq("tournament_id", tournamentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? rowToState(data) : null;
}

/** Published rounds only — for public display. Returns null when not published. */
export async function fetchPublishedBracket(
  tournamentId: string,
): Promise<BracketRound[] | null> {
  const state = await fetchBracketState(tournamentId);
  if (!state || state.status !== "published" || !state.payload?.rounds.length) {
    return null;
  }
  return state.payload.rounds;
}

/** Upsert published bracket snapshot and lock seeding. */
export async function savePublishedBracket(
  tournamentId: string,
  payload: PersistedBracketPayload,
): Promise<TournamentBracketState> {
  const { data, error } = await supabase
    .from("tournament_bracket_state")
    .upsert(
      {
        tournament_id: tournamentId,
        status: "published",
        seeding_locked: true,
        bracket_data: payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tournament_id" },
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToState(data);
}

/** Update an already-published bracket (scores, winners) without changing status. */
export async function updatePublishedBracket(
  tournamentId: string,
  payload: PersistedBracketPayload,
): Promise<TournamentBracketState> {
  const { data, error } = await supabase
    .from("tournament_bracket_state")
    .update({
      bracket_data: payload,
      updated_at: new Date().toISOString(),
    })
    .eq("tournament_id", tournamentId)
    .eq("status", "published")
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToState(data);
}

/** Clear published bracket — admin reset. */
export async function resetBracketState(tournamentId: string): Promise<void> {
  const { error } = await supabase.from("tournament_bracket_state").upsert(
    {
      tournament_id: tournamentId,
      status: "not_generated",
      seeding_locked: false,
      bracket_data: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tournament_id" },
  );

  if (error) throw new Error(error.message);
}
