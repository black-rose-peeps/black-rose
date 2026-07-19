import { useCallback, useEffect, useState } from "react";
import { fetchPalworldPlayers } from "../functions/palworld-players.functions";
import type { PalworldPlayer } from "../types";

const POLL_INTERVAL_MS = 60_000;

export interface UsePalworldPlayersResult {
  players: PalworldPlayer[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
}

export function usePalworldPlayers(serverId: string): UsePalworldPlayersResult {
  const [players, setPlayers] = useState<PalworldPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refetch = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setIsLoading(true);
      setError(null);
      try {
        const result = await fetchPalworldPlayers({ data: { serverId } });
        setPlayers(result.players);
        setLastUpdated(new Date(result.fetchedAt));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load player list.");
      } finally {
        if (!options?.silent) setIsLoading(false);
      }
    },
    [serverId],
  );

  useEffect(() => {
    void refetch();
    const interval = setInterval(() => void refetch({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refetch]);

  return { players, isLoading, error, lastUpdated, refetch };
}
