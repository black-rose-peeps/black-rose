import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArenaEmptyState } from "@/features/shared/components/ArenaEmptyState";
import { TournamentRegistrationGuide } from "./TournamentRegistrationGuide";

interface TeamsEmptyStateProps {
  onCreateTeam: () => void;
}

export function TeamsEmptyState({ onCreateTeam }: TeamsEmptyStateProps) {
  return (
    <div className="flex flex-col gap-6">
      <ArenaEmptyState
        compact
        eyebrow="No Roster"
        title={
          <>
            No teams <span className="text-stroke">yet.</span>
          </>
        }
        description="Create a team for each game you compete in, or ask a captain to invite you. You don't need a fully completed profile to get started."
        actions={
          <>
            <Button
              type="button"
              onClick={onCreateTeam}
              className="clip-cta inline-flex h-11 items-center rounded-none bg-white font-tech text-ui-readable uppercase text-black hover:bg-white/90"
            >
              <Plus className="h-4 w-4" />
              Create a Team
            </Button>
            <Button
              asChild
              variant="outline"
              className="clip-cta inline-flex h-11 items-center rounded-none border-white/15 font-tech text-ui-readable uppercase"
            >
              <Link to="/tournaments">Browse Tournaments</Link>
            </Button>
          </>
        }
      />

      <div>
        <p className="mb-3 font-tech text-label-readable uppercase text-muted-foreground">
          Tournament registration path
        </p>
        <TournamentRegistrationGuide />
        <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
          From team creation through admin approval — the full flow at a glance.
        </p>
      </div>
    </div>
  );
}
