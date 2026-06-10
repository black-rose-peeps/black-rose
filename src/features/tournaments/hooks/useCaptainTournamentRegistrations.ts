import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchCaptainTournamentRegistrationMap,
  type CaptainTournamentRegistrationStatus,
} from "../services/team-registration.service";

export function useCaptainTournamentRegistrations(memberId: string | undefined) {
  const [registrationByTournament, setRegistrationByTournament] = useState<
    Map<string, CaptainTournamentRegistrationStatus>
  >(new Map());
  const [isLoading, setIsLoading] = useState(Boolean(memberId));
  const hasLoadedRef = useRef(false);

  const refetch = useCallback(async () => {
    if (!memberId) {
      setRegistrationByTournament(new Map());
      setIsLoading(false);
      hasLoadedRef.current = false;
      return;
    }

    if (!hasLoadedRef.current) setIsLoading(true);

    try {
      const map = await fetchCaptainTournamentRegistrationMap(memberId);
      setRegistrationByTournament(map);
      hasLoadedRef.current = true;
    } catch {
      if (!hasLoadedRef.current) {
        setRegistrationByTournament(new Map());
      }
    } finally {
      setIsLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    hasLoadedRef.current = false;
    setRegistrationByTournament(new Map());
    if (memberId) setIsLoading(true);
    void refetch();
  }, [memberId, refetch]);

  useEffect(() => {
    if (!memberId) return;

    function handleFocus() {
      void refetch();
    }

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [memberId, refetch]);

  return { registrationByTournament, isLoading, refetch };
}
