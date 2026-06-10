import type { Team, TeamMember, TeamMemberStatus } from "../types";

export function getMembershipForUser(team: Team, userId: string): TeamMember | undefined {
  return team.members.find((m) => m.userId === userId);
}

export function getUserTeamStatus(team: Team, userId: string): TeamMemberStatus | null {
  return getMembershipForUser(team, userId)?.status ?? null;
}

export function isPendingInvite(team: Team, userId: string): boolean {
  return getUserTeamStatus(team, userId) === "invited";
}

export function isActiveMember(team: Team, userId: string): boolean {
  const status = getUserTeamStatus(team, userId);
  return status === "captain" || status === "active";
}
