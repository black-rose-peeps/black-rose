import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { BracketFocusSize } from "@/features/tournaments/utils/bracket-top-slice";

interface BracketFocusControlsProps {
  bracketFocus: BracketFocusSize;
  availableTopSizes: number[];
  onBracketFocusChange: (focus: BracketFocusSize) => void;
  className?: string;
}

export function BracketFocusControls({
  bracketFocus,
  availableTopSizes,
  onBracketFocusChange,
  className,
}: BracketFocusControlsProps) {
  if (availableTopSizes.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
        Focus
      </span>
      <ToggleGroup
        type="single"
        value={bracketFocus === "all" ? "all" : String(bracketFocus)}
        onValueChange={(value) => {
          if (!value) return;
          onBracketFocusChange(value === "all" ? "all" : Number(value));
        }}
        className="border border-border bg-card p-1"
      >
        <ToggleGroupItem
          value="all"
          className="font-tech text-[10px] uppercase tracking-wider data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          All Rounds
        </ToggleGroupItem>
        {availableTopSizes.map((size) => (
          <ToggleGroupItem
            key={size}
            value={String(size)}
            className="font-tech text-[10px] uppercase tracking-wider data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            Top {size}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
