export type MemberVerificationStatus = "Not Verified" | "Verified";

/** Discord sync Worker queue tier for Not Verified members. */
export type MemberSyncQueueTier = "hot" | "cold" | "paused";

export type MemberSyncQueueFilter = "all" | MemberSyncQueueTier | "backlog";

export interface AdminMember {
  id: string;
  username: string;
  /** Discord display name from profile (global name), falls back to username. */
  displayName: string;
  discordUsername: string;
  discordId?: string | null;
  status: MemberVerificationStatus;
  registeredAt: string; // "YYYY-MM-DD"
  createdAt: string;
  avatarUrl: string | null;
  profileSlug: string;
  /** Consecutive Discord guild 404s from the sync Worker. */
  discordNotInGuildStrikes: number;
  /** When set, the sync Worker skips this member until unpause or guild recovery. */
  discordSyncPausedAt: string | null;
}

export interface CreateMemberFormValues {
  username: string;
  discordUsername: string;
  discordId: string;
  status: MemberVerificationStatus;
}

export interface CreateMemberInput {
  username: string;
  discordUsername: string;
  discordId?: string;
  status: MemberVerificationStatus;
}
