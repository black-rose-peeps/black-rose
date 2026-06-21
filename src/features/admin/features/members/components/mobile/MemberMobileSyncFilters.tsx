import { cn } from "@/lib/utils";
import { MEMBER_SYNC_QUEUE_FILTERS } from "../../constants";
import type { MemberSyncQueueFilter } from "../../types";

interface MemberMobileSyncFiltersProps {
  value: MemberSyncQueueFilter;
  counts: Record<MemberSyncQueueFilter, number>;
  onChange: (value: MemberSyncQueueFilter) => void;
}

/** Horizontally scrollable sync queue filters for mobile. */
export function MemberMobileSyncFilters({ value, counts, onChange }: MemberMobileSyncFiltersProps) {
  return (
    <div className="custom-scrollbar -mx-4 overflow-x-auto px-4 md:hidden">
      <div className="flex w-max min-w-full gap-2 pb-1">
        {MEMBER_SYNC_QUEUE_FILTERS.map((option) => {
          const active = value === option.value;
          const count = option.value === "all" ? null : counts[option.value];

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "touch-target shrink-0 rounded-none border px-3 py-2 font-tech text-[10px] uppercase tracking-wider transition",
                active
                  ? "border-white/25 bg-white/10 text-foreground"
                  : "border-white/10 bg-transparent text-muted-foreground",
              )}
            >
              {option.label}
              {count != null ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
