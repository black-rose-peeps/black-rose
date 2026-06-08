import type { MemberVerificationStatus } from "@/features/admin/features/members/types";
import type { AppUser } from "../types";
import { memberStatusToUserRole } from "./discord";

export interface MemberVerificationSnapshot {
  username: string;
  discordId: string | null;
  status: MemberVerificationStatus;
  registeredAt: string;
}

/** Apply the latest verification fields from the database onto a browser session. */
export function applyVerificationToSession(
  session: AppUser,
  snapshot: MemberVerificationSnapshot,
): AppUser {
  return {
    ...session,
    username: snapshot.username,
    discordId: snapshot.discordId ?? session.discordId,
    role: memberStatusToUserRole(snapshot.status),
    registeredAt: snapshot.registeredAt,
  };
}
