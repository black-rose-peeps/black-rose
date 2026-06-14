import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchMemberTeamsForTournamentRequest,
  memberCanUseCaptainRegistration,
} from "@/features/tournaments/services/tournament-registration-requests.service";
import { RegisterNowButtonSkeleton } from "./SelectTeamRegistrationSkeleton";
import { RequestTournamentRegistrationDialog } from "./RequestTournamentRegistrationDialog";

interface TournamentMemberRegisterRequestProps {
  tournamentId: string;
  tournamentName: string;
  tournamentGame: string;
  memberId: string;
}

export function TournamentMemberRegisterRequest({
  tournamentId,
  tournamentName,
  tournamentGame,
  memberId,
}: TournamentMemberRegisterRequestProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasEligibleTeam, setHasEligibleTeam] = useState(false);
  const requestIdRef = useRef(0);

  const loadStatus = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const isCaptain = await memberCanUseCaptainRegistration(memberId, tournamentId);
      if (requestId !== requestIdRef.current) return;
      if (isCaptain) {
        setHasEligibleTeam(false);
        return;
      }

      const entries = await fetchMemberTeamsForTournamentRequest(
        memberId,
        tournamentId,
        tournamentGame,
      );
      if (requestId !== requestIdRef.current) return;
      setHasEligibleTeam(entries.length > 0);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setHasEligibleTeam(false);
    } finally {
      if (requestId === requestIdRef.current) setInitialLoading(false);
    }
  }, [memberId, tournamentId, tournamentGame]);

  useEffect(() => {
    setInitialLoading(true);
    void loadStatus();
  }, [loadStatus]);

  if (initialLoading) {
    return <RegisterNowButtonSkeleton />;
  }

  if (!hasEligibleTeam) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="clip-cta inline-flex h-12 items-center gap-3 bg-white px-8 font-tech text-sm uppercase tracking-wider-2 text-black transition hover:bg-white/90"
      >
        Register Now <span aria-hidden>→</span>
      </button>

      <RequestTournamentRegistrationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tournamentId={tournamentId}
        tournamentName={tournamentName}
        tournamentGame={tournamentGame}
        memberId={memberId}
        onRequested={() => {
          void loadStatus();
        }}
      />
    </>
  );
}
