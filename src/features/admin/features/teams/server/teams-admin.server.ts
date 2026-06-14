import { getSupabaseAdmin } from "@/lib/supabase-admin";

/** Delete a team and its roster using the service role (admin console). */
export async function deleteTeamAsAdmin(teamId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: registrations, error: regError } = await supabase
    .from("tournament_registrations")
    .select("id")
    .eq("roster_team_id", teamId)
    .limit(1);

  if (regError) throw new Error(regError.message);
  if (registrations?.length) {
    throw new Error("Remove this team from all tournaments before deleting.");
  }

  const { error: rpcError } = await supabase.rpc("delete_team_and_members", {
    p_team_id: teamId,
  });
  if (!rpcError) return;

  const { error: membersError } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId);
  if (membersError) throw new Error(membersError.message);

  const { error: teamError } = await supabase.from("teams").delete().eq("id", teamId);
  if (teamError) throw new Error(teamError.message);
}
