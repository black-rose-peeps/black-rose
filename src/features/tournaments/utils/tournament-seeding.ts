import {
  directSeedCount,
  isPowerOfTwo,
  mainBracketSize,
  playInMatchCount,
} from "@/features/admin/features/tournament-details/utils/bracket-field";

/** Standard bracket seed order for a power-of-2 field (1 vs N, 2 vs N-1, …). */
export function standardSeedOrder(fieldSize: number): number[] {
  if (!isPowerOfTwo(fieldSize) || fieldSize < 2) {
    throw new Error(`standardSeedOrder requires a power-of-2 size ≥ 2; received ${fieldSize}.`);
  }

  let seeds = [1, 2];
  while (seeds.length < fieldSize) {
    const next: number[] = [];
    const sum = seeds.length * 2 + 1;
    for (const seed of seeds) {
      next.push(seed);
      next.push(sum - seed);
    }
    seeds = next;
  }
  return seeds;
}

export interface SeedPairing {
  /** 1-based seed numbers shown in the seeding UI. */
  seedA: number;
  seedB: number;
}

/** Opening play-in pairings: highest vs lowest remaining seeds (e.g. 7 vs 10, 8 vs 9). */
export function playInSeedPairings(teamCount: number): SeedPairing[] {
  const direct = directSeedCount(teamCount);
  const matches = playInMatchCount(teamCount);
  const pairings: SeedPairing[] = [];

  for (let i = 0; i < matches; i++) {
    pairings.push({
      seedA: direct + 1 + i,
      seedB: teamCount - i,
    });
  }

  return pairings;
}

/** Sequential 1v2, 3v4, … pairings (Swiss manual / non-bracket fields). */
export function sequentialSeedPairings(teamCount: number): SeedPairing[] {
  const pairings: SeedPairing[] = [];
  for (let i = 0; i < teamCount / 2; i++) {
    pairings.push({ seedA: i * 2 + 1, seedB: i * 2 + 2 });
  }
  return pairings;
}

/** Round-one pairings for the seeding UI when play-in layout is not used. */
export function roundOneSeedingPairings(
  teamCount: number,
  options: { swissTraditional?: boolean } = {},
): SeedPairing[] {
  if (options.swissTraditional) {
    return isPowerOfTwo(teamCount)
      ? firstRoundSeedPairings(teamCount)
      : sequentialSeedPairings(teamCount);
  }

  if (!isPowerOfTwo(teamCount)) {
    throw new Error(
      `roundOneSeedingPairings requires play-in seeding for non-power-of-2 size ${teamCount}.`,
    );
  }
  return firstRoundSeedPairings(teamCount);
}

/** First-round match pairings for a full power-of-2 field. */
export function firstRoundSeedPairings(fieldSize: number): SeedPairing[] {
  const order = standardSeedOrder(fieldSize);
  const pairings: SeedPairing[] = [];

  for (let i = 0; i < order.length; i += 2) {
    pairings.push({ seedA: order[i], seedB: order[i + 1] });
  }

  return pairings;
}

/** Which main-bracket seed slot a play-in match winner occupies (1-based seed number). */
export function playInWinnerTargetSeed(teamCount: number, playInMatchIndex: number): number {
  return directSeedCount(teamCount) + 1 + playInMatchIndex;
}

export function seedToMainBracketSlot(
  seed: number,
  mainSize: number,
): { matchIndex: number; slot: "teamA" | "teamB" } {
  const order = standardSeedOrder(mainSize);
  const slotIndex = order.indexOf(seed);
  if (slotIndex < 0) {
    throw new Error(`Seed ${seed} is not part of a ${mainSize}-team main bracket.`);
  }

  return {
    matchIndex: Math.floor(slotIndex / 2),
    slot: slotIndex % 2 === 0 ? "teamA" : "teamB",
  };
}

export interface UpperRoundOnePreview {
  matchIndex: number;
  seedA: number | "play-in";
  seedB: number | "play-in";
  playInMatchIndexA?: number;
  playInMatchIndexB?: number;
}

