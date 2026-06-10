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
  const fetchIdRef = useRef(0);

  const refetch = useCallback(async () => {
    if (!memberId) {
      fetchIdRef.current += 1;
      setRegistrationByTournament(new Map());
      setIsLoading(false);
      hasLoadedRef.current = false;
      return;
    }

    const fetchId = ++fetchIdRef.current;
    if (!hasLoadedRef.current) setIsLoading(true);

    try {
      const map = await fetchCaptainTournamentRegistrationMap(memberId);
      if (fetchId !== fetchIdRef.current) return;
      setRegistrationByTournament(map);
      hasLoadedRef.current = true;
    } catch {
      if (fetchId !== fetchIdRef.current) return;
      if (!hasLoadedRef.current) {
        setRegistrationByTournament(new Map());
      }
    } finally {
      if (fetchId === fetchIdRef.current) setIsLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchIdRef.current += 1;
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
