import { useCallback, useEffect, useRef, useState } from "react";
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

export function usePalworldPlayers(
  serverId: string,
  memberId: string | undefined,
): UsePalworldPlayersResult {
  const [players, setPlayers] = useState<PalworldPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Track the serverId that is currently being fetched so stale responses
  // from a previous serverId cannot overwrite state after serverId changes.
  const activeServerIdRef = useRef(serverId);

  const refetch = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!memberId) return; // unauthenticated — nothing to fetch
      const currentServerId = serverId;
      activeServerIdRef.current = currentServerId;

      if (!options?.silent) setIsLoading(true);
      setError(null);
      try {
        const result = await fetchPalworldPlayers({
          data: { serverId: currentServerId, memberId },
        });
        // Discard if a newer request for a different serverId has since started
        if (activeServerIdRef.current !== currentServerId) return;
        setPlayers(result.players);
        setLastUpdated(new Date(result.fetchedAt));
      } catch (err) {
        if (activeServerIdRef.current !== currentServerId) return;
        setError(err instanceof Error ? err.message : "Failed to load player list.");
      } finally {
        if (activeServerIdRef.current === currentServerId && !options?.silent) {
          setIsLoading(false);
        }
      }
    },
    [serverId, memberId],
  );

  useEffect(() => {
    // Reset state when the server changes so stale data is never shown
    setPlayers([]);
    setError(null);
    setLastUpdated(null);

    void refetch();
    const interval = setInterval(() => void refetch({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refetch]);

  return { players, isLoading, error, lastUpdated, refetch };
}
