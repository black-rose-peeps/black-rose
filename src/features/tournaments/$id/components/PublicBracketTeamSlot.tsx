import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { teamDisplayAbbr } from "../../utils/team-tags";

export interface PublicBracketTeamSlotProps {
  name: string | null;
  tag?: string;
  placeholder?: string;
  score?: number;
  isWinner: boolean;
  isLoser: boolean;
  hasScores?: boolean;
  swissStatus?: "active" | "advanced" | "eliminated";
  isChampionRow?: boolean;
  /** Top seed advanced via round-one bye (protected seed). */
  isProtectedSeed?: boolean;
}

export function PublicBracketTeamSlot({
  name,
  tag,
  placeholder,
  score,
  isWinner,
  isLoser,
  hasScores = false,
  swissStatus,
  isChampionRow = false,
  isProtectedSeed = false,
}: PublicBracketTeamSlotProps) {
  const isTbd = name === null;
  const abbr = isTbd ? "?" : teamDisplayAbbr(name, tag);

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-border/40 px-2 py-1.5 last:border-0",
        isChampionRow && "bg-amber-400/10",
        isWinner && !isChampionRow && "bg-emerald-400/10",
        isLoser && "opacity-60",
        swissStatus === "advanced" && "bg-emerald-500/5",
        swissStatus === "eliminated" && "opacity-50",
        isTbd && "opacity-40",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full border",
          isChampionRow
            ? "border-amber-400 bg-amber-400"
            : isWinner
              ? "border-emerald-400 bg-emerald-400"
              : "border-muted-foreground/30 bg-transparent",
        )}
      />

      <span className="w-6 shrink-0 text-center text-[10px] font-tech text-muted-foreground">
        {abbr}
      </span>

      <span
        className={cn(
          "min-w-0 flex-1 truncate text-xs",
          isTbd
            ? placeholder
              ? "font-tech text-[10px] uppercase tracking-wider text-muted-foreground/70"
              : "italic text-muted-foreground/50"
            : isChampionRow
              ? "font-semibold text-amber-100"
              : isWinner
                ? "font-semibold text-foreground"
                : "text-muted-foreground",
        )}
      >
        {isTbd ? (placeholder ?? "TBD") : name}
      </span>

      {!isTbd && isProtectedSeed && (
        <span
          title="Protected seed — round-one bye"
          aria-label="Protected seed — round-one bye"
          className="shrink-0"
        >
          <Shield className="h-3 w-3 text-muted-foreground/45" strokeWidth={1.5} aria-hidden />
        </span>
      )}

      {(hasScores || score !== undefined) && !isTbd && (
        <span
          className={cn(
            "shrink-0 font-display text-sm tabular-nums",
            isWinner ? "text-foreground" : "text-muted-foreground/50",
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}
