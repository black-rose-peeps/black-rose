import { useQuery } from "@tanstack/react-query";
import { fetchPalworldServers } from "../functions/palworld-status.functions";
import type { PalworldServerStatus } from "../types";

/** Poll interval in ms — 60 s is polite for a game server REST API */
const POLL_INTERVAL_MS = 60_000;

export const PALWORLD_SERVERS_QUERY_KEY = ["palworld-servers"] as const;

export interface UsePalworldServersResult {
  servers: PalworldServerStatus[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
  lastUpdated: Date | null;
}

export function usePalworldServers(enabled = true): UsePalworldServersResult {
  const query = useQuery({
    enabled,
    queryKey: PALWORLD_SERVERS_QUERY_KEY,
    queryFn: async () => {
      const result = await fetchPalworldServers();
      return {
        servers: result.servers,
        lastUpdated: new Date(result.fetchedAt),
      };
    },
    staleTime: POLL_INTERVAL_MS, // Data is stale after poll interval
    gcTime: 5 * 60_000, // 5 minutes
    refetchInterval: enabled ? POLL_INTERVAL_MS : false,
  });

  return {
    servers: enabled ? (query.data?.servers ?? []) : [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: async () => (enabled ? query.refetch() : undefined),
    lastUpdated: query.data?.lastUpdated ?? null,
  };
}
