import { useEffect, useMemo, useState } from "react";

export const ADMIN_PAGE_SIZE = 10;

export function usePagination<T>(items: T[], pageSize = ADMIN_PAGE_SIZE) {
  const [page, setPage] = useState(1);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [total, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return {
    page,
    setPage,
    totalPages,
    paginatedItems,
    pageSize,
    total,
    rangeStart,
    rangeEnd,
    hasMultiplePages: totalPages > 1,
  };
}
