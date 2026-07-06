import { useMemo } from "react";
import { ArrowUpRight, CalendarClock, Clock, Crown, MapPin, Monitor } from "lucide-react";
import { DISCORD_SERVER_INVITE } from "@/features/auth/constants";
import { DiscordAppAnchor } from "@/features/shared/components/DiscordAppAnchor";
import type { BracketRound } from "@/features/tournaments/types";
import {
  formatRoundScheduleParts,
  listConfiguredRoundSchedules,
  roundVenueLabel,
  type RoundSchedule,
} from "@/features/tournaments/utils/round-schedule";
import { cn } from "@/lib/utils";

interface TournamentRoundSchedulePanelProps {
  bracket: BracketRound[];
  roundSchedules?: Record<string, RoundSchedule> | null;
  className?: string;
}

export function TournamentRoundSchedulePanel({
  bracket,
  roundSchedules,
  className,
}: TournamentRoundSchedulePanelProps) {
  const entries = useMemo(
    () => listConfiguredRoundSchedules(bracket, roundSchedules),
    [bracket, roundSchedules],
  );

  if (entries.length === 0) return null;

  return (
    <section className={cn("border border-white/8 bg-[oklch(0.07_0_0)]", className)}>
      <div className="flex items-center gap-2.5 border-b border-white/8 px-5 py-4">
        <span className="text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="font-tech text-label-readable uppercase text-foreground">
            Match Schedule
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Staff-published round times — check the Bracket tab for live results.
          </p>
        </div>
      </div>

      <ol className="relative px-5 py-5">
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-5 left-[2.125rem] top-5 w-px bg-gradient-to-b from-white/20 via-white/10 to-transparent"
        />

        {entries.map((entry, index) => {
          const parts = formatRoundScheduleParts(entry.schedule);
          const isOnline = entry.schedule.venueType === "online";
          const isOnsite = entry.schedule.venueType === "onsite";
          const venueLabel = roundVenueLabel(entry.schedule.venueType);
          const prevDate = index > 0 ? entries[index - 1].schedule.date : null;
          const showDateBadge = entry.schedule.date !== prevDate;

          return (
            <li key={entry.roundId} className="relative flex gap-4 pb-6 last:pb-0">
              <div className="relative z-10 flex w-7 shrink-0 flex-col items-center pt-1">
                <span
                  className={cn(
                    "grid h-3.5 w-3.5 place-items-center rounded-full border-2 bg-[oklch(0.07_0_0)]",
                    entry.isGrandFinal
                      ? "border-amber-300/70 shadow-[0_0_12px_-2px_rgba(251,191,36,0.45)]"
                      : isOnline
                        ? "border-[#5865F2]/60"
                        : isOnsite
                          ? "border-amber-400/50"
                          : "border-white/25",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      entry.isGrandFinal
                        ? "bg-amber-300"
                        : isOnline
                          ? "bg-[#5865F2]"
                          : isOnsite
                            ? "bg-amber-400"
                            : "bg-white/50",
                    )}
                  />
                </span>
              </div>

              <article className="min-w-0 flex-1">
                {showDateBadge && parts && (
                  <div className="mb-2 flex items-baseline gap-2">
                    <p className="font-display text-2xl leading-none tracking-display text-foreground">
                      {parts.monthDay}
                    </p>
                    <p className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                      {parts.weekday} · {parts.year}
                    </p>
                  </div>
                )}

                <div
                  className={cn(
                    "border border-white/8 bg-[oklch(0.06_0_0)] p-4 transition-colors",
                    entry.isGrandFinal && "border-amber-400/25 bg-amber-400/[0.04]",
                    isOnline && !entry.isGrandFinal && "border-[#5865F2]/20 bg-[#5865F2]/[0.03]",
                    isOnsite && !entry.isGrandFinal && "border-amber-400/20 bg-amber-400/[0.03]",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {entry.isGrandFinal ? (
                          <Crown className="h-3.5 w-3.5 shrink-0 text-amber-300/90" />
                        ) : null}
                        <p
                          className={cn(
                            "font-display text-sm font-semibold tracking-display",
                            entry.isGrandFinal ? "text-amber-100" : "text-foreground",
                          )}
                        >
                          {entry.roundLabel}
                        </p>
                      </div>
                      {entry.isGrandFinal && (
                        <p className="mt-0.5 font-tech text-[9px] uppercase tracking-[0.16em] text-amber-300/70">
                          Championship
                        </p>
                      )}
                    </div>

                    {parts?.timeLabel && (
                      <div className="inline-flex items-center gap-1.5 border border-white/10 bg-white/[0.04] px-2.5 py-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="font-tech text-[10px] font-semibold uppercase tracking-wider text-foreground/90">
                          {parts.timeLabel}
                        </span>
                      </div>
                    )}
                  </div>

                  {(isOnline || isOnsite || venueLabel) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/6 pt-3">
                      {isOnline && (
                        <DiscordAppAnchor
                          discordUrl={DISCORD_SERVER_INVITE}
                          className="inline-flex items-center gap-1.5 font-tech text-[10px] uppercase tracking-wider text-[#aeb7ff] transition-colors hover:text-[#dfe3ff]"
                        >
                          <Monitor className="h-3.5 w-3.5" />
                          Play on Discord
                          <ArrowUpRight className="h-3 w-3 opacity-70" />
                        </DiscordAppAnchor>
                      )}
                      {isOnsite && (
                        <div className="inline-flex min-w-0 items-start gap-1.5 text-left">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/90" />
                          <div className="min-w-0">
                            <p className="font-tech text-[9px] uppercase tracking-wider text-amber-300/80">
                              On-site
                            </p>
                            {entry.schedule.location ? (
                              <p className="mt-0.5 text-xs leading-snug text-foreground/85">
                                {entry.schedule.location}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )}
                      {!isOnline && !isOnsite && venueLabel && (
                        <span className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                          {venueLabel}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
