import { supabase } from "@/lib/supabase";
import type { MockTeam } from "@/lib/mock-data";

export type ChampionshipRegistration = Pick<MockTeam, "id" | "rosterTeamId" | "name" | "tag">;

/** Historical identities only: badges do not need players, live rosters or count reconciliation. */
export async function fetchChampionshipRegistrations(
  tournamentId: string,
): Promise<ChampionshipRegistration[]> {
  const { data, error } = await supabase
    .from("tournament_registrations")
    .select("id, roster_team_id, name, tag")
    .eq("tournament_id", tournamentId)
    .order("registration_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    rosterTeamId: (row.roster_team_id as string | null) ?? undefined,
    name: row.name as string,
    tag: (row.tag as string | null) ?? "",
  }));
}
