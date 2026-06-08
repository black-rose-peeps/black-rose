import { useCallback, useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

interface SortState {
  key: string | null;
  direction: SortDirection;
}

export function useTableSort<T>(
  items: T[],
  comparators: Record<string, (a: T, b: T) => number>,
  defaultKey?: string,
) {
  const [sort, setSort] = useState<SortState>({
    key: defaultKey ?? null,
    direction: "asc",
  });

  const toggleSort = useCallback((key: string) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  }, []);

  const sortedItems = useMemo(() => {
    if (!sort.key) return items;
    const compare = comparators[sort.key];
    if (!compare) return items;
    const sorted = [...items].sort(compare);
    return sort.direction === "desc" ? sorted.reverse() : sorted;
  }, [items, sort.key, sort.direction, comparators]);

  return {
    sortedItems,
    sortKey: sort.key,
    direction: sort.direction,
    toggleSort,
  };
}
