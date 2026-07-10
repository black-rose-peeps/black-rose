export type MatchResultToken = "W" | "L" | "Bye";

export function matchResultsSignature(results: MatchResultToken[]): string {
  if (results.length === 0) return "none";
  return results.join("-");
}

/**
 * Dense group ranking (1, 1, 2, 3 …): tied entries share a rank;
 * each new W-L group increments by one (no skipped numbers).
 */
export function assignDenseGroupRanks<T extends { rank: number }>(
  sorted: readonly T[],
  tieKey: (entry: T) => string,
): T[] {
  let rank = 1;

  return sorted.map((entry, index) => {
    if (index > 0 && tieKey(entry) !== tieKey(sorted[index - 1]!)) {
      rank += 1;
    }
    return { ...entry, rank };
  });
}

/**
 * Standard competition ranking (1, 1, 3 …): tied entries share a rank;
 * the next distinct group skips intervening places.
 */
export function assignCompetitionRanks<T extends { rank: number }>(
  sorted: readonly T[],
  tieKey: (entry: T) => string,
): T[] {
  let rank = 1;

  return sorted.map((entry, index) => {
    if (index > 0 && tieKey(entry) !== tieKey(sorted[index - 1]!)) {
      rank = index + 1;
    }
    return { ...entry, rank };
  });
}
