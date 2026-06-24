/** Shared React Query settings for member-facing reads. */
export const MEMBER_READ_QUERY_OPTIONS = {
  staleTime: 60_000,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: true,
  retry: 1,
} as const;
