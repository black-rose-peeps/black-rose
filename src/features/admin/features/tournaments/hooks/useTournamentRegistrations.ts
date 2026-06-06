import { useCallback, useEffect, useState } from "react";
import type { MockTeam } from "@/lib/mock-data";
import { fetchTournamentRegistrations } from "../services/tournament-registrations.service";

export function useTournamentRegistrations(tournamentId: string) {
  const [registrations, setRegistrations] = useState<MockTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTournamentRegistrations(tournamentId);
      setRegistrations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load registrations.");
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchTournamentRegistrations(tournamentId);
        if (!cancelled) {
          setRegistrations(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load registrations.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  const prependRegistration = useCallback((registration: MockTeam) => {
    setRegistrations((prev) => [registration, ...prev]);
  }, []);

  const prependRegistrations = useCallback((items: MockTeam[]) => {
    if (!items.length) return;
    setRegistrations((prev) => [...items, ...prev]);
  }, []);

  const updateRegistration = useCallback((registration: MockTeam) => {
    setRegistrations((prev) =>
      prev.map((item) => (item.id === registration.id ? registration : item)),
    );
  }, []);

  const removeRegistration = useCallback((registrationId: string) => {
    setRegistrations((prev) => prev.filter((item) => item.id !== registrationId));
  }, []);

  return {
    registrations,
    isLoading,
    error,
    refetch,
    prependRegistration,
    prependRegistrations,
    updateRegistration,
    removeRegistration,
  };
}
