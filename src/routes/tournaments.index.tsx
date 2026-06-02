import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/features/landing/components/Header";
import { Footer } from "@/features/landing/components/Footer";
import { TournamentFilters } from "@/features/tournaments/components/TournamentFilters";
import { TournamentGrid } from "@/features/tournaments/components/TournamentGrid";
import { Emblem } from "@/features/shared/components/Emblem";
import { mockTournaments } from "@/lib/mock-data";
import { ALL_GAMES, ALL_STATUSES } from "@/features/tournaments/constants";
import type { TournamentGame, TournamentStatus, Tournament } from "@/features/tournaments/types";

// Valid public statuses — excludes "Draft" from MockTournament
const PUBLIC_STATUSES = new Set([
  "Registration Open",
  "Registration Closed",
  "Live",
  "Completed",
  "Archived",
]);

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

// Exclude Draft tournaments — filter to public statuses, result typed as Tournament[]
const publicTournaments: Tournament[] = mockTournaments.filter((t) =>
  PUBLIC_STATUSES.has(t.status),
) as Tournament[];

function TournamentsPage() {
  const [activeGame, setActiveGame] = useState<typeof ALL_GAMES | TournamentGame>(ALL_GAMES);
  const [activeStatus, setActiveStatus] = useState<typeof ALL_STATUSES | TournamentStatus>(
    ALL_STATUSES,
  );

  const filtered = publicTournaments.filter((t) => {
    const gameMatch = activeGame === ALL_GAMES || t.game === activeGame;
    const statusMatch = activeStatus === ALL_STATUSES || t.status === activeStatus;
    return gameMatch && statusMatch;
  });

  const openCount = publicTournaments.filter((t) => t.status === "Registration Open").length;
  const liveCount = publicTournaments.filter((t) => t.status === "Live").length;
  const totalCount = publicTournaments.length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* ── Page hero ─────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/6 pt-32 pb-20">
        {/* Depth layers */}
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(255,255,255,0.06),transparent)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-background to-transparent" />
        {/* Top edge highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />
        {/* Decorative emblem — right side */}
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

          {/* Stats strip — factual only */}
          <div className="mt-10 inline-grid grid-cols-3 divide-x divide-white/8 border border-white/8 bg-white/2.5">
            {[
              { label: "Total Tournaments", value: totalCount },
              { label: "Registration Open", value: openCount },
              { label: "Live Right Now", value: liveCount },
            ].map((s) => (
              <div key={s.label} className="px-6 py-5">
                <div className="font-display text-3xl tracking-display md:text-4xl">{s.value}</div>
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
        {/* Subtle texture behind the whole directory */}
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />

        <div className="relative mx-auto max-w-7xl px-6 py-14">
          <div className="flex flex-col gap-10">
            {/* Filters */}
            <TournamentFilters
              activeGame={activeGame}
              activeStatus={activeStatus}
              onGameChange={setActiveGame}
              onStatusChange={setActiveStatus}
              totalCount={publicTournaments.length}
              filteredCount={filtered.length}
            />

            {/* Live — pinned first */}
            {activeStatus === ALL_STATUSES && filtered.some((t) => t.status === "Live") && (
              <Group
                dot="bg-white animate-pulse-soft"
                label="Live Now"
                tournaments={filtered.filter((t) => t.status === "Live")}
              />
            )}

            {/* Registration Open */}
            {activeStatus === ALL_STATUSES &&
              filtered.some((t) => t.status === "Registration Open") && (
                <Group
                  dot="bg-emerald-400 animate-pulse-soft"
                  label="Registration Open"
                  tournaments={filtered.filter((t) => t.status === "Registration Open")}
                />
              )}

            {/* Everything else (or when a filter is active — flat list) */}
            {activeStatus !== ALL_STATUSES ? (
              <TournamentGrid tournaments={filtered} />
            ) : filtered.some((t) => t.status !== "Live" && t.status !== "Registration Open") ? (
              <Group
                label="Past & Upcoming"
                tournaments={filtered.filter(
                  (t) => t.status !== "Live" && t.status !== "Registration Open",
                )}
              />
            ) : (
              /* All groups empty — show TournamentGrid so its empty-state renders */
              filtered.length === 0 && <TournamentGrid tournaments={[]} />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// Labelled tournament section group
function Group({
  label,
  dot,
  tournaments,
}: {
  label: string;
  dot?: string;
  tournaments: Tournament[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2.5 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
        {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
        {label}
        <span className="h-px flex-1 bg-white/6" />
      </div>
      <TournamentGrid tournaments={tournaments} />
    </div>
  );
}
