import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BestOfFormat } from "@/features/admin/features/tournament-details/utils/managed-bracket";

const FORMAT_OPTIONS: BestOfFormat[] = ["BO1", "BO3", "BO5"];

interface BracketRoundFormatControlProps {
  value: BestOfFormat;
  disabled?: boolean;
  compact?: boolean;
  onChange: (format: BestOfFormat) => void;
}

export function BracketRoundFormatControl({
  value,
  disabled,
  compact = false,
  onChange,
}: BracketRoundFormatControlProps) {
  return (
    <div
      className={cn(
        "inline-flex overflow-hidden rounded border border-border/80 bg-background/80",
        compact && "scale-90 origin-center",
      )}
      data-bracket-interactive
      onPointerDown={(event) => event.stopPropagation()}
    >
      {FORMAT_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          title={`Set round to ${option}`}
          onClick={() => onChange(option)}
          className={cn(
            "cursor-pointer px-1.5 py-0.5 font-tech text-[9px] uppercase tracking-wider transition-colors",
            value === option
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
            disabled && "cursor-not-allowed opacity-40",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

interface BracketFormatToolbarProps {
  onApplyRecommended?: () => void;
}

export function BracketFormatToolbar({ onApplyRecommended }: BracketFormatToolbarProps) {
  if (!onApplyRecommended) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 bg-secondary/10 px-3 py-2">
      <p className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
        Set BO format per column below · changes apply to all matches in that round
      </p>
      <button
        type="button"
        onClick={onApplyRecommended}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 font-tech text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="h-3 w-3" />
        Recommended
      </button>
    </div>
  );
}
