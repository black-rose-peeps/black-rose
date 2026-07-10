import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function withdrawTeamFromTournaments(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  teamId: string,
): Promise<void> {
  const { data: registrations, error: regError } = await supabase
    .from("tournament_registrations")
    .select("id, tournament_id")
    .eq("roster_team_id", teamId);

  if (regError) throw new Error(regError.message);
  if (!registrations?.length) return;

  const registrationIds = registrations.map((row) => row.id as string);
  const tournamentIds = [...new Set(registrations.map((row) => row.tournament_id as string))];

  const { error: playersError } = await supabase
    .from("tournament_registration_players")
    .delete()
    .in("registration_id", registrationIds);
  if (playersError) throw new Error(playersError.message);

  const { error: deleteRegsError } = await supabase
    .from("tournament_registrations")
    .delete()
    .eq("roster_team_id", teamId);
  if (deleteRegsError) throw new Error(deleteRegsError.message);

  await Promise.all(
    tournamentIds.map(async (tournamentId) => {
      const { count, error: countError } = await supabase
        .from("tournament_registrations")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", tournamentId);

      if (countError) throw new Error(countError.message);

      const { error: syncError } = await supabase
        .from("tournaments")
        .update({ teams_registered: count ?? 0 })
        .eq("id", tournamentId);

      if (syncError) throw new Error(syncError.message);
    }),
  );
}

/** Delete a team and its roster using the service role (admin console). */
export async function deleteTeamAsAdmin(teamId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  await withdrawTeamFromTournaments(supabase, teamId);

  const { error: rpcError } = await supabase.rpc("delete_team_and_members", {
    p_team_id: teamId,
  });
  if (!rpcError) return;

  console.warn(
    "[teams-admin] delete_team_and_members RPC failed, falling back to manual delete:",
    rpcError.message,
  );

  const { data: remainingRegs, error: regCheckError } = await supabase
    .from("tournament_registrations")
    .select("id")
    .eq("roster_team_id", teamId)
    .limit(1);

  if (regCheckError) throw new Error(regCheckError.message);
  if (remainingRegs?.length) {
    throw new Error("Could not withdraw this team from tournaments before deleting.");
  }

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
    .select("id, captain_user_id")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError) throw new Error(teamError.message);
  if (!team) throw new Error("Team not found.");
  if (team.captain_user_id !== captainUserId) {
    throw new Error("Only the team captain can delete this team.");
  }

  await deleteTeamAsAdmin(teamId);
}

/** Transfer captaincy to another active roster member. */
export async function transferTeamCaptain(
  teamId: string,
  currentCaptainUserId: string,
  newCaptainUserId: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  if (currentCaptainUserId === newCaptainUserId) {
    throw new Error("Select a different member to transfer captaincy.");
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, captain_user_id")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError) throw new Error(teamError.message);
  if (!team) throw new Error("Team not found.");
  if (team.captain_user_id !== currentCaptainUserId) {
    throw new Error("Only the team captain can transfer captaincy.");
  }

  const { data: newMember, error: memberError } = await supabase
    .from("team_members")
    .select("user_id, status")
    .eq("team_id", teamId)
    .eq("user_id", newCaptainUserId)
    .maybeSingle();

  if (memberError) throw new Error(memberError.message);
  if (!newMember || newMember.status !== "active") {
    throw new Error("Captaincy can only be transferred to an active roster member.");
  }

  const { data: updatedTeam, error: captainUpdateError } = await supabase
    .from("teams")
    .update({ captain_user_id: newCaptainUserId })
    .eq("id", teamId)
    .eq("captain_user_id", currentCaptainUserId)
    .select("id")
    .maybeSingle();

  if (captainUpdateError) throw new Error(captainUpdateError.message);
  if (!updatedTeam) {
    throw new Error("Captain transfer failed. Refresh the page and try again.");
  }

  const { data: demoted, error: demoteError } = await supabase
    .from("team_members")
    .update({ status: "active" })
    .eq("team_id", teamId)
    .eq("user_id", currentCaptainUserId)
    .eq("status", "captain")
    .select("user_id");

  if (demoteError) throw new Error(demoteError.message);
  if (!demoted?.length) {
    throw new Error("Could not update the outgoing captain status.");
  }

  const { data: promoted, error: promoteError } = await supabase
    .from("team_members")
    .update({ status: "captain" })
    .eq("team_id", teamId)
    .eq("user_id", newCaptainUserId)
    .eq("status", "active")
    .select("user_id");

  if (promoteError) throw new Error(promoteError.message);
  if (!promoted?.length) {
    throw new Error("Could not promote the selected member to captain.");
  }

  const { error: requestError } = await supabase
    .from("tournament_registration_requests")
    .update({ captain_user_id: newCaptainUserId })
    .eq("roster_team_id", teamId)
    .eq("status", "pending")
    .eq("captain_user_id", currentCaptainUserId);

  if (requestError && requestError.code !== "42P01") {
    throw new Error(requestError.message);
  }
}

/** Active roster member leaves the team (not available to captains). */
export async function leaveTeamAsMember(teamId: string, userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, captain_user_id")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError) throw new Error(teamError.message);
  if (!team) throw new Error("Team not found.");
  if (team.captain_user_id === userId) {
    throw new Error("Captains must transfer captaincy before leaving the team.");
  }

  const { data: membership, error: memberError } = await supabase
    .from("team_members")
    .select("user_id, status")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError) throw new Error(memberError.message);
  if (!membership || membership.status !== "active") {
    throw new Error("Only active roster members can leave the team.");
  }

  const { data: updated, error } = await supabase
    .from("team_members")
    .update({ status: "removed" })
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .eq("status", "active")
    .select("user_id");

  if (error) throw new Error(error.message);
  if (!updated?.length) {
    throw new Error("Could not leave the team. Refresh the page and try again.");
  }
}
