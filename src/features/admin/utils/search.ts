/** Case-insensitive match when query is non-empty; empty query matches all. */
export function matchesAdminSearch(query: string, ...fields: (string | null | undefined)[]): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return fields.some((field) => field?.toLowerCase().includes(normalized));
}
