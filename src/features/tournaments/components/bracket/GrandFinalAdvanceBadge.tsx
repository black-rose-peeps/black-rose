import { ArrowDown, Shield, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GrandFinalFeederSide } from "@/features/tournaments/utils/bracket-grand-final-feeder";

interface GrandFinalFeederCalloutProps {
  side: GrandFinalFeederSide;
}

export function GrandFinalFeederCallout({ side }: GrandFinalFeederCalloutProps) {
  const isUpper = side === "upper";

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1.5 border-t px-2 py-1.5",
        isUpper ? "border-foreground/15 bg-primary/5" : "border-amber-400/25 bg-amber-400/8",
      )}
    >
      {isUpper ? (
        <Shield className="h-3 w-3 shrink-0 text-foreground/60" aria-hidden />
      ) : (
        <Swords className="h-3 w-3 shrink-0 text-amber-400/90" aria-hidden />
      )}
      <span className="font-tech text-[9px] uppercase tracking-wider text-amber-200/90">
        Winner advances to Grand Finals below
      </span>
      <ArrowDown className="h-3 w-3 shrink-0 text-amber-400" aria-hidden />
    </div>
  );
}
