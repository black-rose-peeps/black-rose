/** Statuses where a team is considered committed to one live/upcoming event. */
export const BLOCKING_TOURNAMENT_STATUSES = new Set([
  "Registration Open",
  "Registration Closed",
  "Live",
]);

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
