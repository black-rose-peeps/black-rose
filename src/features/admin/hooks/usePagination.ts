import { useCallback, useEffect, useMemo, useState } from "react";

export const ADMIN_PAGE_SIZE = 10;

function clampPage(page: number, totalPages: number): number {
  return Math.max(1, Math.min(page, totalPages));
}

export function usePagination<T>(items: T[], pageSize = ADMIN_PAGE_SIZE) {
  const effectivePageSize = Math.max(1, pageSize);
  const [page, setPageState] = useState(1);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / effectivePageSize));

  const setPage = useCallback(
    (next: number) => {
      setPageState(clampPage(next, totalPages));
    },
    [totalPages],
  );

  useEffect(() => {
    setPageState((current) => clampPage(current, totalPages));
  }, [total, totalPages, effectivePageSize]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * effectivePageSize;
    return items.slice(start, start + effectivePageSize);
  }, [items, page, effectivePageSize]);

  const rangeStart = total === 0 ? 0 : (page - 1) * effectivePageSize + 1;
  const rangeEnd = Math.min(page * effectivePageSize, total);

  return {
    page,
    setPage,
    totalPages,
    paginatedItems,
    pageSize: effectivePageSize,
    total,
    rangeStart,
    rangeEnd,
    hasMultiplePages: totalPages > 1,
  };
}
