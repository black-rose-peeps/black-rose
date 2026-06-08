export function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

export function compareByOrder<T extends string>(order: readonly T[], a: T, b: T): number {
  const indexA = order.indexOf(a);
  const indexB = order.indexOf(b);
  const rankA = indexA === -1 ? order.length : indexA;
  const rankB = indexB === -1 ? order.length : indexB;
  if (rankA !== rankB) return rankA - rankB;
  return compareStrings(a, b);
}
