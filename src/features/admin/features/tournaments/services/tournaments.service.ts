import { supabase } from "@/lib/supabase";
import type { MockTournament } from "@/lib/mock-data";
import type { CreateTournamentInput } from "../types";

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

export async function deleteTournament(id: string): Promise<void> {
  const { data, error } = await supabase.rpc("delete_tournament_if_empty", {
    p_tournament_id: id,
  });

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error("Remove all registered teams before deleting this tournament.");
  }
}
