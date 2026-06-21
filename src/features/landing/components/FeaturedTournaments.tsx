import { Link } from "@tanstack/react-router";
import { useTournamentList } from "@/features/tournaments/hooks";
import { TournamentShowcaseCard } from "@/features/tournaments/components/TournamentShowcaseCard";
import { pickSpotlightTournaments } from "@/features/tournaments/utils/tournament-display";
import { ArenaEmptyState } from "@/features/shared/components/ArenaEmptyState";
import { DISCORD_SERVER_INVITE } from "@/features/auth/constants";
import { SectionHeading } from "./SectionHeading";
import { Skeleton } from "@/components/ui/skeleton";

function FeaturedTournamentsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="clip-angle-lg flex flex-col border border-white/[0.08] bg-card">
          <Skeleton className="h-40 rounded-none bg-white/5 sm:h-52" />
          <div className="flex flex-col gap-3 p-4 sm:gap-4 sm:p-6">
            <Skeleton className="h-3 w-24 rounded-none bg-white/5" />
            <Skeleton className="h-8 w-3/4 rounded-none bg-white/5" />
            <Skeleton className="h-16 w-full rounded-none bg-white/5" />
            <Skeleton className="h-11 w-full rounded-none bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeaturedTournaments() {
  const { tournaments, isLoading } = useTournamentList();
  const spotlight = pickSpotlightTournaments(tournaments, 3);

  return (
    <section
      id="tournaments"
      className="relative overflow-hidden border-t border-border bg-background py-24 md:py-32"
    >
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-linear-to-b from-white/[0.025] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-card/60 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mb-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="Compete Now"
            title="Open Events"
            description="Live and registration-open tournaments from the Black Rose calendar. Lock in your roster before slots fill."
            className="mb-0"
          />
          <Link
            to="/tournaments"
            className="self-start font-semibold text-xs font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground md:self-end"
          >
            View all tournaments →
          </Link>
        </div>

        {isLoading ? (
          <FeaturedTournamentsSkeleton />
        ) : spotlight.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
            {spotlight.map((tournament) => (
              <TournamentShowcaseCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        ) : (
          <ArenaEmptyState
            compact
            eyebrow="Calendar Clear"
            title={
              <>
                No events <span className="text-stroke">live yet.</span>
              </>
            }
            description="Registration and live brackets will appear here when the next Black Rose season opens. Join Discord for announcements or browse the full tournament directory."
            actions={
              <>
                <a
                  href={DISCORD_SERVER_INVITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="clip-cta inline-flex h-11 items-center gap-2 bg-foreground px-6 font-tech text-xs uppercase tracking-wider-2 text-background transition hover:bg-foreground/90"
                >
                  Join Discord
                  <span aria-hidden>→</span>
                </a>
                <Link
                  to="/tournaments"
                  className="clip-cta inline-flex h-11 items-center gap-2 border border-white/15 bg-white/4 px-6 font-tech text-xs uppercase tracking-wider-2 transition hover:border-white/25 hover:bg-white/8"
                >
                  Browse directory
                  <span aria-hidden>→</span>
                </Link>
              </>
            }
          />
        )}
      </div>
    </section>
  );
}
