import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchMemberTournamentDashboard } from "@/features/member/services/member-dashboard.service";
import { tryGetAppQueryClient } from "@/lib/app-query";
import { queryKeys } from "@/lib/query-keys";
import { MEMBER_READ_QUERY_OPTIONS } from "./member-query-options";

export function memberTournamentDashboardQueryOptions(memberId: string | undefined) {
  return queryOptions({
    queryKey: queryKeys.memberDashboard(memberId ?? ""),
    queryFn: () => fetchMemberTournamentDashboard(memberId!),
    enabled: !!memberId,
    ...MEMBER_READ_QUERY_OPTIONS,
  });
}

export function useMemberTournamentDashboardQuery(memberId: string | undefined) {
  return useQuery(memberTournamentDashboardQueryOptions(memberId));
}

export async function fetchMemberTournamentDashboardCached(memberId: string) {
  const client = tryGetAppQueryClient();
  if (!client) return fetchMemberTournamentDashboard(memberId);
  return client.fetchQuery(memberTournamentDashboardQueryOptions(memberId));
}
