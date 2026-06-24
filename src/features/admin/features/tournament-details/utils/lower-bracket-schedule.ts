/** Shared lower-bracket round IDs and bye-field schedules for double elimination. */

export function lowerRoundId(lbRoundIndex: number, lbRoundCount: number): string {
  if (lbRoundIndex === lbRoundCount - 1) return "lb-f";
  if (lbRoundIndex === lbRoundCount - 2) return "lb-sf";
  if (lbRoundIndex === 0) return "lb-r1";
  return `lb-r${lbRoundIndex + 1}`;
}

/**
 * Lower-bracket schedule for bye fields (e.g. 24 teams / 32 cap):
 * [8, 4, 4, 2, 2, 1, 1] — LR1 merges UR1+UR2 losers, then alternate advance / drop.
 */
export function buildLowerBracketScheduleByeField(
  ubRounds: number,
  bracketSize: number,
): { lbRoundCount: number; lbRoundIds: string[]; lbMatchCounts: number[] } {
  const lbRoundCount = 2 * (ubRounds - 1) - 1;
  const lbRoundIds: string[] = [];
  const lbMatchCounts: number[] = [];
  let matchCount = bracketSize / 4;

  for (let r = 0; r < lbRoundCount; r++) {
    lbRoundIds.push(lowerRoundId(r, lbRoundCount));
    lbMatchCounts.push(matchCount);
    if (r % 2 === 0) {
      matchCount = Math.max(1, matchCount / 2);
    }
  }

  return { lbRoundCount, lbRoundIds, lbMatchCounts };
}
