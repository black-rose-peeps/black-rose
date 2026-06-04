import { Trophy } from "lucide-react";
import { TournamentCard } from "./TournamentCard";
import { getPublicTournaments } from "../utils";
import type { MockTournament } from "@/lib/mock-data";

// Accept the wider MockTournament shape (which may include "Draft").
// Internally we filter to public-only statuses before rendering cards so
// STATUS_CONFIG / CTA_LABEL / CTA_STYLE never receive an unhandled "Draft" value.
interface TournamentGridProps {
  tournaments: MockTournament[];
}

export function TournamentGrid({ tournaments }: TournamentGridProps) {
  // Narrow to public statuses — removes Draft and gives us Tournament["status"]
  const publicTournaments = getPublicTournaments(tournaments);

  if (publicTournaments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 border border-white/6 bg-white/2 py-24 text-center">
        <Trophy className="h-8 w-8 text-muted-foreground/30" />
        <p className="font-display text-xl tracking-display text-muted-foreground/60">
          No Tournaments Found
        </p>
        <p className="text-sm text-muted-foreground/40">Try adjusting the filters above.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {publicTournaments.map((t) => (
        <TournamentCard key={t.id} tournament={t} />
      ))}
    </div>
  );
}
