import { supabase } from "@/lib/supabase";
import type { MockTournament } from "@/lib/mock-data";
import type { CreateTournamentInput } from "../types";

function isMissingRpcError(message: string): boolean {
  return (
    message.includes("schema cache") ||
    message.includes("Could not find the function") ||
    message.includes("PGRST202")
  );
}

function rowToTournament(row: Record<string, unknown>): MockTournament {
  return {
    id: row.id as string,
    name: row.name as string,
    game: row.game as MockTournament["game"],
    status: row.status as MockTournament["status"],
    prizePool: row.prize_pool as string,
    startDate: row.start_date as string,
    registrationDeadline: row.registration_deadline as string,
    teamsRegistered: row.teams_registered as number,
    teamCap: row.team_cap as number,
    format: row.format as string,
    region: row.region as string,
  };
}

export async function fetchTournaments(): Promise<MockTournament[]> {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToTournament);
}

export async function fetchTournamentById(id: string): Promise<MockTournament | null> {
  const { data, error } = await supabase.from("tournaments").select("*").eq("id", id).single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return data ? rowToTournament(data) : null;
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
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToTournament(data);
}

export async function syncTournamentTeamCount(tournamentId: string, count: number): Promise<void> {
  const { error } = await supabase
    .from("tournaments")
    .update({ teams_registered: count })
    .eq("id", tournamentId);

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
  return rowToTournament(data);
}

export async function updateTournament(
  id: string,
  input: CreateTournamentInput,
): Promise<MockTournament> {
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
      ...(input.status !== undefined ? { status: input.status } : {}),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToTournament(data);
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
  const { data, error } = await supabase.rpc("delete_tournament_if_empty", {
    p_tournament_id: id,
  });

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
