import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchMemberChampionships } from "@/features/championships/services/championship.service";
import { fetchMemberProfileById } from "@/features/member/services/member-profile.service";
import { tryGetAppQueryClient } from "@/lib/app-query";
import { queryKeys } from "@/lib/query-keys";
import { MEMBER_READ_QUERY_OPTIONS } from "./member-query-options";

export function memberProfileQueryOptions(memberId: string | undefined) {
  return queryOptions({
    queryKey: queryKeys.memberProfile(memberId ?? ""),
    queryFn: () => fetchMemberProfileById(memberId!),
    enabled: !!memberId,
    ...MEMBER_READ_QUERY_OPTIONS,
  });
}

export function memberChampionshipsQueryOptions(memberId: string | undefined) {
  return queryOptions({
    queryKey: queryKeys.memberChampionships(memberId ?? ""),
    queryFn: () => fetchMemberChampionships(memberId!),
    enabled: !!memberId,
    ...MEMBER_READ_QUERY_OPTIONS,
  });
}

export function useMemberProfileQuery(memberId: string | undefined) {
  return useQuery(memberProfileQueryOptions(memberId));
}

export function useMemberChampionshipsQuery(memberId: string | undefined) {
  return useQuery(memberChampionshipsQueryOptions(memberId));
}

export async function fetchMemberProfileCached(memberId: string) {
  const client = tryGetAppQueryClient();
  if (!client) return fetchMemberProfileById(memberId);
  return client.fetchQuery(memberProfileQueryOptions(memberId));
}

export function invalidateMemberProfileQuery(memberId: string): void {
  const client = tryGetAppQueryClient();
  if (!client) return;
  void client.invalidateQueries({ queryKey: queryKeys.memberProfile(memberId) });
}
