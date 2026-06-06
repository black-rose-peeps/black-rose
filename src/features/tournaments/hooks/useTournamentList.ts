import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { fetchTournaments } from "../services";
import { getPublicTournaments } from "../utils";
import type { TournamentStatus } from "../types";
import type { MockTournament } from "@/lib/mock-data";

export type PublicTournament = MockTournament & { status: TournamentStatus };

export function useTournamentList() {
  const [tournaments, setTournaments] = useState<PublicTournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const all = await fetchTournaments();
      setTournaments(getPublicTournaments(all));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tournaments.");
    } finally {
      if (!options?.silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("tournaments-public-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournaments" },
        () => {
          void refetch({ silent: true });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return { tournaments, isLoading, error, refetch };
}
