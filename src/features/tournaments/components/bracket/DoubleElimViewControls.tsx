import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { BracketFocusSize } from "@/features/tournaments/utils/bracket-top-slice";
import { BracketFocusControls } from "./BracketFocusControls";

export type DoubleElimViewMode = "full" | "split";
export type SplitBracketSide = "upper" | "lower";

interface DoubleElimViewControlsProps {
  viewMode: DoubleElimViewMode;
  splitSide: SplitBracketSide;
  onViewModeChange: (mode: DoubleElimViewMode) => void;
  onSplitSideChange: (side: SplitBracketSide) => void;
  bracketFocus?: BracketFocusSize;
  availableTopSizes?: number[];
  onBracketFocusChange?: (focus: BracketFocusSize) => void;
  className?: string;
}

export function DoubleElimViewControls({
  viewMode,
  splitSide,
  onViewModeChange,
  onSplitSideChange,
  bracketFocus = "all",
  availableTopSizes = [],
  onBracketFocusChange,
  className,
}: DoubleElimViewControlsProps) {
  const showFocusControls = availableTopSizes.length > 0 && onBracketFocusChange;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && onViewModeChange(value as DoubleElimViewMode)}
          className="border border-border bg-card p-1"
        >
          <ToggleGroupItem
            value="full"
            className="font-tech text-[10px] uppercase tracking-wider data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            Full Bracket
          </ToggleGroupItem>
          <ToggleGroupItem
            value="split"
            className="font-tech text-[10px] uppercase tracking-wider data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            Separate
          </ToggleGroupItem>
        </ToggleGroup>

        {viewMode === "split" && (
          <ToggleGroup
            type="single"
            value={splitSide}
            onValueChange={(value) => value && onSplitSideChange(value as SplitBracketSide)}
            className="border border-border bg-card p-1"
          >
            <ToggleGroupItem
              value="upper"
              className="font-tech text-[10px] uppercase tracking-wider data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Upper Bracket
            </ToggleGroupItem>
            <ToggleGroupItem
              value="lower"
              className="font-tech text-[10px] uppercase tracking-wider data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Lower Bracket
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>

      {showFocusControls && (
        <BracketFocusControls
          bracketFocus={bracketFocus}
          availableTopSizes={availableTopSizes}
          onBracketFocusChange={onBracketFocusChange}
        />
      )}
    </div>
  );
}
