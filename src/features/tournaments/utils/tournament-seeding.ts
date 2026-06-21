import {
  bracketCapacity,
  byeCount,
  directSeedCount,
  isPowerOfTwo,
  mainBracketSize,
  usesFullFieldRoundOne,
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

/** Round-one pairings on bracket capacity (Challonge-style byes for empty seeds). */
export function bracketRoundOnePairings(capacity: number): SeedPairing[] {
  return firstRoundSeedPairings(capacity);
}

export function teamForRegisteredSeed(
  seed: number,
  registeredCount: number,
  seedOrderedNames: string[],
): string | null {
  if (seed < 1 || seed > registeredCount) return null;
  return seedOrderedNames[seed - 1] ?? null;
}

/** First-round high-vs-low pairings for any even field (1 vs N, 2 vs N-1, …). */
export function firstRoundHighLowPairings(teamCount: number): SeedPairing[] {
  if (!Number.isInteger(teamCount) || teamCount < 2 || teamCount % 2 !== 0) {
    throw new Error(
      `firstRoundHighLowPairings requires an even team count ≥ 2; received ${teamCount}.`,
    );
  }
  const pairings: SeedPairing[] = [];
  for (let i = 0; i < teamCount / 2; i++) {
    pairings.push({ seedA: i + 1, seedB: teamCount - i });
  }
  return pairings;
}

/** Round-one pairings for Swiss / non-Po2 fields. */
export function roundOnePairingsForSeedingMode(teamCount: number): SeedPairing[] {
  if (isPowerOfTwo(teamCount)) return firstRoundSeedPairings(teamCount);
  return firstRoundHighLowPairings(teamCount);
}

/** Round-one pairings for elimination seeding UI (uses next Po2 capacity). */
export function roundOneSeedingPairings(teamCount: number): SeedPairing[] {
  return bracketRoundOnePairings(bracketCapacity(teamCount));
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
  seedA: number | "bye";
  seedB: number | "bye";
}

/** Projected round 1 on bracket capacity (shows bye slots for top seeds). */
export function projectedUpperRoundOnePairings(teamCount: number): UpperRoundOnePreview[] {
  const capacity = mainBracketSize(teamCount);
  const pairings = firstRoundSeedPairings(capacity);

  return pairings.map((pairing, matchIndex) => ({
    matchIndex,
    seedA: pairing.seedA <= teamCount ? pairing.seedA : "bye",
    seedB: pairing.seedB <= teamCount ? pairing.seedB : "bye",
  }));
}

export function formatSeedLabel(
  seed: number | "bye" | "play-in",
  playInMatchIndex?: number,
): string {
  if (seed === "bye") return "BYE";
  if (seed === "play-in") {
    return playInMatchIndex !== undefined
      ? `Play-in ${playInMatchIndex + 1} winner`
      : "Play-in winner";
  }
  return `Seed ${seed}`;
}

/** Rebuild seed-slot assignments from saved bracket round-one matches. */
export function assignmentsFromBracketMatches<T>(
  teamCount: number,
  options: {
    isDoubleElimWithPlayIn?: boolean;
    upperRoundOne?: Array<{ teamA?: string | null; teamB?: string | null }>;
    playInMatches?: Array<{ teamA?: string | null; teamB?: string | null }>;
    firstRoundMatches?: Array<{ teamA?: string | null; teamB?: string | null }>;
  },
  resolveTeam: (name: string | null | undefined) => T | null,
): Array<T | null> {
  const assignments: Array<T | null> = Array(teamCount).fill(null);
  const capacity = mainBracketSize(teamCount);
  const matches = options.upperRoundOne ?? options.firstRoundMatches ?? [];
  const pairings = firstRoundSeedPairings(capacity);

  for (let i = 0; i < matches.length; i++) {
    const pairing = pairings[i];
    if (!pairing) continue;
    const match = matches[i];
    if (match?.teamA && pairing.seedA <= teamCount) {
      assignments[pairing.seedA - 1] = resolveTeam(match.teamA);
    }
    if (match?.teamB && pairing.seedB <= teamCount) {
      assignments[pairing.seedB - 1] = resolveTeam(match.teamB);
    }
  }

  return assignments;
}
