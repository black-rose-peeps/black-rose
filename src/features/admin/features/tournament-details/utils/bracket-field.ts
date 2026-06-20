/** Bracket field size helpers — Challonge-style next power-of-two capacity with byes. */

export function isEvenBracketFieldSize(n: number): boolean {
  return Number.isInteger(n) && n >= 2 && n % 2 === 0;
}

export function isPowerOfTwo(n: number): boolean {
  return Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;
}

/** Next power-of-two bracket capacity (P = 2^ceil(log2(N))). */
export function bracketCapacity(teamCount: number): number {
  if (!isEvenBracketFieldSize(teamCount)) {
    throw new Error(`Bracket field size must be an even integer ≥ 2; received ${teamCount}.`);
  }
  let size = 2;
  while (size < teamCount) {
    size *= 2;
  }
  return size;
}

/** Automatic byes for top seeds when N < bracket capacity. */
export function byeCount(teamCount: number): number {
  return bracketCapacity(teamCount) - teamCount;
}

/** @deprecated Use {@link bracketCapacity}. */
export function mainBracketSize(teamCount: number): number {
  return bracketCapacity(teamCount);
}

/** True when the field fills the bracket exactly (no byes). */
export function usesFullFieldRoundOne(teamCount: number): boolean {
  return isEvenBracketFieldSize(teamCount) && byeCount(teamCount) === 0;
}

/** Opening play-in is no longer used — non-Po2 fields use byes instead. */
export function needsOpeningPlayIn(_teamCount: number): boolean {
  return false;
}

/** @deprecated Always 0 — use {@link byeCount} instead. */
export function playInMatchCount(_teamCount: number): number {
  return 0;
}

/** Top seeds that receive a round-one bye. */
export function directSeedCount(teamCount: number): number {
  return byeCount(teamCount);
}

/** Preserve seed-slot order when building bracket team lists. */
export function orderedTeamNamesFromAssignments(
  assignments: Array<{ name: string } | null>,
  size: number,
): string[] {
  return assignments.slice(0, size).map((team) => team!.name);
}

/** Match counts per single-elimination round for a power-of-2 field. */
export function powerOfTwoElimRoundMatchCounts(teamCount: number): number[] {
  if (!isPowerOfTwo(teamCount)) {
    throw new Error(
      `powerOfTwoElimRoundMatchCounts requires a power-of-2 size; received ${teamCount}.`,
    );
  }
  const rounds: number[] = [];
  let size = teamCount;
  while (size > 1) {
    rounds.push(size / 2);
    size /= 2;
  }
  return rounds;
}

/** Match counts per elimination round on the bracket capacity (Po2). */
export function evenFieldElimRoundMatchCounts(teamCount: number): number[] {
  return powerOfTwoElimRoundMatchCounts(bracketCapacity(teamCount));
}

/** Match counts per single-elimination round for any even field. */
export function singleElimRoundMatchCounts(teamCount: number): number[] {
  if (!isEvenBracketFieldSize(teamCount)) {
    throw new Error(`Bracket field size must be an even integer ≥ 2; received ${teamCount}.`);
  }
  return powerOfTwoElimRoundMatchCounts(bracketCapacity(teamCount));
}

export function eliminationRoundCount(teamCount: number): number {
  return singleElimRoundMatchCounts(teamCount).length;
}

/** Human-readable label from how many teams compete in that round (e.g. 16 → "Round of 16"). */
export function eliminationRoundLabel(teamsInRound: number): string {
  if (teamsInRound <= 2) return "Final";
  if (teamsInRound === 4) return "Semifinals";
  if (teamsInRound === 8) return "Quarterfinals";
  if (teamsInRound === 16) return "Round of 16";
  if (teamsInRound === 32) return "Round of 32";
  if (teamsInRound === 64) return "Round of 64";
  return `Round of ${teamsInRound}`;
}

/** Bracket-side prefix for double-elim labels (e.g. "Upper — Round of 16"). */
export function prefixedEliminationRoundLabel(teamsInRound: number, prefix: string): string {
  const base = eliminationRoundLabel(teamsInRound);
  return `${prefix} — ${base}`;
}
