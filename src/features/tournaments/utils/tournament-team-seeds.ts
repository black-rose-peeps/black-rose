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

/** Ascending by seed (#1 first). Unseeded teams keep their relative order at the end. */
export function sortTournamentTeamsBySeed(teams: readonly TournamentTeam[]): TournamentTeam[] {
  return [...teams].sort((a, b) => {
    const seedA = a.seed;
    const seedB = b.seed;
    if (seedA != null && seedB != null) return seedA - seedB;
    if (seedA != null) return -1;
    if (seedB != null) return 1;
    return 0;
  });
}
