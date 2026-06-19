import type { MemberVerificationStatus } from "@/features/admin/features/members/types";
import type { AppUser } from "../types";
import { memberStatusToUserRole } from "./discord";

export interface MemberVerificationSnapshot {
  username: string;
  discordUsername: string;
  displayName: string;
  profileSlug: string | null;
  avatarUrl: string | null;
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
    discordUsername: snapshot.discordUsername,
    displayName: snapshot.displayName,
    profileSlug:
      snapshot.profileSlug === undefined ? session.profileSlug : snapshot.profileSlug,
    avatarUrl: snapshot.avatarUrl === undefined ? session.avatarUrl : snapshot.avatarUrl,
    discordId: snapshot.discordId ?? session.discordId,
    role: session.role === "admin" ? "admin" : memberStatusToUserRole(snapshot.status),
    registeredAt: snapshot.registeredAt,
  };
}

/** Background access checks — keep profile display fields from the local session. */
export function applyMemberAccessToSession(
  session: AppUser,
  snapshot: Pick<
    MemberVerificationSnapshot,
    "username" | "discordUsername" | "discordId" | "status" | "registeredAt"
  >,
): AppUser {
  return {
    ...session,
    username: snapshot.username,
    discordUsername: snapshot.discordUsername,
    discordId: snapshot.discordId ?? session.discordId,
    role: session.role === "admin" ? "admin" : memberStatusToUserRole(snapshot.status),
    registeredAt: snapshot.registeredAt,
  };
}
