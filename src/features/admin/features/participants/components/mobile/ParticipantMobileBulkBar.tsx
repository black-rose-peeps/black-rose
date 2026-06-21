import { Button } from "@/components/ui/button";

interface ParticipantMobileBulkBarProps {
  selectedCount: number;
  isBulkUpdating: boolean;
  onApprove: () => void;
}

export function ParticipantMobileBulkBar({
  selectedCount,
  isBulkUpdating,
  onApprove,
}: ParticipantMobileBulkBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="mb-4 flex flex-col gap-3 border border-border bg-muted/10 px-4 py-3 safe-bottom sm:flex-row sm:items-center sm:justify-between md:hidden">
      <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
      <Button
        type="button"
        size="sm"
        disabled={isBulkUpdating}
        onClick={onApprove}
        className="touch-target min-h-11 w-full font-tech text-[10px] uppercase tracking-wider-2 sm:min-h-9 sm:w-auto"
      >
        {isBulkUpdating ? "Approving…" : `Approve ${selectedCount}`}
      </Button>
    </div>
  );
}
