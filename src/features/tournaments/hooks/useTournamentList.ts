import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import { createDebouncedRefetch } from "@/lib/debounce-refetch";
import { fetchTournaments } from "../services";
import { getPublicTournaments } from "../utils";
import type { TournamentStatus } from "../types";
import type { MockTournament } from "@/lib/mock-data";

export type PublicTournament = MockTournament & { status: TournamentStatus };

export const TOURNAMENTS_QUERY_KEY = ["tournaments"] as const;

// Reference-counted subscription lifecycle
let subscriptionCount = 0;
let channel: ReturnType<ReturnType<typeof getSupabaseClient>["channel"]> | null = null;
let debouncedRefetch: ReturnType<typeof createDebouncedRefetch> | null = null;

export function useTournamentList() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: TOURNAMENTS_QUERY_KEY,
    queryFn: async () => {
      const all = await fetchTournaments();
      return getPublicTournaments(all);
    },
    staleTime: 30_000, // 30 seconds - tournaments change frequently
    gcTime: 5 * 60_000, // 5 minutes
  });

  useEffect(() => {
    subscriptionCount++;

    // Set up subscription on first mount
    if (subscriptionCount === 1) {
      debouncedRefetch = createDebouncedRefetch(
        () => queryClient.invalidateQueries({ queryKey: TOURNAMENTS_QUERY_KEY }),
        3000,
      );

      const supabase = getSupabaseClient();
      channel = supabase
        .channel("tournaments-public-list")
        .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, () => {
          debouncedRefetch?.();
        })
        .subscribe();
    }

    return () => {
      subscriptionCount--;

      // Clean up subscription when last instance unmounts
      if (subscriptionCount === 0) {
        debouncedRefetch?.cancel();
        if (channel) {
          const supabase = getSupabaseClient();
          supabase.removeChannel(channel);
          channel = null;
        }
        debouncedRefetch = null;
      }
    };
  }, [queryClient]);

  return {
    tournaments: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
