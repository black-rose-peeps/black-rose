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

// Global ref to track if subscription is already set up
const isSubscribedRef = { current: false };

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
    // Only set up subscription once globally
    if (isSubscribedRef.current) return;

    const debouncedRefetch = createDebouncedRefetch(
      () => queryClient.invalidateQueries({ queryKey: TOURNAMENTS_QUERY_KEY }),
      3000,
    );

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("tournaments-public-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, () => {
        debouncedRefetch();
      })
      .subscribe();

    isSubscribedRef.current = true;

    return () => {
      debouncedRefetch.cancel();
      supabase.removeChannel(channel);
      isSubscribedRef.current = false;
    };
  }, [queryClient]);

  return {
    tournaments: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
