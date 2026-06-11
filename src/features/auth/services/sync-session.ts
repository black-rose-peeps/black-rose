import { refreshMemberSession } from "../functions/refresh-member-session";
import { getSession, setSession } from "../store/session";
import type { AppUser } from "../types";
import { applyVerificationToSession } from "../utils/session";

/** Refresh the browser session from the members table (verification status, username). */
export async function syncSessionFromDatabase(): Promise<AppUser | null> {
  const session = getSession();
  if (!session) return null;

  const result = await refreshMemberSession({ data: { memberId: session.id } });
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
