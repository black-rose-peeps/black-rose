import { Link } from "@tanstack/react-router";
import { CheckCircle, ChevronRight, Clock, Gamepad2, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArenaEmptyState } from "@/features/shared/components/ArenaEmptyState";
import { CornerAccents } from "@/features/member/components/MemberShell";
import type { TournamentEntry } from "@/features/member/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  Pending: {
    border: "border-amber-400/30",
    bar: "bg-amber-400",
    label: "Pending approval",
    text: "text-amber-400",
    icon: Clock,
  },
  Approved: {
    border: "border-emerald-400/25",
    bar: "bg-emerald-400",
    label: "Registered",
    text: "text-emerald-400",
    icon: CheckCircle,
  },
  Rejected: {
    border: "border-red-400/25",
    bar: "bg-red-400",
    label: "Declined",
    text: "text-red-400",
    icon: null,
  },
} as const;

interface ActiveRegistrationsPanelProps {
  entries: TournamentEntry[];
}

export function ActiveRegistrationsPanel({ entries }: ActiveRegistrationsPanelProps) {
  if (entries.length === 0) {
    return (
      <ArenaEmptyState
        embedded
        eyebrow="No Entries"
        title={
          <>
            No active <span className="text-stroke">registrations.</span>
          </>
        }
        description="Browse open tournaments and register your team when the next bracket opens."
        actions={
          <Button
            asChild
            variant="outline"
            className="clip-cta inline-flex h-11 items-center rounded-none border-white/15 font-tech text-ui-readable uppercase"
          >
            <Link to="/tournaments">
              Browse Tournaments
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {entries.map((entry) => {
        const status = STATUS_STYLES[entry.status];
        const StatusIcon = status.icon;

        return (
          <li
            key={`${entry.tournamentId}-${entry.teamTag}`}
            className={cn(
              "relative overflow-hidden border bg-[oklch(0.06_0_0)] card-depth clip-tab",
              status.border,
            )}
          >
            <CornerAccents />
            <span
              aria-hidden
              className={cn("absolute inset-y-0 left-0 w-0.5", status.bar)}
            />

            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="rounded-none border-white/12 bg-white/[0.04] font-display text-sm tracking-display text-foreground"
                  >
                    [{entry.teamTag}]
                  </Badge>
                  <span className="truncate text-sm text-muted-foreground">{entry.teamName}</span>
                </div>

                <div className="min-w-0">
                  <p className="font-display text-base font-semibold leading-snug tracking-display text-foreground">
                    {entry.tournamentName}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {entry.game && (
                      <span className="inline-flex items-center gap-1 font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                        <Gamepad2 className="h-3 w-3" />
                        {entry.game}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                      <Users2 className="h-3 w-3" />
                      Team entry
                    </span>
                  </div>
                </div>

                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 font-tech text-ui-readable uppercase",
                    status.text,
                  )}
                >
                  {entry.status === "Pending" && (
                    <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-amber-400" />
                  )}
                  {StatusIcon && <StatusIcon className="h-3 w-3" />}
                  {status.label}
                </div>
              </div>

              <Button
                asChild
                variant="outline"
                className="clip-cta h-10 shrink-0 rounded-none border-white/12 bg-white/[0.03] font-tech text-ui-readable uppercase hover:bg-white/8"
              >
                <Link to="/tournaments/$id" params={{ id: entry.tournamentId }}>
                  View tournament
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
