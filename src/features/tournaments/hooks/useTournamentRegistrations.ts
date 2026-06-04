import { useCallback, useEffect, useState } from "react";
import { fetchTournamentRegistrations } from "../services";
import type { MockTeam } from "@/lib/mock-data";

export function useTournamentRegistrations(tournamentId: string) {
  const [registrations, setRegistrations] = useState<MockTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTournamentRegistrations(tournamentId);
      // Public side shows only approved registrations
      setRegistrations(data.filter((r) => r.status === "Approved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams.");
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
          setRegistrations(data.filter((r) => r.status === "Approved"));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load teams.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  return { registrations, isLoading, error, refetch };
}
