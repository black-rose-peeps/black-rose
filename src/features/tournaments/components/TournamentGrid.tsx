import { Link } from "@tanstack/react-router";
import { TournamentCard } from "./TournamentCard";
import { getPublicTournaments } from "../utils";
import { ArenaEmptyState } from "@/features/shared/components/ArenaEmptyState";
import type { CaptainTournamentRegistrationStatus } from "../services/team-registration.service";
import type { MockTournament } from "@/lib/mock-data";

export type TournamentGridEmptyReason = "empty" | "filtered";

// Accept the wider MockTournament shape (which may include "Draft").
// Internally we filter to public-only statuses before rendering cards so
// STATUS_CONFIG / CTA_LABEL / CTA_STYLE never receive an unhandled "Draft" value.
interface TournamentGridProps {
  tournaments: MockTournament[];
  captainRegistrationByTournament?: Map<string, CaptainTournamentRegistrationStatus>;
  captainRegistrationLoading?: boolean;
  emptyReason?: TournamentGridEmptyReason;
}

export function TournamentGrid({
  tournaments,
  captainRegistrationByTournament,
  captainRegistrationLoading = false,
  emptyReason = "filtered",
}: TournamentGridProps) {
  // Narrow to public statuses — removes Draft and gives us Tournament["status"]
  const publicTournaments = getPublicTournaments(tournaments);

  if (publicTournaments.length === 0) {
    if (emptyReason === "empty") {
      return (
        <ArenaEmptyState
          eyebrow="Standing By"
          title={
            <>
              The arena is <span className="text-stroke">quiet.</span>
            </>
          }
          description="No tournaments have been scheduled yet. When Black Rose opens the next bracket, it will land here first — build your roster and be ready to register."
          actions={
            <Link
              to="/community"
              className="clip-cta inline-flex h-11 items-center gap-2 border border-white/15 bg-white/4 px-6 font-tech text-ui-readable uppercase transition hover:border-white/25 hover:bg-white/8"
            >
              Join the community
              <span aria-hidden>→</span>
            </Link>
          }
        />
      );
    }

    return (
      <ArenaEmptyState
        eyebrow="No Matches"
        title={
          <>
            Nothing on the <span className="text-stroke">roster.</span>
          </>
        }
        description="No tournaments match your current filters. Try a different game or status, or reset to view the full directory."
      />
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {publicTournaments.map((t) => (
        <TournamentCard
          key={t.id}
          tournament={t}
          captainRegistrationStatus={captainRegistrationByTournament?.get(t.id)}
          captainRegistrationLoading={captainRegistrationLoading}
        />
      ))}
    </div>
  );
}
