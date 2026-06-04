import { useCallback, useEffect, useState } from "react";
import { fetchTournaments } from "../services";
import { getPublicTournaments } from "../utils";
import type { TournamentStatus, TournamentGame } from "../types";
import type { MockTournament } from "@/lib/mock-data";

export type PublicTournament = MockTournament & { status: TournamentStatus };

export function useTournamentList() {
  const [tournaments, setTournaments] = useState<PublicTournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const all = await fetchTournaments();
      setTournaments(getPublicTournaments(all));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tournaments.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { tournaments, isLoading, error, refetch };
}
