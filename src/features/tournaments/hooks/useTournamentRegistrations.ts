import { useQuery } from "@tanstack/react-query";
import { isBracketParticipantStatus } from "@/features/admin/features/participants/constants/registration-status";
import { fetchTournamentRegistrations } from "../services";
import type { MockTeam } from "@/lib/mock-data";

function publicRegistrations(data: MockTeam[]): MockTeam[] {
  return data.filter((r) => isBracketParticipantStatus(r.status));
}

export const TOURNAMENT_REGISTRATIONS_QUERY_KEY = (tournamentId: string) =>
  ["tournament-registrations", tournamentId] as const;

export function useTournamentRegistrations(tournamentId: string) {
  const query = useQuery({
    queryKey: TOURNAMENT_REGISTRATIONS_QUERY_KEY(tournamentId),
    queryFn: async () => {
      const data = await fetchTournamentRegistrations(tournamentId);
      return publicRegistrations(data);
    },
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
  });

  return {
    registrations: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
