/** Public profile URL slug — falls back to username when no profile row slug exists. */
export function resolveMemberProfileSlug(
  slug: string | null | undefined,
  fallbackUsername: string,
): string {
  const trimmed = slug?.trim();
  return trimmed || fallbackUsername;
}
