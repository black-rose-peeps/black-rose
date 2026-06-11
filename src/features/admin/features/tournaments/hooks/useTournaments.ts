import { useCallback, useEffect, useState } from "react";
import { withResolvedTournamentStatus } from "@/features/tournaments/utils/tournament-status";
import { fetchTournaments } from "../services/tournaments.service";
import type { AdminTournament } from "../types";

export function useTournaments() {
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const data = await fetchTournaments();
      setTournaments(data.map((tournament) => withResolvedTournamentStatus(tournament)));
      setError(null);
    } catch (err) {
      if (!options?.silent) {
        setError(err instanceof Error ? err.message : "Failed to load tournaments.");
      }
    } finally {
      if (!options?.silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    function handleFocus() {
      void refetch({ silent: true });
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
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
