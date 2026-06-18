import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { createDebouncedRefetch } from "@/lib/debounce-refetch";
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

  const debouncedRefetch = useMemo(
    () => createDebouncedRefetch(refetch, 3000),
    [refetch],
  );

  useEffect(() => {
    void refetch();

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("admin-tournaments-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, () => {
        debouncedRefetch({ silent: true });
      })
      .subscribe();

    function handleFocus() {
      debouncedRefetch({ silent: true });
    }
    window.addEventListener("focus", handleFocus);

    return () => {
      debouncedRefetch.cancel();
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refetch, debouncedRefetch]);

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