/** Projected upper bracket round 1 for play-in fields (e.g. 10-team DE). */
export function projectedUpperRoundOnePairings(teamCount: number): UpperRoundOnePreview[] {
  const mainSize = mainBracketSize(teamCount);
  const order = standardSeedOrder(mainSize);
  const direct = directSeedCount(teamCount);
  const previews: UpperRoundOnePreview[] = [];

  for (let matchIndex = 0; matchIndex < order.length / 2; matchIndex++) {
    const seedA = order[matchIndex * 2];
    const seedB = order[matchIndex * 2 + 1];

    const mapSeed = (seed: number): number | "play-in" => {
      if (seed <= direct) return seed;
      if (seed <= teamCount) return "play-in";
      return seed;
    };

    const mappedA = mapSeed(seedA);
    const mappedB = mapSeed(seedB);

    previews.push({
      matchIndex,
      seedA: mappedA,
      seedB: mappedB,
      playInMatchIndexA: mappedA === "play-in" ? seedA - direct - 1 : undefined,
      playInMatchIndexB: mappedB === "play-in" ? seedB - direct - 1 : undefined,
    });
  }

  return previews;
}

export function formatSeedLabel(seed: number | "play-in", playInMatchIndex?: number): string {
  if (seed === "play-in") {
    return playInMatchIndex !== undefined
      ? `Play-in ${playInMatchIndex + 1} winner`
      : "Play-in winner";
  }
  return `Seed ${seed}`;
}

/** Rebuild seed-slot assignments from saved bracket rounds (traditional order). */
export function assignmentsFromBracketMatches<T>(
  teamCount: number,
  options: {
    isDoubleElimWithPlayIn: boolean;
    upperRoundOne?: Array<{ teamA?: string | null; teamB?: string | null }>;
    playInMatches?: Array<{ teamA?: string | null; teamB?: string | null }>;
    firstRoundMatches?: Array<{ teamA?: string | null; teamB?: string | null }>;
  },
  resolveTeam: (name: string | null | undefined) => T | null,
): Array<T | null> {
  const assignments: Array<T | null> = Array(teamCount).fill(null);

  if (options.isDoubleElimWithPlayIn) {
    const direct = directSeedCount(teamCount);
    const mainSize = mainBracketSize(teamCount);
    const upper = options.upperRoundOne ?? [];
    const playIn = options.playInMatches ?? [];

    for (let seed = 1; seed <= direct; seed++) {
      const { matchIndex, slot } = seedToMainBracketSlot(seed, mainSize);
      const match = upper[matchIndex];
      const teamName = match?.[slot];
      if (teamName) assignments[seed - 1] = resolveTeam(teamName);
    }

    const pairings = playInSeedPairings(teamCount);
    for (let i = 0; i < playIn.length; i++) {
      const pairing = pairings[i];
      if (!pairing) continue;
      const match = playIn[i];
      if (match?.teamA) assignments[pairing.seedA - 1] = resolveTeam(match.teamA);
      if (match?.teamB) assignments[pairing.seedB - 1] = resolveTeam(match.teamB);
    }

    return assignments;
  }

  const fieldSize = isPowerOfTwo(teamCount) ? teamCount : mainBracketSize(teamCount);
  const pairings = firstRoundSeedPairings(fieldSize);
  const matches = options.firstRoundMatches ?? [];

  if (playInMatchCount(teamCount) > 0) {
    const playIn = options.playInMatches ?? [];
    const playInPairings = playInSeedPairings(teamCount);
    for (let i = 0; i < playIn.length; i++) {
      const pairing = playInPairings[i];
      if (!pairing) continue;
      const match = playIn[i];
      if (match?.teamA) assignments[pairing.seedA - 1] = resolveTeam(match.teamA);
      if (match?.teamB) assignments[pairing.seedB - 1] = resolveTeam(match.teamB);
    }
  }

  for (let i = 0; i < matches.length; i++) {
    const pairing = pairings[i];
    if (!pairing) continue;
    const match = matches[i];
    if (match?.teamA) assignments[pairing.seedA - 1] = resolveTeam(match.teamA);
    if (match?.teamB) assignments[pairing.seedB - 1] = resolveTeam(match.teamB);
  }

  return assignments;
}
