import { useCallback, useEffect, useState } from "react";
import { fetchTournaments } from "../services/tournaments.service";
import type { AdminTournament } from "../types";

export function useTournaments() {
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTournaments();
      setTournaments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tournaments.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const prependTournament = useCallback((tournament: AdminTournament) => {
    setTournaments((prev) => [tournament, ...prev]);
  }, []);

  const replaceTournament = useCallback((tournament: AdminTournament) => {
    setTournaments((prev) => prev.map((item) => (item.id === tournament.id ? tournament : item)));
  }, []);

  const removeTournament = useCallback((tournamentId: string) => {
    setTournaments((prev) => prev.filter((item) => item.id !== tournamentId));
  }, []);

  return {
    tournaments,
    isLoading,
    error,
    refetch,
    prependTournament,
    replaceTournament,
    removeTournament,
  };
}
