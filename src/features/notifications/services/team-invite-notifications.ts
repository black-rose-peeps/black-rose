import { fetchTeamsForUser } from "@/features/admin/features/teams/services/teams.service";
import { isPendingInvite } from "@/features/teams/utils/membership";
import { mergeTeamInviteNotifications, notifyListeners } from "../store";
import type { AppNotification } from "../types";

function captainName(team: Awaited<ReturnType<typeof fetchTeamsForUser>>[number]): string {
  return team.members.find((m) => m.status === "captain")?.displayName ?? "A captain";
}

/** Pull pending team invites from Supabase and merge into the notification store. */
export async function syncTeamInviteNotifications(userId: string): Promise<AppNotification[]> {
  const teams = await fetchTeamsForUser(userId);
  const pending = teams.filter((team) => isPendingInvite(team, userId));

  const inviteNotifications: AppNotification[] = pending.map((team) => {
    const membership = team.members.find((m) => m.userId === userId);
    return {
      id: `team-invite-${team.id}`,
      type: "team_invite",
      title: "Team Invitation",
      body: `${captainName(team)} invited you to join ${team.name} [${team.tag}] · ${team.game}`,
      createdAt: membership?.joinedAt ?? team.createdAt,
      read: false,
      href: `/teams/${team.id}`,
    };
  });

  mergeTeamInviteNotifications(inviteNotifications);
  notifyListeners();
  return inviteNotifications;
}
