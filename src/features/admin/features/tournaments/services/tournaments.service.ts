import {
  concludeTournamentRegistrations,
  reconcileTournamentTeamCount,
} from "./tournament-registrations.service";
import { supabase } from "@/lib/supabase";
import type { MockTournament } from "@/lib/mock-data";
import {
  blocksRegistrationReopen,
  isRegistrationDeadlineExtended,
  isRegistrationDeadlinePassed,
  withResolvedTournamentStatus,
} from "@/features/tournaments/utils/tournament-status";
import type { PrizeTier } from "@/features/tournaments/types";
import type { ParticipationType, WwmMode } from "@/features/tournaments/types/participation";
import { resolveParticipationType } from "@/features/tournaments/types/participation";
import type { CreateTournamentInput } from "../types";

function isMissingRpcError(message: string): boolean {
  return (
    message.includes("schema cache") ||
    message.includes("Could not find the function") ||
    message.includes("PGRST202")
  );
}

function parsePrizeBreakdown(raw: unknown): PrizeTier[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const tiers = raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const tier = entry as Record<string, unknown>;
      const place = typeof tier.place === "string" ? tier.place : "";
      const prize = typeof tier.prize === "string" ? tier.prize : "";
      if (!place && !prize) return null;
      return { place, prize };
    })
    .filter((tier): tier is PrizeTier => !!tier);
  return tiers.length > 0 ? tiers : undefined;
}

function rowToTournament(row: Record<string, unknown>): MockTournament {
  const game = row.game as MockTournament["game"];
  const wwmMode = (row.wwm_mode as WwmMode | null) ?? null;
  const participationType =
    (row.participation_type as ParticipationType | undefined) ??
    resolveParticipationType(game, wwmMode);

  return {
    id: row.id as string,
    name: row.name as string,
    game,
    status: row.status as MockTournament["status"],
    prizePool: row.prize_pool as string,
    prizeBreakdown: parsePrizeBreakdown(row.prize_breakdown),
    startDate: row.start_date as string,
    registrationDeadline: row.registration_deadline as string,
    teamsRegistered: row.teams_registered as number,
    teamCap: row.team_cap as number,
    format: row.format as string,
    region: row.region as string,
    participationType,
    wwmMode,
  };
}

function participationColumnsMissing(message: string): boolean {
  return message.includes("participation_type") || message.includes("wwm_mode");
}

async function reopenRegistrationIfDeadlineExtended(
  previous: MockTournament | null,
  tournament: MockTournament,
): Promise<MockTournament> {
  if (
    !previous ||
    tournament.status !== "Registration Closed" ||
    blocksRegistrationReopen(tournament.status) ||
    isRegistrationDeadlinePassed(tournament.registrationDeadline) ||
    !isRegistrationDeadlineExtended(previous.registrationDeadline, tournament.registrationDeadline)
  ) {
    return tournament;
  }

  const { data, error } = await supabase
    .from("tournaments")
    .update({ status: "Registration Open" })
    .eq("id", tournament.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToTournament(data);
}

async function closeRegistrationIfDeadlinePassed(
  tournament: MockTournament,
): Promise<MockTournament> {
  if (
    tournament.status !== "Registration Open" ||
    !isRegistrationDeadlinePassed(tournament.registrationDeadline)
  ) {
    return tournament;
  }

  const { data, error } = await supabase
    .from("tournaments")
    .update({ status: "Registration Closed" })
    .eq("id", tournament.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToTournament(data);
}

async function hydrateTournament(tournament: MockTournament): Promise<MockTournament> {
  const teamsRegistered = await reconcileTournamentTeamCount(
    tournament.id,
    tournament.teamsRegistered,
  );
  const withCount =
    teamsRegistered === tournament.teamsRegistered
      ? tournament
      : { ...tournament, teamsRegistered };

  const closed = await closeRegistrationIfDeadlinePassed(withCount);
  return withResolvedTournamentStatus(closed);
}

export async function fetchTournaments(): Promise<MockTournament[]> {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) throw new Error(error.message);
  const tournaments = (data ?? []).map(rowToTournament);
  return Promise.all(tournaments.map((tournament) => hydrateTournament(tournament)));
}

export async function fetchTournamentById(id: string): Promise<MockTournament | null> {
  const { data, error } = await supabase.from("tournaments").select("*").eq("id", id).single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  if (!data) return null;

  return hydrateTournament(rowToTournament(data));
}

export async function getTournamentByIdSync(id: string): Promise<MockTournament | null> {
  return fetchTournamentById(id);
}

export async function createTournament(input: CreateTournamentInput): Promise<MockTournament> {
  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      name: input.name,
      game: input.game,
      format: input.format,
      prize_pool: input.prizePool,
      start_date: input.startDate,
      registration_deadline: input.registrationDeadline,
      team_cap: input.teamCap,
      region: input.region,
      status: input.status ?? "Draft",
      teams_registered: 0,
      participation_type: input.participationType,
      wwm_mode: input.wwmMode ?? null,
    })
    .select()
    .single();

  if (error) {
    if (participationColumnsMissing(error.message)) {
      throw new Error(
        "Participation mode columns are missing. Run docs/sql/tournament_participation_mode.sql in Supabase.",
      );
    }
    throw new Error(error.message);
  }
  return rowToTournament(data);
}

