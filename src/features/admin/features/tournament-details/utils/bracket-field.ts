/** Bracket field size helpers — field size follows tournament team cap (even counts). */

export function isEvenBracketFieldSize(n: number): boolean {
  return Number.isInteger(n) && n >= 2 && n % 2 === 0;
}

export function isPowerOfTwo(n: number): boolean {
  return Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;
}

/** Largest power-of-2 field that fits within the team count (e.g. 20 → 16). */
export function mainBracketSize(teamCount: number): number {
  if (!isEvenBracketFieldSize(teamCount)) {
    throw new Error(`Bracket field size must be an even integer ≥ 2; received ${teamCount}.`);
  }
  let size = 2;
  while (size * 2 <= teamCount) {
    size *= 2;
  }
  return size;
}

/** Opening play-in matches needed before a standard main bracket (e.g. 20 → 4). */
export function playInMatchCount(teamCount: number): number {
  if (isPowerOfTwo(teamCount)) return 0;
  return teamCount - mainBracketSize(teamCount);
}

/** Match counts per single-elimination round for a power-of-2 field. */
export function powerOfTwoElimRoundMatchCounts(teamCount: number): number[] {
  if (!isPowerOfTwo(teamCount)) {
    throw new Error(`powerOfTwoElimRoundMatchCounts requires a power-of-2 size; received ${teamCount}.`);
  }
  const rounds: number[] = [];
  let size = teamCount;
  while (size > 1) {
    rounds.push(size / 2);
    size /= 2;
  }
  return rounds;
}

/** Match counts per single-elimination round for any even field (legacy / display). */
export function singleElimRoundMatchCounts(teamCount: number): number[] {
  if (!isEvenBracketFieldSize(teamCount)) {
    throw new Error(`Bracket field size must be an even integer ≥ 2; received ${teamCount}.`);
  }
  if (isPowerOfTwo(teamCount)) {
    return powerOfTwoElimRoundMatchCounts(teamCount);
  }
  const playIn = playInMatchCount(teamCount);
  const main = mainBracketSize(teamCount);
  const playInMeta = playIn > 0 ? [playIn] : [];
  return [...playInMeta, ...powerOfTwoElimRoundMatchCounts(main)];
}

export function eliminationRoundCount(teamCount: number): number {
  return singleElimRoundMatchCounts(teamCount).length;
}
