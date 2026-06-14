export type MemberVerificationStatus = "Not Verified" | "Verified";

export interface AdminMember {
  id: string;
  username: string;
  discordUsername: string;
  discordId?: string | null;
  status: MemberVerificationStatus;
  registeredAt: string; // "YYYY-MM-DD"
  createdAt: string;
  avatarUrl: string | null;
  profileSlug: string | null;
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
