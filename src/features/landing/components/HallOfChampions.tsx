"use client";

import { Link } from "@tanstack/react-router";
import { ChampionCardsSkeleton } from "@/features/championships/components/ChampionCardsSkeleton";
import { HallOfChampionsGrid } from "@/features/championships/components/HallOfChampionsGrid";
import { useHallOfChampions } from "@/features/championships/hooks/useHallOfChampions";
import { ArenaEmptyState } from "@/features/shared/components/ArenaEmptyState";
import { SectionHeading } from "./SectionHeading";

const SNEAK_PEEK_LIMIT = 3;

export function HallOfChampions() {
  const { champions, isLoading, error } = useHallOfChampions();
  const hasMore = champions.length > SNEAK_PEEK_LIMIT;

  return (
    <section
      id="champions"
      className="relative overflow-hidden border-t border-white/6 bg-background py-24 md:py-32 scroll-mt-16"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 60px)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,255,255,0.04),transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-card/50 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mb-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="03 — Legacy"
            title="Hall of Champions"
            description="A sneak peek at the teams etched into the Black Rose archive. Open the full hall for every crowned roster."
            className="mb-0"
          />
          <Link
            to="/champions"
            className="self-start text-xs font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground md:self-end"
          >
            View full archive →
          </Link>
        </div>

        {isLoading ? (
          <ChampionCardsSkeleton count={SNEAK_PEEK_LIMIT} />
        ) : error ? (
          <div className="border border-white/8 bg-card/40 px-6 py-12 text-center">
            <p className="font-display text-xl tracking-display text-white">Archive unavailable</p>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </div>
        ) : champions.length === 0 ? (
          <ArenaEmptyState
            compact
            eyebrow="Archive Sealed"
            title={
              <>
                The crown awaits its <span className="text-stroke">first name.</span>
              </>
            }
            description="Victors are filed here after each concluded tournament. Step into the arena and compete to become the first name etched in black."
            actions={
              <Link
                to="/tournaments"
                className="clip-cta inline-flex h-11 items-center gap-2 bg-foreground px-6 font-tech text-xs uppercase tracking-wider-2 text-background transition hover:bg-foreground/90"
              >
                View tournaments
                <span aria-hidden>→</span>
              </Link>
            }
          />
        ) : (
          <>
            <HallOfChampionsGrid champions={champions} limit={SNEAK_PEEK_LIMIT} />
            {hasMore && (
              <div className="mt-10 text-center">
                <Link
                  to="/champions"
                  className="clip-cta inline-flex h-11 items-center gap-2 border border-white/15 bg-white/6 px-6 font-tech text-[10px] uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
                >
                  View all {champions.length} champions
                  <span aria-hidden>→</span>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
