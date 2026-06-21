import { Link } from "@tanstack/react-router";
import { ChevronRight, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminEmptyTitle } from "@/features/admin/constants/empty-state-titles";
import { StatusPill } from "@/features/admin/components/ui";
import type { AdminDashboardData } from "@/features/admin/services/dashboard.service";

type ActiveTournament = AdminDashboardData["activeTournaments"][number];

interface DashboardMobileTournamentsProps {
  tournaments: ActiveTournament[];
  isLoading: boolean;
}

export function DashboardMobileTournaments({
  tournaments,
  isLoading,
}: DashboardMobileTournamentsProps) {
  return (
    <section className="overflow-hidden border border-white/[0.08] bg-[oklch(0.09_0_0)] md:hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
        <div>
          <p className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
            Live Operations
          </p>
          <h2 className="font-display text-lg tracking-wider-2">Active Tournaments</h2>
        </div>
        <Link
          to="/admin/tournaments"
          className="touch-target font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground"
        >
          View all
        </Link>
      </div>

      {isLoading ? (
        <ul className="divide-y divide-white/[0.06]">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-4">
              <Skeleton className="h-10 w-10 shrink-0 rounded-none" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40 rounded-none" />
                <Skeleton className="h-3 w-28 rounded-none" />
              </div>
            </li>
          ))}
        </ul>
      ) : tournaments.length === 0 ? (
        <div className="px-4 py-6">
          <AdminEmptyState
            embedded
            eyebrow="Live Operations"
            title={<AdminEmptyTitle noun="active events" />}
            description="Events with open registration or live brackets appear here."
            actions={
              <Link
                to="/admin/tournaments"
                className="font-tech text-ui-readable uppercase underline-offset-4 hover:underline"
              >
                Go to Tournaments
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {tournaments.map((tournament) => (
            <li key={tournament.id}>
              <Link
                to="/admin/tournaments/$id"
                params={{ id: tournament.id }}
                className="flex items-start gap-3 px-4 py-4 transition active:opacity-80"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center border border-white/10 bg-white/[0.04]">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-title text-base leading-snug">{tournament.name}</p>
                  <div className="mt-1.5">
                    <StatusPill status={tournament.status} />
                  </div>
                  <p className="mt-2 font-tech text-label-readable uppercase text-muted-foreground">
                    {tournament.game} · {tournament.prizePool}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {tournament.teamsRegistered}/{tournament.teamCap} slots filled
                  </p>
                </div>
                <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground/50" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
