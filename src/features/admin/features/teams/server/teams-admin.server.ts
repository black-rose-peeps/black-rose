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

  console.warn("[teams-admin] delete_team_and_members RPC failed, falling back to manual delete:", rpcError.message);

  const { error: membersError } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId);
  if (membersError) throw new Error(membersError.message);

  const { error: teamError } = await supabase.from("teams").delete().eq("id", teamId);
  if (teamError) throw new Error(teamError.message);
}

/** Delete a team when the acting user is the roster captain. */
export async function deleteTeamAsCaptain(teamId: string, captainUserId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, captain_user_id, active_tournament_id")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError) throw new Error(teamError.message);
  if (!team) throw new Error("Team not found.");
  if (team.captain_user_id !== captainUserId) {
    throw new Error("Only the team captain can delete this team.");
  }
  if (team.active_tournament_id) {
    throw new Error("Withdraw from the active tournament before deleting this team.");
  }

  await deleteTeamAsAdmin(teamId);
}
