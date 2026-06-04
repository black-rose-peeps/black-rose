export type MemberRole = "User" | "Admin" | "Moderator";
export type MemberStatus = "Active" | "Suspended";

export interface AdminMember {
  id: string;
  username: string;
  discordUsername: string;
  discordId?: string | null;
  role: MemberRole;
  status: MemberStatus;
  registeredAt: string; // "YYYY-MM-DD"
  createdAt: string;
}

export interface CreateMemberFormValues {
  username: string;
  discordUsername: string;
  discordId: string;
  role: MemberRole;
}

export interface CreateMemberInput {
  username: string;
  discordUsername: string;
  discordId?: string;
  role: MemberRole;
}
