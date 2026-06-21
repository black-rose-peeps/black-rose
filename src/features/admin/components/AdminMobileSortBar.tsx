import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortDirection } from "@/features/admin/hooks/useTableSort";

export interface AdminMobileSortOption {
  key: string;
  label: string;
}

interface AdminMobileSortBarProps {
  options: AdminMobileSortOption[];
  sortKey: string | null;
  direction: SortDirection;
  onSort: (key: string) => void;
  className?: string;
}

/** Horizontally scrollable sort controls for mobile admin lists. */
export function AdminMobileSortBar({
  options,
  sortKey,
  direction,
  onSort,
  className,
}: AdminMobileSortBarProps) {
  return (
    <div className={cn("md:hidden", className)}>
      <p className="mb-2 font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
        Sort by
      </p>
      <div className="custom-scrollbar -mx-4 overflow-x-auto px-4">
        <div className="flex w-max min-w-full gap-2 pb-1" role="group" aria-label="Sort list">
          {options.map((option) => {
            const active = sortKey === option.key;

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onSort(option.key)}
                aria-pressed={active}
                className={cn(
                  "touch-target inline-flex shrink-0 items-center gap-1.5 rounded-none border px-3 py-2 font-tech text-[10px] uppercase tracking-wider transition",
                  active
                    ? "border-white/25 bg-white/10 text-foreground"
                    : "border-white/10 bg-transparent text-muted-foreground",
                )}
              >
                {option.label}
                {active ? (
                  direction === "asc" ? (
                    <ArrowUp className="h-3 w-3" aria-hidden />
                  ) : (
                    <ArrowDown className="h-3 w-3" aria-hidden />
                  )
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
