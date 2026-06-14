import { useCallback, useEffect, useRef, useState } from "react";
import {
  memberCanRequestCaptainRegistration,
  memberCanUseCaptainRegistration,
} from "@/features/tournaments/services/tournament-registration-requests.service";
import {
  fetchMemberRegistrationStatusForTournament,
  type CaptainTournamentRegistrationStatus,
} from "@/features/tournaments/services/team-registration.service";
import { RegisterNowButtonSkeleton } from "./SelectTeamRegistrationSkeleton";
import {
  TournamentCaptainRegister,
  TournamentRegisterCreateTeamCTA,
  TournamentRegistrationStatusBadge,
} from "./TournamentCaptainRegister";
import { TournamentMemberRegisterRequest } from "./TournamentMemberRegisterRequest";

interface TournamentRegisterCTAProps {
  tournamentId: string;
  tournamentName: string;
  tournamentGame: string;
  memberId: string;
  onRegistered?: () => void;
}

type RegisterMode = "loading" | "entered" | "captain" | "member" | "create-team";

export function TournamentRegisterCTA({
  tournamentId,
  tournamentName,
  tournamentGame,
  memberId,
  onRegistered,
}: TournamentRegisterCTAProps) {
  const [mode, setMode] = useState<RegisterMode>("loading");
  const [enteredStatus, setEnteredStatus] =
    useState<CaptainTournamentRegistrationStatus>("none");
  const requestIdRef = useRef(0);

  const resolveMode = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const registrationStatus = await fetchMemberRegistrationStatusForTournament(
        memberId,
        tournamentId,
      );
      if (requestId !== requestIdRef.current) return;
      if (registrationStatus !== "none") {
        setEnteredStatus(registrationStatus);
        setMode("entered");
        return;
      }

      const [canCaptain, canMember] = await Promise.all([
        memberCanUseCaptainRegistration(memberId, tournamentId),
        memberCanRequestCaptainRegistration(memberId, tournamentId, tournamentGame),
      ]);
      if (requestId !== requestIdRef.current) return;
      if (canCaptain) {
        setMode("captain");
      } else if (canMember) {
        setMode("member");
      } else {
        setMode("create-team");
      }
    } catch (err) {
      console.warn("[tournaments] Failed to resolve register CTA mode:", err);
      if (requestId !== requestIdRef.current) return;
      setMode("create-team");
    }
  }, [memberId, tournamentId, tournamentGame]);

  useEffect(() => {
    setMode("loading");
    void resolveMode();
  }, [resolveMode]);

  if (mode === "loading") {
    return <RegisterNowButtonSkeleton />;
  }

  if (mode === "entered") {
    return <TournamentRegistrationStatusBadge status={enteredStatus} />;
  }

  if (mode === "captain") {
    return (
      <TournamentCaptainRegister
        tournamentId={tournamentId}
        tournamentName={tournamentName}
        tournamentGame={tournamentGame}
        memberId={memberId}
        onRegistered={onRegistered}
      />
    );
  }

  if (mode === "member") {
    return (
      <TournamentMemberRegisterRequest
        tournamentId={tournamentId}
        tournamentName={tournamentName}
        tournamentGame={tournamentGame}
        memberId={memberId}
      />
    );
  }

  return <TournamentRegisterCreateTeamCTA />;
}
