import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchMemberTournamentDashboard } from "@/features/member/services/member-dashboard.service";
import { tryGetAppQueryClient } from "@/lib/app-query";
import { queryKeys } from "@/lib/query-keys";
import { MEMBER_READ_QUERY_OPTIONS } from "./member-query-options";
import { TOURNAMENTS_QUERY_KEY } from "@/features/tournaments/hooks";
import type { MockTournament } from "@/lib/mock-data";

// Create a stable tournament snapshot for query key
function getTournamentSnapshot(tournaments?: MockTournament[]) {
  if (!tournaments || tournaments.length === 0) return "empty";
  // Use sorted tournament IDs for stable representation
  const sortedIds = tournaments.map((t) => t.id).sort();
  return sortedIds.join(",");
}

export function memberTournamentDashboardQueryOptions(
  memberId: string | undefined,
  tournaments?: MockTournament[],
) {
  const tournamentSnapshot = getTournamentSnapshot(tournaments);
  return queryOptions({
    queryKey: [
      ...queryKeys.memberDashboard(memberId ?? ""),
      TOURNAMENTS_QUERY_KEY,
      tournamentSnapshot,
    ],
    queryFn: () => fetchMemberTournamentDashboard(memberId!, { tournaments }),
    enabled: !!memberId && !!tournaments && tournaments.length > 0,
    ...MEMBER_READ_QUERY_OPTIONS,
  });
}

export function useMemberTournamentDashboardQuery(
  memberId: string | undefined,
  tournaments?: MockTournament[],
) {
  return useQuery(memberTournamentDashboardQueryOptions(memberId, tournaments));
}

export async function fetchMemberTournamentDashboardCached(
  memberId: string,
  tournaments?: MockTournament[],
) {
  const client = tryGetAppQueryClient();
  if (!client) return fetchMemberTournamentDashboard(memberId, { tournaments });
  return client.fetchQuery(memberTournamentDashboardQueryOptions(memberId, tournaments));
}
