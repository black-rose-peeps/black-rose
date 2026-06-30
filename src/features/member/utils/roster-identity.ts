import type { Team, TeamMember } from "@/features/teams/types";
import { gameIdentityConfig, hasIdentityForGame, type MemberIdentitySource } from "./game-identity";

export interface RosterIdentityGap {
  userId: string;
  displayName: string;
  username: string;
}

export type MemberIdentityRecord = MemberIdentitySource & {
  displayName: string;
  username: string;
};

export function getActiveRosterMembers(team: Pick<Team, "members">): TeamMember[] {
  return team.members.filter((m) => m.status === "captain" || m.status === "active");
}

export function listRosterMembersMissingIdentity(
  team: Pick<Team, "members">,
  tournamentGame: string,
  identitiesByUserId: Map<string, MemberIdentityRecord>,
): RosterIdentityGap[] {
  if (!gameIdentityConfig(tournamentGame)) return [];

  const missing: RosterIdentityGap[] = [];
  for (const member of getActiveRosterMembers(team)) {
    const source = identitiesByUserId.get(member.userId);
    if (source && hasIdentityForGame(tournamentGame, source)) continue;

    missing.push({
      userId: member.userId,
      displayName: source?.displayName || member.displayName || member.username,
      username: source?.username || member.username,
    });
  }

  return missing;
}

export function formatRosterIdentityGapMessage(
  team: Pick<Team, "name">,
  tournamentGame: string,
  gaps: RosterIdentityGap[],
): string | null {
  if (gaps.length === 0) return null;

  const config = gameIdentityConfig(tournamentGame);
  const gameLabel = config?.panelLabel ?? tournamentGame;
  const idLabel = config?.fieldLabel.toLowerCase() ?? "in-game identity";
  const names = gaps.map((g) => g.displayName || g.username).join(", ");

  if (gaps.length === 1) {
    return `${team.name}: ${names} still needs a ${gameLabel} ${idLabel} on their profile before you can register.`;
  }

  return `${team.name}: ${gaps.length} roster members are missing a ${gameLabel} ${idLabel}: ${names}. Each player must add it on their profile before you can register.`;
}

export function tournamentRosterIdentityError(
  team: Pick<Team, "members" | "name">,
  tournamentGame: string,
  gaps: RosterIdentityGap[],
): string | null {
  return formatRosterIdentityGapMessage(team, tournamentGame, gaps);
}
