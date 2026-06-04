export type MemberRole = "User" | "Admin";
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
  /** Required only when role is "Admin". */
  password: string;
  confirmPassword: string;
}

export interface CreateMemberInput {
  username: string;
  discordUsername: string;
  discordId?: string;
  role: MemberRole;
  /** Plain-text password — stored as a console credential when role is "Admin". */
  password?: string;
}
