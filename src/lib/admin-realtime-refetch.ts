import { createDebouncedRefetch, type DebouncedRefetch } from "@/lib/debounce-refetch";

type RefetchOptions = { silent?: boolean };
type RefetchFn = (options?: RefetchOptions) => Promise<void>;

const DEFAULT_DEBOUNCE_MS = 5000;
const DEFAULT_MIN_SILENT_INTERVAL_MS = 30_000;

/**
 * Debounced silent refetch for admin lists: skips hidden tabs and caps how often
 * background Realtime/focus refetches hit Supabase (multiple admins/tabs).
 */
export function createAdminSilentRefetch(
  refetch: RefetchFn,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  minSilentIntervalMs = DEFAULT_MIN_SILENT_INTERVAL_MS,
): DebouncedRefetch {
  let lastSilentRefetchAt = 0;

  const guardedRefetch: RefetchFn = async (options) => {
    if (options?.silent) {
      if (typeof document !== "undefined" && document.hidden) return;
      const now = Date.now();
      if (now - lastSilentRefetchAt < minSilentIntervalMs) return;
      lastSilentRefetchAt = now;
    }
    await refetch(options);
  };

  return createDebouncedRefetch(guardedRefetch, debounceMs);
}
