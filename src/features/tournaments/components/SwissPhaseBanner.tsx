import type { ReactNode } from "react";
import { CheckCircle2, Crown, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SwissPhaseBannerVariant = "group-complete" | "playoffs-live" | "playoffs-public";

interface SwissPhaseBannerProps {
  variant: SwissPhaseBannerVariant;
  qualifiedCount?: number;
  /** When true, playoffs messaging reflects a concluded tournament. */
  completed?: boolean;
  /** Swiss playoff bracket includes a 3rd place match between semifinal losers. */
  thirdPlaceMatch?: boolean;
  onStartPlayoffs?: () => void;
  startDisabled?: boolean;
  className?: string;
  action?: ReactNode;
}

export function SwissPhaseBanner({
  variant,
  qualifiedCount = 0,
  completed = false,
  thirdPlaceMatch = false,
  onStartPlayoffs,
  startDisabled,
  className,
  action,
}: SwissPhaseBannerProps) {
  if (variant === "group-complete") {
    return (
      <div
        className={cn(
          "relative overflow-hidden border border-white/15 bg-[oklch(0.09_0_0)]",
          className,
        )}
      >
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-35" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-linear-to-b from-white/80 via-white/40 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-white/6 to-transparent" />

        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center border border-white/15 bg-white/6">
              <Crown className="h-5 w-5 text-white/80" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-white/45">
                <span className="h-px w-6 bg-white/20" />
                Group Stage — Complete
              </div>
              <h3 className="mt-2 font-display text-xl tracking-wider text-white sm:text-2xl">
                {qualifiedCount} {qualifiedCount === 1 ? "Team" : "Teams"} Qualified
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/55">
                The Swiss stage is locked. Generate the championship bracket to determine final
                placements and prize distribution.
              </p>
            </div>
          </div>

          {action ??
            (onStartPlayoffs && (
              <Button
                type="button"
                disabled={startDisabled}
                onClick={onStartPlayoffs}
                className="clip-cta shrink-0 bg-white px-6 font-tech text-xs uppercase tracking-wider-2 text-black hover:bg-white/90"
              >
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Start Playoffs
              </Button>
            ))}
        </div>
      </div>
    );
  }

  if (variant === "playoffs-public") {
    return (
      <div
        className={cn(
          "relative overflow-hidden border px-6 py-5",
          completed
            ? "border-violet-400/20 bg-[oklch(0.08_0_0)]"
            : "border-white/12 bg-[oklch(0.08_0_0)]",
          className,
        )}
      >
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-1 bg-linear-to-b to-transparent",
            completed ? "from-violet-400/70 via-violet-400/30" : "from-white/30",
          )}
        />
        <div className="relative flex items-start gap-4">
          <div
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center border",
              completed ? "border-violet-400/25 bg-violet-400/8" : "border-white/15 bg-white/5",
            )}
          >
            {completed ? (
              <CheckCircle2 className="h-4 w-4 text-violet-300" strokeWidth={1.5} />
            ) : (
              <Trophy className="h-4 w-4 text-white/75" strokeWidth={1.5} />
            )}
          </div>
          <div>
            <p
              className={cn(
                "text-[10px] font-tech uppercase tracking-wider-2",
                completed ? "text-violet-300/70" : "text-white/45",
              )}
            >
              {completed ? "Championship — Final" : "Championship Phase"}
            </p>
            <p className="mt-1 font-display text-lg tracking-wider text-white">
              {completed ? "Tournament complete" : "Playoff bracket is live"}
            </p>
            <p className="mt-1 text-sm text-white/50">
              {completed
                ? "Final placements and results are recorded in the playoff bracket below."
                : "Final placements are decided in the single-elimination bracket below."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden border",
        completed
          ? "border-violet-400/20 bg-[oklch(0.08_0_0)]"
          : "border-white/12 bg-[oklch(0.08_0_0)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-1 bg-linear-to-b to-transparent",
          completed ? "from-violet-400/80 via-violet-400/35" : "from-amber-300/90 via-amber-400/40",
        )}
      />

      <div className="relative flex items-start gap-4 px-6 py-5">
        <div
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center border",
            completed
              ? "border-violet-400/25 bg-violet-400/8"
              : "border-amber-400/25 bg-amber-400/8",
          )}
        >
          {completed ? (
            <CheckCircle2 className="h-4 w-4 text-violet-200" strokeWidth={1.5} />
          ) : (
            <Trophy className="h-4 w-4 text-amber-200" strokeWidth={1.5} />
          )}
        </div>
        <div>
          <p
            className={cn(
              "text-[10px] font-tech uppercase tracking-wider-2",
              completed ? "text-violet-300/75" : "text-amber-400/70",
            )}
          >
            {completed ? "Championship Phase — Final" : "Championship Phase — Live"}
          </p>
          <p className="mt-1 font-display text-lg tracking-wider text-white">
            {completed ? "Tournament marked complete" : "Playoffs are underway"}
          </p>
          <p className="mt-1 text-sm text-white/55">
            {completed
              ? "Results are locked. Review the championship bracket below for final standings and prizes."
              : "Manage the championship bracket below to record results and crown a winner."}
          </p>
          {thirdPlaceMatch && (
            <p className="mt-2 text-xs text-orange-300/70">
              3rd place match enabled — semifinal losers will meet after semis are decided.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
