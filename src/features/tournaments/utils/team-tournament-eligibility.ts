import { isValorantGame } from "@/features/member/utils/valorant-identity";
import { MIN_TEAM_SIZE } from "@/features/teams/constants";
import type { Team } from "@/features/teams/types";

/** Statuses where a team is considered committed to one live/upcoming event. */
export const BLOCKING_TOURNAMENT_STATUSES = new Set([
  "Registration Open",
  "Registration Closed",
  "Live",
]);

export function countActiveRosterMembers(team: Pick<Team, "members">): number {
  return team.members.filter((m) => m.status === "captain" || m.status === "active").length;
}

/** Minimum active roster size required to register for a team-based tournament. */
export function getRequiredRosterSizeForTournament(tournamentGame: string): number | null {
  if (isValorantGame(tournamentGame)) return MIN_TEAM_SIZE;
  return null;
}

export function meetsTournamentRosterRequirement(
  team: Pick<Team, "members">,
  tournamentGame: string,
): boolean {
  const required = getRequiredRosterSizeForTournament(tournamentGame);
  if (required === null) return true;
  return countActiveRosterMembers(team) >= required;
}

export function tournamentRosterRequirementError(
  team: Pick<Team, "members" | "name">,
  tournamentGame: string,
): string | null {
  const required = getRequiredRosterSizeForTournament(tournamentGame);
  if (required === null) return null;

  const count = countActiveRosterMembers(team);
  if (count >= required) return null;

  return `${team.name} needs at least ${required} active roster members for ${tournamentGame} tournaments (currently ${count}). Invite teammates before registering.`;
}

export function isBlockingTournamentStatus(status: string): boolean {
  return BLOCKING_TOURNAMENT_STATUSES.has(status);
}

export function canTeamRegisterForTournament(
  team: { activeTournamentId: string | null },
  targetTournamentId: string,
  tournamentStatusById: Map<string, string>,
): boolean {
  if (!team.activeTournamentId || team.activeTournamentId === targetTournamentId) {
    return true;
  }

  const activeStatus = tournamentStatusById.get(team.activeTournamentId);
  if (!activeStatus) return true;
  return !isBlockingTournamentStatus(activeStatus);
}

export function activeTournamentBlockReason(
  team: { activeTournamentId: string | null; activeTournamentName?: string | null },
  tournamentStatusById: Map<string, string>,
  tournamentNameById: Map<string, string>,
): string | null {
  if (!team.activeTournamentId) return null;

  const activeStatus = tournamentStatusById.get(team.activeTournamentId);
  if (!activeStatus || !isBlockingTournamentStatus(activeStatus)) return null;

  const name =
    team.activeTournamentName ??
    tournamentNameById.get(team.activeTournamentId) ??
    "another tournament";

  return `Active in ${name}. That event must be completed before joining another.`;
}
