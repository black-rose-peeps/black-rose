import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPalworldServerDetail } from "../functions/palworld-detail.functions";
import type { PalworldServerDetail } from "../types";

const POLL_INTERVAL_MS = 60_000;

export interface UsePalworldServerDetailResult {
  server: PalworldServerDetail | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export function usePalworldServerDetail(serverId: string): UsePalworldServerDetailResult {
  const [server, setServer] = useState<PalworldServerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Track which serverId is currently active so older in-flight responses
  // cannot overwrite state after Route.useParams().id changes.
  const activeServerIdRef = useRef(serverId);

  const refetch = useCallback(
    async (options?: { silent?: boolean }) => {
      const currentServerId = serverId;
      activeServerIdRef.current = currentServerId;

      if (!options?.silent) setIsLoading(true);
      setError(null);
      try {
        const result = await fetchPalworldServerDetail({ data: { serverId: currentServerId } });
        if (activeServerIdRef.current !== currentServerId) return;
        setServer(result as PalworldServerDetail);
        setLastUpdated(new Date());
      } catch (err) {
        if (activeServerIdRef.current !== currentServerId) return;
        setError(err instanceof Error ? err.message : "Failed to load server detail.");
      } finally {
        if (activeServerIdRef.current === currentServerId && !options?.silent) {
          setIsLoading(false);
        }
      }
    },
    [serverId],
  );

  useEffect(() => {
    void refetch();
    const interval = setInterval(() => void refetch({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refetch]);

  return { server, isLoading, error, refetch, lastUpdated };
}
