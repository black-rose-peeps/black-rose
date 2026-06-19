import { refreshMemberSession } from "../functions/refresh-member-session";
import type { RefreshMemberSessionResult } from "../functions/refresh-member-session";
import { getSession, setSession } from "../store/session";
import type { AppUser } from "../types";
import { applyMemberAccessToSession, applyVerificationToSession } from "../utils/session";

function isDevServerFnRaceError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("Invalid server function ID");
}

async function fetchMemberSession(memberId: string): Promise<RefreshMemberSessionResult> {
  const maxAttempts = import.meta.env.DEV ? 3 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await refreshMemberSession({ data: { memberId } });
    } catch (err) {
      const canRetry =
        import.meta.env.DEV && isDevServerFnRaceError(err) && attempt < maxAttempts - 1;
      if (canRetry) {
        await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }

  // maxAttempts is always >= 1; loop returns or throws above — this satisfies TypeScript.
  throw new Error("Could not refresh member session.");
}

/** Refresh the browser session from the members table (verification status, username). */
export async function syncSessionFromDatabase(): Promise<AppUser | null> {
  if (typeof window === "undefined") {
    return getSession();
  }

  const session = getSession();
  if (!session) return null;

  const result = await fetchMemberSession(session.id);
  const updated = applyVerificationToSession(session, {
    username: result.username,
    discordUsername: result.discordUsername,
    displayName: result.displayName,
    profileSlug: result.profileSlug,
    avatarUrl: result.avatarUrl,
    discordId: result.discordId,
    status: result.status,
    registeredAt: result.registeredAt,
  });

  setSession(updated);
  return updated;
}

/** Refresh verification/access fields only — does not overwrite profile display fields. */
export async function syncMemberAccessFromDatabase(): Promise<AppUser | null> {
  if (typeof window === "undefined") {
    return getSession();
  }

  const session = getSession();
  if (!session) return null;

  const result = await fetchMemberSession(session.id);
  const updated = applyMemberAccessToSession(session, {
    username: result.username,
    discordUsername: result.discordUsername,
    discordId: result.discordId,
    status: result.status,
    registeredAt: result.registeredAt,
  });

  setSession(updated);
  return updated;
}
