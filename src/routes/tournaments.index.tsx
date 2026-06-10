import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/features/landing/components/Header";
import { Footer } from "@/features/landing/components/Footer";
import { TournamentFilters } from "@/features/tournaments/components/TournamentFilters";
import { TournamentGrid } from "@/features/tournaments/components/TournamentGrid";
import { TournamentGroup } from "@/features/tournaments/components/TournamentGroup";
import { Skeleton } from "@/components/ui/skeleton";
import { Emblem } from "@/features/shared/components/Emblem";
import { ALL_GAMES, ALL_STATUSES } from "@/features/tournaments/constants";
import {
  useCaptainTournamentRegistrations,
  useTournamentList,
  type PublicTournament,
} from "@/features/tournaments/hooks";
import { getSession } from "@/features/auth/store/session";
import { hasFullMemberAccess } from "@/features/auth/utils/routes";
import type { TournamentGame, TournamentStatus } from "@/features/tournaments/types";

export const Route = createFileRoute("/tournaments/")({
  head: () => ({
    meta: [
      { title: "Tournaments — Black Rose" },
      {
        name: "description",
        content:
          "Browse all Black Rose community esports tournaments. Filter by game, status, and region. Register your team and compete.",
      },
    ],
  }),
  component: TournamentsPage,
});

function TournamentsPage() {
  const session = getSession();
  const memberId =
    session && hasFullMemberAccess(session.role) ? session.id : undefined;
  const { tournaments, isLoading } = useTournamentList();
  const { registrationByTournament, isLoading: captainRegistrationsLoading } =
    useCaptainTournamentRegistrations(memberId);
  const showCaptainRegistrationState = Boolean(memberId);
  const [activeGame, setActiveGame] = useState<typeof ALL_GAMES | TournamentGame>(ALL_GAMES);
  const [activeStatus, setActiveStatus] = useState<typeof ALL_STATUSES | TournamentStatus>(
    ALL_STATUSES,
  );

  const filtered: PublicTournament[] = tournaments.filter((t: PublicTournament) => {
    const gameMatch = activeGame === ALL_GAMES || t.game === activeGame;
    const statusMatch = activeStatus === ALL_STATUSES || t.status === activeStatus;
    return gameMatch && statusMatch;
  });

  const openCount = tournaments.filter(
    (t: PublicTournament) => t.status === "Registration Open",
  ).length;
  const liveCount = tournaments.filter((t: PublicTournament) => t.status === "Live").length;
  const totalCount = tournaments.length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* ── Page hero ─────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/6 pt-32 pb-20">
        {/* Depth layers */}
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(255,255,255,0.06),transparent)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-background to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />
        <Emblem
          spin
          className="pointer-events-none absolute -right-20 top-0 h-128 w-lg opacity-[0.04]"
        />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mb-4 inline-flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
            <span className="h-px w-10 bg-border" />
            Tournament Directory
          </div>

          <h1 className="font-display text-5xl tracking-display sm:text-6xl md:text-7xl">
            All Tournaments
          </h1>

          <p className="mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
            Community esports organized by Black Rose. Find your next competition, lock in your
            roster, and compete.
          </p>

          {/* Stats strip */}
          <div className="mt-10 inline-grid grid-cols-3 divide-x divide-white/8 border border-white/8 bg-white/2.5">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-6 py-5">
                    <Skeleton className="h-9 w-10 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))
              : [
                  { label: "Total Tournaments", value: totalCount },
                  { label: "Registration Open", value: openCount },
                  { label: "Live Right Now", value: liveCount },
                ].map((s) => (
                  <div key={s.label} className="px-6 py-5">
                    <div className="font-display text-3xl tracking-display md:text-4xl">
                      {s.value}
                    </div>
                    <div className="mt-1 text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                      {s.label}
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* ── Directory ─────────────────────────────────────── */}
      <main className="relative bg-[oklch(0.05_0_0)]">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />

        <div className="relative mx-auto max-w-7xl px-6 py-14">
          <div className="flex flex-col gap-10">
            {/* Filters */}
            <TournamentFilters
              activeGame={activeGame}
              activeStatus={activeStatus}
              onGameChange={setActiveGame}
              onStatusChange={setActiveStatus}
              totalCount={totalCount}
              filteredCount={filtered.length}
            />

            {/* Loading skeleton grid */}
            {isLoading && (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-4 border border-white/8 bg-[oklch(0.08_0_0)] p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-6 w-48" />
                      </div>
                      <Skeleton className="h-6 w-24 shrink-0 rounded-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <Skeleton key={j} className="h-14 rounded-sm" />
                      ))}
                    </div>
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            )}

            {!isLoading && (
              <>
                {/* Live — pinned first */}
                {activeStatus === ALL_STATUSES && filtered.some((t) => t.status === "Live") && (
                  <TournamentGroup
                    dot="bg-white animate-pulse-soft"
                    label="Live Now"
                    tournaments={filtered.filter((t) => t.status === "Live")}
                    captainRegistrationByTournament={registrationByTournament}
                    captainRegistrationLoading={
                      showCaptainRegistrationState && captainRegistrationsLoading
                    }
                  />
                )}

                {/* Registration Open */}
                {activeStatus === ALL_STATUSES &&
                  filtered.some((t) => t.status === "Registration Open") && (
                    <TournamentGroup
                      dot="bg-emerald-400 animate-pulse-soft"
                      label="Registration Open"
                      tournaments={filtered.filter((t) => t.status === "Registration Open")}
                      captainRegistrationByTournament={registrationByTournament}
                      captainRegistrationLoading={
                        showCaptainRegistrationState && captainRegistrationsLoading
                      }
                    />
                  )}

                {/* Everything else (or when a filter is active — flat list) */}
                {activeStatus !== ALL_STATUSES ? (
                  <TournamentGrid
                    tournaments={filtered}
                    captainRegistrationByTournament={registrationByTournament}
                    captainRegistrationLoading={
                      showCaptainRegistrationState && captainRegistrationsLoading
                    }
                  />
                ) : filtered.some(
                    (t) => t.status !== "Live" && t.status !== "Registration Open",
                  ) ? (
                  <TournamentGroup
                    label="Past & Upcoming"
                    tournaments={filtered.filter(
                      (t) => t.status !== "Live" && t.status !== "Registration Open",
                    )}
                    captainRegistrationByTournament={registrationByTournament}
                    captainRegistrationLoading={
                      showCaptainRegistrationState && captainRegistrationsLoading
                    }
                  />
                ) : (
                  filtered.length === 0 && (
                    <TournamentGrid
                      tournaments={[]}
                      captainRegistrationByTournament={registrationByTournament}
                      captainRegistrationLoading={
                        showCaptainRegistrationState && captainRegistrationsLoading
                      }
                    />
                  )
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
