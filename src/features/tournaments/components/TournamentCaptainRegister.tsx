import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncTournamentRegistrationNotifications } from "@/features/notifications/services/tournament-registration-notifications";
import {
  fetchCaptainRegistrationStatusForTournament,
  isPendingCaptainRegistrationStatus,
  isRegisteredCaptainStatus,
  type CaptainTournamentRegistrationStatus,
} from "@/features/tournaments/services/team-registration.service";
import { RegisterNowButtonSkeleton } from "./SelectTeamRegistrationSkeleton";
import { SelectTeamRegistrationDialog } from "./SelectTeamRegistrationDialog";

interface TournamentCaptainRegisterProps {
  tournamentId: string;
  tournamentName: string;
  tournamentGame: string;
  memberId: string;
  onRegistered?: () => void;
}

export function TournamentCaptainRegister({
  tournamentId,
  tournamentName,
  tournamentGame,
  memberId,
  onRegistered,
}: TournamentCaptainRegisterProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [registrationStatus, setRegistrationStatus] =
    useState<CaptainTournamentRegistrationStatus>("none");
  const requestIdRef = useRef(0);

  const loadStatus = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const status = await fetchCaptainRegistrationStatusForTournament(
        memberId,
        tournamentId,
        tournamentGame,
      );
      if (requestId !== requestIdRef.current) return;
      setRegistrationStatus(status);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setRegistrationStatus("none");
    } finally {
      if (requestId === requestIdRef.current) setInitialLoading(false);
    }
  }, [memberId, tournamentId, tournamentGame]);

  useEffect(() => {
    setInitialLoading(true);
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    function handleFocus() {
      void loadStatus();
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadStatus]);

  return (
    <>
      {initialLoading ? (
        <RegisterNowButtonSkeleton />
      ) : isPendingCaptainRegistrationStatus(registrationStatus) ? (
        <div className="inline-flex h-12 items-center gap-3 border border-amber-400/30 bg-amber-400/10 px-8 font-tech text-sm uppercase tracking-wider-2 text-amber-300">
          Registration pending admin approval
        </div>
      ) : isRegisteredCaptainStatus(registrationStatus) ? (
        <div className="inline-flex h-12 items-center gap-2 border border-emerald-400/30 bg-emerald-400/10 px-8 font-tech text-sm uppercase tracking-wider-2 text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          Registered
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="clip-cta inline-flex h-12 items-center gap-3 bg-white px-8 font-tech text-sm uppercase tracking-wider-2 text-black transition hover:bg-white/90"
        >
          Register Now <span aria-hidden>→</span>
        </button>
      )}

      <SelectTeamRegistrationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tournamentId={tournamentId}
        tournamentName={tournamentName}
        tournamentGame={tournamentGame}
        captainUserId={memberId}
        onRegistered={() => {
          setRegistrationStatus("pending");
          void syncTournamentRegistrationNotifications(memberId);
          onRegistered?.();
        }}
      />
    </>
  );
}

/** Shown when the user is logged in but has no captain teams yet. */
export function TournamentRegisterCreateTeamCTA() {
  return (
    <Button
      asChild
      className="clip-cta h-12 rounded-none bg-white px-8 font-tech text-sm uppercase tracking-wider-2 text-black hover:bg-white/90"
    >
      <Link to="/teams/create">
        <Trophy className="h-4 w-4" />
        Create a Team to Register
      </Link>
    </Button>
  );
}
