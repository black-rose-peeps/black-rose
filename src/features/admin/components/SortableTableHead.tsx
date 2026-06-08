import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableHead } from "@/components/ui/table";
import type { SortDirection } from "../hooks/useTableSort";

interface SortableTableHeadProps {
  label: string;
  sortKey: string;
  activeKey: string | null;
  direction: SortDirection;
  onSort: (key: string) => void;
  className?: string;
  align?: "left" | "right";
}

export function SortableTableHead({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
  align = "left",
}: SortableTableHeadProps) {
  const isActive = activeKey === sortKey;
  const Icon = !isActive ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead className={cn("text-[10px] font-tech uppercase tracking-wider-2", className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-sort={isActive ? (direction === "asc" ? "ascending" : "descending") : "none"}
        className={cn(
          "inline-flex max-w-full cursor-pointer select-none items-center gap-1.5 transition-colors hover:text-foreground",
          align === "right" ? "ml-auto justify-end" : "text-left",
          isActive && "text-foreground",
        )}
      >
        <span className="truncate">{label}</span>
        <Icon className={cn("h-3 w-3", isActive ? "text-foreground" : "text-muted-foreground/60")} />
      </button>
    </TableHead>
  );
}
