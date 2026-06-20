import type { TournamentTeam } from "../types";

/** Map registration id → 1-based seed from admin seeding panel order. */
export function seedByRegistrationId(
  assignmentTeamIds: readonly (string | null)[],
): Map<string, number> {
  const map = new Map<string, number>();
  assignmentTeamIds.forEach((id, index) => {
    if (id) map.set(id, index + 1);
  });
  return map;
}

export function applyRegistrationSeeds(
  teams: TournamentTeam[],
  seedById: Map<string, number>,
): TournamentTeam[] {
  return teams.map((team) => {
    const seed = seedById.get(team.id);
    return seed != null ? { ...team, seed } : team;
  });
}

export function tournamentTeamsHaveSeeds(teams: readonly TournamentTeam[]): boolean {
  return teams.some((team) => team.seed != null);
}
