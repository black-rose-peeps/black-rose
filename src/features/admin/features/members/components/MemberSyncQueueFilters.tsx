import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MEMBER_SYNC_QUEUE_FILTERS } from "../constants";
import type { MemberSyncQueueFilter } from "../types";

interface MemberSyncQueueFiltersProps {
  value: MemberSyncQueueFilter;
  counts: Record<MemberSyncQueueFilter, number>;
  onChange: (value: MemberSyncQueueFilter) => void;
}

export function MemberSyncQueueFilters({
  value,
  counts,
  onChange,
}: MemberSyncQueueFiltersProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as MemberSyncQueueFilter);
      }}
      variant="outline"
      size="sm"
      className="flex-wrap justify-start gap-1.5"
    >
      {MEMBER_SYNC_QUEUE_FILTERS.map((option) => {
        const count = counts[option.value];
        const showCount = option.value === "all" ? null : count;

        return (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className="rounded-none font-tech text-[10px] uppercase tracking-wider-2 data-[state=on]:bg-white/10"
          >
            {option.label}
            {showCount != null ? ` (${count})` : ""}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
