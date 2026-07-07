import { Link } from "@tanstack/react-router";
import { Calendar, ChevronRight, Clock, MapPin, Monitor, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArenaEmptyState } from "@/features/shared/components/ArenaEmptyState";
import { CornerAccents } from "@/features/member/components/MemberShell";
import type { UpcomingMatch } from "@/features/member/types";
import { cn } from "@/lib/utils";

interface UpcomingMatchesPanelProps {
  matches: UpcomingMatch[];
}

export function UpcomingMatchesPanel({ matches }: UpcomingMatchesPanelProps) {
  if (matches.length === 0) {
    return (
      <ArenaEmptyState
        embedded
        eyebrow="Clear Schedule"
        title={
          <>
            No matches <span className="text-stroke">scheduled.</span>
          </>
        }
        description="Register for a tournament to get matched and see your upcoming games here."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {matches.map((match) => {
        const isOnline = match.venueType === "online";
        const isOnsite = match.venueType === "onsite";
        const hasSchedule = match.hasRoundSchedule;

        return (
          <li
            key={match.matchId}
            className={cn(
              "relative overflow-hidden border border-white/8 bg-[oklch(0.06_0_0)] card-depth clip-tab",
              hasSchedule && isOnline && "border-[#5865F2]/20",
              hasSchedule && isOnsite && "border-amber-400/20",
            )}
          >
            <CornerAccents />

            <div className="flex flex-col gap-4 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-tech text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {match.round}
                  </p>
                  <p className="mt-0.5 truncate font-display text-base font-semibold tracking-display text-foreground">
                    {match.tournamentName}
                  </p>
                </div>
                <Swords className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              </div>

              <div className="flex items-center justify-between gap-3 border border-white/8 bg-white/[0.02] px-4 py-3">
                <div className="min-w-0 text-center">
                  <p className="font-tech text-[9px] uppercase tracking-wider text-muted-foreground">
                    Your team
                  </p>
                  <p className="mt-1 truncate font-display text-sm font-semibold tracking-display">
                    {match.teamName}
                  </p>
                </div>
                <span className="shrink-0 font-display text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  vs
                </span>
                <div className="min-w-0 text-center">
                  <p className="font-tech text-[9px] uppercase tracking-wider text-muted-foreground">
                    Opponent
                  </p>
                  <p
                    className={cn(
                      "mt-1 truncate font-display text-sm font-semibold tracking-display",
                      match.opponent === "TBD" ? "text-muted-foreground/50" : "text-foreground",
                    )}
                  >
                    {match.opponent}
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  "flex flex-wrap items-center gap-3 border-t border-white/6 pt-3",
                  hasSchedule && isOnline && "text-[#aeb7ff]",
                  hasSchedule && isOnsite && "text-amber-200/90",
                )}
              >
                <div className="inline-flex items-center gap-2 min-w-0">
                  {hasSchedule ? (
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="font-tech text-[10px] font-semibold uppercase tracking-wider text-foreground/90">
                    {match.scheduledAt}
                  </span>
                </div>

                {isOnline && (
                  <span className="inline-flex items-center gap-1 font-tech text-[10px] uppercase tracking-wider text-[#aeb7ff]">
                    <Monitor className="h-3 w-3" />
                    Discord
                  </span>
                )}
                {isOnsite && match.location && (
                  <span className="inline-flex min-w-0 items-center gap-1 font-tech text-[10px] uppercase tracking-wider text-amber-200/90">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate normal-case">{match.location}</span>
                  </span>
                )}
              </div>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="clip-cta h-9 w-full rounded-none border-white/12 bg-white/[0.03] font-tech text-ui-readable uppercase hover:bg-white/8 sm:w-auto sm:self-end"
              >
                <Link to="/tournaments/$id" params={{ id: match.tournamentId }}>
                  View bracket
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
