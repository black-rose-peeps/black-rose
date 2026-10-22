import { refreshMemberSession } from "../functions/refresh-member-session";
import type { RefreshMemberSessionResult } from "../functions/refresh-member-session";
import { refreshMemberAccess } from "../functions/refresh-member-access";
import type { RefreshMemberAccessResult } from "../functions/refresh-member-access";
import { getSession, setSession } from "../store/session";
import type { AppUser } from "../types";
import { applyMemberAccessToSession, applyVerificationToSession } from "../utils/session";

// Share only pending reads, never settled authorization or verification results.
const sessionReads = new Map<string, Promise<AppUser | null>>();
const accessReads = new Map<string, Promise<AppUser | null>>();
const refreshAfterPending = new WeakMap<Promise<unknown>, { requested: boolean }>();

function requestFreshRead(memberId: string) {
  for (const reads of [sessionReads, accessReads]) {
    const pending = reads.get(memberId);
    const refresh = pending && refreshAfterPending.get(pending);
    if (refresh) refresh.requested = true;
  }
}

function coalesceRead<T>(
  reads: Map<string, Promise<T>>,
  memberId: string,
  fetch: (memberId: string) => Promise<T>,
): Promise<T> {
  const existing = reads.get(memberId);
  if (existing) return existing;

  const refresh = { requested: false };
  const read = (async () => {
    for (;;) {
      refresh.requested = false;
      try {
        const result = await fetch(memberId);
        if (!refresh.requested) return result;
      } catch (error) {
        if (!refresh.requested) throw error;
      }
    }
  })().finally(() => {
    refreshAfterPending.delete(read);
    reads.delete(memberId);
  });
  reads.set(memberId, read);
  refreshAfterPending.set(read, refresh);
  return read;
}

function isDevServerFnRaceError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("Invalid server function ID");
}

async function fetchMemberSession(memberId: string): Promise<RefreshMemberSessionResult> {
  const maxAttempts = import.meta.env?.DEV ? 3 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await refreshMemberSession({ data: { memberId } });
    } catch (err) {
      const canRetry =
        import.meta.env?.DEV && isDevServerFnRaceError(err) && attempt < maxAttempts - 1;
      if (canRetry) {
        await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }

  throw new Error("Could not refresh member session.");
}

async function fetchMemberAccess(memberId: string): Promise<RefreshMemberAccessResult> {
  const maxAttempts = import.meta.env?.DEV ? 3 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await refreshMemberAccess({ data: { memberId } });
    } catch (err) {
      const canRetry =
        import.meta.env?.DEV && isDevServerFnRaceError(err) && attempt < maxAttempts - 1;
      if (canRetry) {
        await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }

  throw new Error("Could not refresh member access.");
}

/** Refresh the browser session from the members table (verification status, username). */
export async function syncSessionFromDatabase(
  options: { fresh?: boolean } = {},
): Promise<AppUser | null> {
  if (typeof window === "undefined") {
    return getSession();
  }

  const session = getSession();
  if (!session) return null;
  if (options.fresh) requestFreshRead(session.id);

  return coalesceRead(sessionReads, session.id, async (memberId) => {
    const beforeRead = getSession();
    if (!beforeRead || beforeRead.id !== memberId) return null;
    const result = await fetchMemberSession(memberId);
    const current = getSession();
    if (!current || current.id !== memberId) return null;

    const updated = applyVerificationToSession(current, {
      ...result,
      // A profile edit made while this read was pending is newer than its snapshot.
      displayName:
        current.displayName === beforeRead.displayName ? result.displayName : current.displayName,
      avatarUrl: current.avatarUrl === beforeRead.avatarUrl ? result.avatarUrl : current.avatarUrl,
    });

    if (current.profileSlug !== beforeRead.profileSlug) updated.profileSlug = current.profileSlug;

    setSession(updated);
    return updated;
  });
}

/** Refresh verification/access fields only — does not overwrite profile display fields. */
export async function syncMemberAccessFromDatabase(
  options: { fresh?: boolean } = {},
): Promise<AppUser | null> {
  if (typeof window === "undefined") {
    return getSession();
  }

  const session = getSession();
  if (!session) return null;
  if (options.fresh) requestFreshRead(session.id);

  return coalesceRead(accessReads, session.id, async (memberId) => {
    const beforeRead = getSession();
    if (!beforeRead || beforeRead.id !== memberId) return null;
    const result = await fetchMemberAccess(memberId);
    const current = getSession();
    if (!current || current.id !== memberId) return null;

    const updated = applyMemberAccessToSession(current, result);
    setSession(updated);
    return updated;
  });
}
