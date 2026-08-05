import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMemberTournamentRegistrationMap,
  type CaptainTournamentRegistrationStatus,
} from "../services/team-registration.service";

export const CAPTAIN_REGISTRATIONS_QUERY_KEY = (memberId: string | undefined) =>
  ["captain-registrations", memberId] as const;

export function useCaptainTournamentRegistrations(memberId: string | undefined) {
  const queryClient = useQueryClient();
  const hasLoadedRef = useRef(false);

  const query = useQuery({
    queryKey: CAPTAIN_REGISTRATIONS_QUERY_KEY(memberId),
    queryFn: async () => {
      if (!memberId) return new Map<string, CaptainTournamentRegistrationStatus>();
      return await fetchMemberTournamentRegistrationMap(memberId);
    },
    enabled: !!memberId,
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
  });

  useEffect(() => {
    hasLoadedRef.current = !query.isLoading;
  }, [query.isLoading]);

  useEffect(() => {
    if (!memberId) return;

    function handleFocus() {
      void query.refetch();
    }

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [memberId, query]);

  return {
    registrationByTournament: query.data ?? new Map(),
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
