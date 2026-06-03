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
    refetch();
  }, [refetch]);

  const prependRegistration = useCallback((registration: MockTeam) => {
    setRegistrations((prev) => [registration, ...prev]);
  }, []);

  return { registrations, isLoading, error, refetch, prependRegistration };
}
