import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface AdminTablePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function pageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

export function AdminTablePagination({
  page,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
  onPageChange,
  className,
}: AdminTablePaginationProps) {
  if (total === 0) return null;

  const pages = pageNumbers(page, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border px-4 py-4 safe-bottom sm:flex-row sm:items-center sm:justify-between sm:px-6",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground">
        Showing {rangeStart}–{rangeEnd} of {total}
      </p>

      {totalPages > 1 && (
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 gap-1 font-tech text-[10px] uppercase tracking-wider sm:min-h-8"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                Previous
              </Button>
            </PaginationItem>

            {pages.map((p, index) =>
              p === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${index}`} className="hidden sm:list-item">
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p} className="hidden sm:list-item">
                  <Button
                    type="button"
                    variant={p === page ? "default" : "ghost"}
                    size="icon"
                    className="h-11 w-11 font-tech text-xs sm:h-8 sm:w-8"
                    onClick={() => onPageChange(p)}
                  >
                    {p}
                  </Button>
                </PaginationItem>
              ),
            )}

            <PaginationItem>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 gap-1 font-tech text-[10px] uppercase tracking-wider sm:min-h-8"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                Next
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