export async function syncTournamentTeamCount(tournamentId: string, count: number): Promise<void> {
  const { error } = await supabase
    .from("tournaments")
    .update({ teams_registered: count })
    .eq("id", tournamentId);

  if (error) throw new Error(error.message);
}

async function releaseTeamsFromTournament(tournamentId: string): Promise<void> {
  const { error } = await supabase
    .from("teams")
    .update({ active_tournament_id: null, active_tournament_name: null })
    .eq("active_tournament_id", tournamentId);

  if (error) throw new Error(error.message);
}

/** Set tournament status — e.g. Draft → Live when a bracket is published. */
export async function updateTournamentStatus(
  tournamentId: string,
  status: MockTournament["status"],
): Promise<MockTournament> {
  const { data, error } = await supabase
    .from("tournaments")
    .update({ status })
    .eq("id", tournamentId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (status === "Completed" || status === "Archived") {
    await concludeTournamentRegistrations(tournamentId);
    await releaseTeamsFromTournament(tournamentId);
  }

  return rowToTournament(data);
}

export async function updateTournamentPrizeBreakdown(
  id: string,
  prizeBreakdown: PrizeTier[],
): Promise<MockTournament> {
  const { data, error } = await supabase
    .from("tournaments")
    .update({ prize_breakdown: prizeBreakdown })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.message.includes("prize_breakdown")) {
      throw new Error(
        "Prize breakdown column is missing. Run docs/sql/tournament_prize_breakdown.sql in Supabase.",
      );
    }
    throw new Error(error.message);
  }
  return rowToTournament(data);
}

export async function updateTournament(
  id: string,
  input: CreateTournamentInput,
): Promise<MockTournament> {
  const previous = await fetchTournamentById(id);

  const { data, error } = await supabase
    .from("tournaments")
    .update({
      name: input.name,
      game: input.game,
      format: input.format,
      prize_pool: input.prizePool,
      start_date: input.startDate,
      registration_deadline: input.registrationDeadline,
      team_cap: input.teamCap,
      region: input.region,
      participation_type: input.participationType,
      wwm_mode: input.wwmMode ?? null,
      ...(input.status !== undefined ? { status: input.status } : {}),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (participationColumnsMissing(error.message)) {
      throw new Error(
        "Participation mode columns are missing. Run docs/sql/tournament_participation_mode.sql in Supabase.",
      );
    }
    throw new Error(error.message);
  }

  let updated = rowToTournament(data);
  if (updated.status === "Completed" || updated.status === "Archived") {
    await concludeTournamentRegistrations(id);
    await releaseTeamsFromTournament(id);
  }

  updated = await reopenRegistrationIfDeadlineExtended(previous, updated);
  return hydrateTournament(updated);
}

/** Unregister all teams from a tournament. Does not delete rows in `teams`. */
async function unregisterAllTeamsFromTournament(tournamentId: string): Promise<void> {
  const { data: regs, error: regErr } = await supabase
    .from("tournament_registrations")
    .select("id, roster_team_id")
    .eq("tournament_id", tournamentId);

  if (regErr) throw new Error(regErr.message);
  if (!regs?.length) return;

  const registrationIds = regs.map((reg) => reg.id as string);
  const rosterTeamIds = [
    ...new Set(
      regs
        .map((reg) => reg.roster_team_id as string | null)
        .filter((teamId): teamId is string => !!teamId),
    ),
  ];

  const { error: playersErr } = await supabase
    .from("tournament_registration_players")
    .delete()
    .in("registration_id", registrationIds);

  if (playersErr) throw new Error(playersErr.message);

  const { error: deleteErr } = await supabase
    .from("tournament_registrations")
    .delete()
    .eq("tournament_id", tournamentId);

  if (deleteErr) throw new Error(deleteErr.message);

  if (rosterTeamIds.length > 0) {
    const { error: teamErr } = await supabase
      .from("teams")
      .update({ active_tournament_id: null, active_tournament_name: null })
      .in("id", rosterTeamIds);

    if (teamErr) throw new Error(teamErr.message);
  }
}

export async function deleteTournament(id: string): Promise<void> {
  let { data, error } = await supabase.rpc("delete_tournament_cascade", {
    p_tournament_id: id,
  });

  if (error && isMissingRpcError(error.message)) {
    ({ data, error } = await supabase.rpc("delete_tournament_if_empty", {
      p_tournament_id: id,
    }));
  }

  if (!error && data) return;

  if (error && !isMissingRpcError(error.message)) {
    throw new Error(error.message);
  }

  const tournament = await fetchTournamentById(id);
  if (!tournament) {
    throw new Error("Tournament not found or could not be deleted.");
  }

  await unregisterAllTeamsFromTournament(id);

  const { error: deleteErr } = await supabase.from("tournaments").delete().eq("id", id);
  if (deleteErr) throw new Error(deleteErr.message);
}
