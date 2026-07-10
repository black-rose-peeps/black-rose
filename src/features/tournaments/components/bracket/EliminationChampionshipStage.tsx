import type { ReactNode } from "react";
import { Crown, Medal, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoundSchedule } from "@/features/tournaments/utils/round-schedule";
import { isRoundScheduleConfigured } from "@/features/tournaments/utils/round-schedule";
import { BracketSectionHeader } from "./BracketSectionHeader";
import { BracketRoundScheduleDisplay } from "./BracketRoundScheduleDisplay";

export interface ChampionshipStageMatch {
  id: string;
  teamA: string | null;
  teamB: string | null;
  winner: string | null;
  confirmed: boolean;
  label?: string;
}

export interface ChampionshipStageRound {
  roundId: string;
  title: string;
  subtitle?: string;
  variant: "final" | "third";
  match: ChampionshipStageMatch;
  schedule?: RoundSchedule;
  scheduleControl?: ReactNode;
}

function ChampionshipScheduleSlot({
  label,
  schedule,
  scheduleControl,
}: {
  label: string;
  schedule?: RoundSchedule;
  scheduleControl?: ReactNode;
}) {
  const hasSchedule = isRoundScheduleConfigured(schedule);
  if (!scheduleControl && !hasSchedule) return null;

  return (
    <div className="mx-auto w-full max-w-[240px] space-y-2">
      {scheduleControl}
      {!scheduleControl && hasSchedule ? (
        <BracketRoundScheduleDisplay schedule={schedule} variant="grand" label={label} />
      ) : null}
    </div>
  );
}

interface EliminationChampionshipStageProps {
  rounds: ChampionshipStageRound[];
  formatControl?: ReactNode;
  formatLabel?: string;
  renderMatch: (round: ChampionshipStageRound) => ReactNode;
  className?: string;
}

export function EliminationChampionshipStage({
  rounds,
  formatControl,
  formatLabel,
  renderMatch,
  className,
}: EliminationChampionshipStageProps) {
  if (rounds.length === 0) return null;

  const primary = rounds.find((round) => round.variant === "final") ?? rounds[0];
  const thirdPlace = rounds.find((round) => round.variant === "third");

  return (
    <section className={cn("space-y-5", className)}>
      <BracketSectionHeader title="Championship" accent="warning" />

      <div className="overflow-hidden border border-amber-400/35 bg-gradient-to-br from-amber-400/[0.12] via-background to-primary/[0.06]">
        <div className="border-b border-amber-400/20 bg-amber-400/[0.06] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center border border-amber-400/35 bg-amber-400/10">
                <Trophy className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <p className="font-display text-sm font-bold uppercase tracking-[0.14em] text-amber-200">
                  {primary.title}
                </p>
                <p className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                  {primary.subtitle ?? "Winner takes the title"}
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
          <ChampionshipScheduleSlot
            label={primary.title}
            schedule={primary.schedule}
            scheduleControl={primary.scheduleControl}
          />
          <div className="mx-auto w-full max-w-md">{renderMatch(primary)}</div>

          {thirdPlace && (
            <div className="space-y-4 border-t border-amber-400/15 pt-5">
              <div className="flex items-center justify-center gap-2 text-center">
                <Medal className="h-4 w-4 text-amber-300/80" />
                <p className="font-tech text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300">
                  {thirdPlace.title}
                </p>
              </div>
              <ChampionshipScheduleSlot
                label={thirdPlace.title}
                schedule={thirdPlace.schedule}
                scheduleControl={thirdPlace.scheduleControl}
              />
              <div className="mx-auto w-full max-w-md">{renderMatch(thirdPlace)}</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function ChampionshipTeamPreview({
  teamName,
  isWinner,
  decided,
}: {
  teamName: string | null;
  isWinner: boolean;
  decided: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-amber-400/25 bg-amber-400/5 px-3 py-2 text-center",
        decided && isWinner && "ring-1 ring-emerald-400/40",
      )}
    >
      <p className="font-display text-sm font-semibold">{teamName ?? "TBD"}</p>
      {decided && isWinner && (
        <span className="mt-1 inline-flex items-center gap-1 font-tech text-[9px] uppercase tracking-wider text-emerald-400">
          <Crown className="h-3 w-3" />
          Champion
        </span>
      )}
    </div>
  );
}
