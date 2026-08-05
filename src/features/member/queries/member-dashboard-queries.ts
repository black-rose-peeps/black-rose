import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchMemberTournamentDashboard } from "@/features/member/services/member-dashboard.service";
import { tryGetAppQueryClient } from "@/lib/app-query";
import { queryKeys } from "@/lib/query-keys";
import { MEMBER_READ_QUERY_OPTIONS } from "./member-query-options";
import type { MockTournament } from "@/lib/mock-data";

export function memberTournamentDashboardQueryOptions(
  memberId: string | undefined,
  tournaments?: MockTournament[],
) {
  return queryOptions({
    queryKey: queryKeys.memberDashboard(memberId ?? ""),
    queryFn: () => fetchMemberTournamentDashboard(memberId!, { tournaments }),
    enabled: !!memberId,
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
