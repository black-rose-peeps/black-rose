import type { ReactNode } from "react";
import { ArrowDown, Crown, Shield, Swords, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getGrandFinalStageSubtitle,
  grandFinalAllowsBracketReset,
  type GrandFinalMode,
} from "@/features/admin/features/tournament-details/utils/grand-final";
import type { RoundSchedule } from "@/features/tournaments/utils/round-schedule";
import { isRoundScheduleConfigured } from "@/features/tournaments/utils/round-schedule";
import { BracketSectionHeader } from "./BracketSectionHeader";
import { BracketRoundScheduleDisplay } from "./BracketRoundScheduleDisplay";

export interface GrandFinalStageMatch {
  id: string;
  teamA: string | null;
  teamB: string | null;
  winner: string | null;
  confirmed: boolean;
  label?: string;
}

interface GrandFinalStageProps {
  primaryMatch: GrandFinalStageMatch;
  resetMatch?: GrandFinalStageMatch | null;
  allowsBracketReset?: boolean;
  grandFinalMode?: GrandFinalMode;
  formatLabel?: string;
  formatControl?: ReactNode;
  primarySchedule?: RoundSchedule;
  resetSchedule?: RoundSchedule;
  primaryScheduleControl?: ReactNode;
  resetScheduleControl?: ReactNode;
  /** @deprecated use primarySchedule / resetSchedule */
  scheduleDisplay?: ReactNode;
  renderMatch: (match: GrandFinalStageMatch, variant: "primary" | "reset") => ReactNode;
  className?: string;
}

function PathBadge({
  side,
  teamName,
  isWinner,
  decided,
}: {
  side: "upper" | "lower";
  teamName: string | null;
  isWinner: boolean;
  decided: boolean;
}) {
  const isUpper = side === "upper";

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center gap-2 rounded-md border px-3 py-4 text-center",
        isUpper ? "border-primary/30 bg-primary/5" : "border-amber-400/30 bg-amber-400/5",
        decided && isWinner && "ring-1 ring-emerald-400/40",
      )}
    >
      <div
        className={cn(
          "inline-flex items-center gap-1.5 font-tech text-[9px] font-bold uppercase tracking-[0.18em]",
          isUpper ? "text-primary/80" : "text-amber-300/90",
        )}
      >
        {isUpper ? <Shield className="h-3 w-3" /> : <Swords className="h-3 w-3" />}
        {isUpper ? "Upper Bracket" : "Lower Bracket"}
      </div>
      <p className="font-display text-sm font-semibold text-foreground">{teamName ?? "TBD"}</p>
      {decided && isWinner && (
        <span className="inline-flex items-center gap-1 font-tech text-[9px] uppercase tracking-wider text-emerald-400">
          <Crown className="h-3 w-3" />
          Won
        </span>
      )}
    </div>
  );
}

function MatchScheduleSlot({
  label,
  schedule,
  scheduleControl,
  legacyDisplay,
}: {
  label: string;
  schedule?: RoundSchedule;
  scheduleControl?: ReactNode;
  legacyDisplay?: ReactNode;
}) {
  const hasSchedule = isRoundScheduleConfigured(schedule);
  if (!scheduleControl && !hasSchedule && !legacyDisplay) return null;

  return (
    <div className="mx-auto w-full max-w-[240px] space-y-2">
      {scheduleControl}
      {!scheduleControl && hasSchedule ? (
        <BracketRoundScheduleDisplay schedule={schedule} variant="grand" label={label} />
      ) : (
        !scheduleControl && legacyDisplay
      )}
    </div>
  );
}

export function GrandFinalStage({
  primaryMatch,
  resetMatch,
  allowsBracketReset,
  grandFinalMode,
  formatLabel,
  formatControl,
  primarySchedule,
  resetSchedule,
  primaryScheduleControl,
  resetScheduleControl,
  scheduleDisplay,
  renderMatch,
  className,
}: GrandFinalStageProps) {
  const bracketResetEnabled = allowsBracketReset ?? grandFinalAllowsBracketReset(grandFinalMode);
  const primaryDecided = primaryMatch.confirmed && !!primaryMatch.winner;
  const lowerWonPrimary =
    primaryDecided && !!primaryMatch.teamB && primaryMatch.winner === primaryMatch.teamB;
  const showReset = bracketResetEnabled && (!!resetMatch || lowerWonPrimary);

  const stageSubtitle = getGrandFinalStageSubtitle(grandFinalMode);
  const primaryMatchLabel = bracketResetEnabled ? "Grand Final 1" : "Grand Final";

  return (
    <section className={cn("space-y-5", className)}>
      <BracketSectionHeader title="Grand Finals" accent="warning" />

      <div className="overflow-hidden border border-amber-400/35 bg-gradient-to-br from-amber-400/[0.12] via-background to-primary/[0.06]">
        <div className="border-b border-amber-400/20 bg-amber-400/[0.06] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center border border-amber-400/35 bg-amber-400/10">
                <Trophy className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <p className="font-display text-sm font-bold uppercase tracking-[0.14em] text-amber-200">
                  Championship Stage
                </p>
                <p className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                  {stageSubtitle}
                </p>
              </div>
            </div>
            {(formatControl || formatLabel) && (
              <div className="flex items-center gap-2">
                {formatLabel && (
                  <span className="font-tech text-[10px] uppercase tracking-wider text-amber-300/80">
                    {formatLabel}
                  </span>
                )}
                {formatControl}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
            <PathBadge
              side="upper"
              teamName={primaryMatch.teamA}
              isWinner={primaryDecided && primaryMatch.winner === primaryMatch.teamA}
              decided={primaryDecided}
            />
            <div className="flex w-full max-w-[240px] flex-col items-center gap-2 py-1 sm:px-2">
              <span className="font-display text-lg font-bold uppercase tracking-[0.2em] text-amber-300/90">
                VS
              </span>
              <span className="font-tech text-[9px] uppercase tracking-wider text-muted-foreground">
                {primaryMatchLabel}
              </span>
              <MatchScheduleSlot
                label={primaryMatchLabel}
                schedule={primarySchedule}
                scheduleControl={primaryScheduleControl}
                legacyDisplay={
                  !resetSchedule && !resetScheduleControl ? scheduleDisplay : undefined
                }
              />
            </div>
            <PathBadge
              side="lower"
              teamName={primaryMatch.teamB}
              isWinner={primaryDecided && primaryMatch.winner === primaryMatch.teamB}
              decided={primaryDecided}
            />
          </div>

          <div className="mx-auto w-full max-w-md">{renderMatch(primaryMatch, "primary")}</div>

          {showReset && (
            <div className="space-y-4 border-t border-amber-400/15 pt-5">
              <div className="flex flex-col items-center gap-2 text-center">
                <ArrowDown className="h-4 w-4 text-amber-300/70" />
                <p className="font-tech text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300">
                  Bracket Reset
                </p>
                <p className="max-w-md text-xs text-muted-foreground">
                  {lowerWonPrimary && !resetMatch
                    ? "Lower-bracket champion won Grand Final 1 — confirm the result to schedule the deciding match."
                    : "The lower-bracket champion won Grand Final 1. One more match decides the title."}
                </p>
              </div>

              <MatchScheduleSlot
                label="Deciding Match"
                schedule={resetSchedule}
                scheduleControl={resetScheduleControl}
              />

              {resetMatch && (
                <div className="mx-auto w-full max-w-md">{renderMatch(resetMatch, "reset")}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
