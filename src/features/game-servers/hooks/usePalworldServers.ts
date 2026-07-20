import { useCallback, useEffect, useState } from "react";
import { fetchPalworldServers } from "../functions/palworld-status.functions";
import type { PalworldServerStatus } from "../types";

/** Poll interval in ms — 60 s is polite for a game server REST API */
const POLL_INTERVAL_MS = 60_000;

export interface UsePalworldServersResult {
  servers: PalworldServerStatus[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export function usePalworldServers(): UsePalworldServersResult {
  const [servers, setServers] = useState<PalworldServerStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refetch = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setIsLoading(true);
    setError(null);
    try {
      const result = await fetchPalworldServers();
      setServers(result.servers);
      setLastUpdated(new Date(result.fetchedAt));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load server status.");
    } finally {
      if (!options?.silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();

    const interval = setInterval(() => {
      void refetch({ silent: true });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [refetch]);

  return { servers, isLoading, error, refetch, lastUpdated };
}
