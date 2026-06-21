import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Header } from "@/features/landing/components/Header";
import { Footer } from "@/features/landing/components/Footer";
import { ChampionArchiveStatsStrip } from "@/features/championships/components/ChampionArchiveStat";
import { ChampionCardsSkeleton } from "@/features/championships/components/ChampionCardsSkeleton";
import { HallOfChampionsGrid } from "@/features/championships/components/HallOfChampionsGrid";
import { useHallOfChampions } from "@/features/championships/hooks/useHallOfChampions";
import { ArenaEmptyState } from "@/features/shared/components/ArenaEmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Emblem } from "@/features/shared/components/Emblem";

export const Route = createFileRoute("/champions/")({
  head: () => ({
    meta: [
      { title: "Hall of Champions — Black Rose" },
      {
        name: "description",
        content:
          "Browse every team crowned in Black Rose competition. Open a champion file for victory portraits, legacy stories, and roster links.",
      },
    ],
  }),
  component: ChampionsPage,
});

function ChampionsPage() {
  const { champions, isLoading, error } = useHallOfChampions();

  const stats = useMemo(() => {
    const grandFinalWins = champions.filter((c) => c.crownVariant === "grand").length;
    const gamesCrowned = new Set(champions.map((c) => c.game)).size;
    return {
      total: champions.length,
      grandFinalWins,
      gamesCrowned,
    };
  }, [champions]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* ── Page hero ─────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/6 site-header-offset-hero pb-20">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(255,255,255,0.06),transparent)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-background to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />
        <Emblem
          spin
          className="pointer-events-none absolute -right-20 top-0 h-128 w-lg opacity-[0.04]"
        />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mb-4 inline-flex items-center gap-3 font-tech text-label-readable uppercase text-muted-foreground">
            <span className="h-px w-10 bg-border" />
            Legacy Archive
          </div>

          <h1 className="font-display text-5xl tracking-display sm:text-6xl md:text-7xl">
            Hall of Champions
          </h1>

          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
            Every crown earned in Black Rose competition is filed here. Open a champion record to
            view their victory portrait, legacy narrative, and championship roster.
          </p>

          {isLoading ? (
            <div className="mt-10 inline-grid grid-cols-3 divide-x divide-white/8 border border-white/8 bg-white/2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-6 py-5">
                  <Skeleton className="mb-2 h-9 w-10" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          ) : (
            <ChampionArchiveStatsStrip
              stats={[
                {
                  label: "Champions Crowned",
                  value: stats.total,
                  description:
                    "Total first-place teams in the archive — one entry per concluded tournament.",
                },
                {
                  label: "Grand Final Wins",
                  value: stats.grandFinalWins,
                  description:
                    "Champions who won through a Grand Final match, common in double-elimination brackets. Other wins came from standard finals.",
                },
                {
                  label: "Games Crowned",
                  value: stats.gamesCrowned,
                  description:
                    "How many different games (e.g. Valorant, LoL) have at least one crowned team on file.",
                },
              ]}
            />
          )}
        </div>
      </section>

      {/* ── Archive ───────────────────────────────────────── */}
      <main className="relative bg-[oklch(0.05_0_0)]">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />

        <div className="relative mx-auto max-w-7xl px-6 py-14">
          {isLoading ? (
            <ChampionCardsSkeleton count={6} />
          ) : error ? (
            <div className="border border-white/8 bg-card/40 px-6 py-12 text-center">
              <p className="font-display text-xl tracking-display text-white">Archive unavailable</p>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            </div>
          ) : champions.length === 0 ? (
            <ArenaEmptyState
              eyebrow="Archive Sealed"
              title={
                <>
                  The crown awaits its <span className="text-stroke">first name.</span>
                </>
              }
              description="The Hall of Champions opens when a tournament concludes and a victor is decided. Compete under the Black Rose banner to etch your team into the legacy archive."
              actions={
                <>
                  <Link
                    to="/tournaments"
                    className="clip-cta inline-flex h-11 items-center gap-2 bg-foreground px-6 font-tech text-xs uppercase tracking-wider-2 text-background transition hover:bg-foreground/90"
                  >
                    View tournaments
                    <span aria-hidden>→</span>
                  </Link>
                  <Link
                    to="/community"
                    className="clip-cta inline-flex h-11 items-center gap-2 border border-white/15 bg-white/4 px-6 font-tech text-xs uppercase tracking-wider-2 transition hover:border-white/25 hover:bg-white/8"
                  >
                    Meet the guild
                    <span aria-hidden>→</span>
                  </Link>
                </>
              }
            />
          ) : (
            <HallOfChampionsGrid champions={champions} />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
