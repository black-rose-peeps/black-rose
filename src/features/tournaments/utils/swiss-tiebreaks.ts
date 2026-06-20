/**
 * Swiss tiebreak helpers — MP, Median Buchholz, and OMW% scoped to one tournament field.
 *
 * Buchholz rewards teams that faced opponents who performed well in the same event
 * (strong seeds that keep winning raise your BH). Initial seed breaks remaining ties.
 */

export const SWISS_MATCH_POINTS_PER_WIN = 3;
export const SWISS_OMW_FLOOR = 1 / 3;

export interface SwissRecord {
  wins: number;
  losses: number;
}

export interface SwissTiebreakInput {
  /** All teams in this Swiss event (seed order when possible). */
  participants: string[];
  records: Record<string, SwissRecord>;
  /** Opponents faced within the event only. */
  opponents: Record<string, string[]>;
  seedByTeam?: Map<string, number>;
}

export interface SwissTiebreakRow {
  team: string;
  record: SwissRecord;
  matchPoints: number;
  buchholz: number;
  omw: number;
  seed: number;
}

export function opponentMatchWinPct(record: SwissRecord): number {
  const games = record.wins + record.losses;
  if (games === 0) return SWISS_OMW_FLOOR;
  return Math.max(record.wins / games, SWISS_OMW_FLOOR);
}

/**
 * Median Buchholz (Challonge-style): sum opponent match points, dropping the
 * highest and lowest when a team has faced three or more opponents.
 */
export function medianBuchholz(opponentMatchPoints: number[]): number {
  if (opponentMatchPoints.length === 0) return 0;
  if (opponentMatchPoints.length <= 2) {
    return opponentMatchPoints.reduce((sum, mp) => sum + mp, 0);
  }
  const sorted = [...opponentMatchPoints].sort((a, b) => a - b);
  return sorted.slice(1, -1).reduce((sum, mp) => sum + mp, 0);
}

export function buildSeedByTeam(
  participants: string[],
  seeds?: Map<string, number> | Array<{ name: string; seed?: number }>,
): Map<string, number> {
  const map = new Map<string, number>();

  if (seeds instanceof Map) {
    for (const [index, team] of participants.entries()) {
      map.set(team, seeds.get(team) ?? index + 1);
    }
    return map;
  }

  if (Array.isArray(seeds)) {
    for (const [index, team] of seeds.entries()) {
      map.set(team.name, team.seed ?? index + 1);
    }
    for (const [index, team] of participants.entries()) {
      if (!map.has(team)) map.set(team, index + 1);
    }
    return map;
  }

  for (const [index, team] of participants.entries()) {
    map.set(team, index + 1);
  }
  return map;
}

/** Compute MP / median Buchholz / OMW% for every participant in one tournament. */
export function computeSwissTiebreakRows(input: SwissTiebreakInput): SwissTiebreakRow[] {
  const { participants, records, opponents, seedByTeam } = input;
  const participantSet = new Set(participants);
  const seeds = seedByTeam ?? buildSeedByTeam(participants);

  const mpByTeam = Object.fromEntries(
    participants.map((team) => [team, (records[team]?.wins ?? 0) * SWISS_MATCH_POINTS_PER_WIN]),
  );

  return participants.map((team) => {
    const record = records[team] ?? { wins: 0, losses: 0 };
    const faced = (opponents[team] ?? []).filter((opponent) => participantSet.has(opponent));
    const opponentMPs = faced.map((opponent) => mpByTeam[opponent] ?? 0);

    return {
      team,
      record,
      matchPoints: mpByTeam[team] ?? 0,
      buchholz: medianBuchholz(opponentMPs),
      omw:
        faced.length > 0
          ? faced.reduce(
              (sum, opponent) =>
                sum + opponentMatchWinPct(records[opponent] ?? { wins: 0, losses: 0 }),
              0,
            ) / faced.length
          : 0,
      seed: seeds.get(team) ?? participants.indexOf(team) + 1,
    };
  });
}

export function sortSwissTiebreakRows<T extends SwissTiebreakRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
    if (b.omw !== a.omw) return b.omw - a.omw;
    if (a.seed !== b.seed) return a.seed - b.seed;
    return a.team.localeCompare(b.team);
  });
}
