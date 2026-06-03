/** Admin console role — maps to `profiles.role` in Supabase. */
export type AdminMemberRole = "User" | "Tournament Admin" | "Super Admin";

/** Account standing — maps to `profiles.status` in Supabase. */
export type AdminMemberStatus = "Active" | "Suspended" | "Banned";

export interface AdminMember {
  id: string;
  username: string;
  discordUsername: string;
  discordId: string | null;
  role: AdminMemberRole;
  status: AdminMemberStatus;
  registrationDate: string;
  /** Legacy/mock records only */
  email?: string | null;
}

export interface CreateMemberInput {
  username: string;
  discordUsername: string;
  discordId?: string;
  role: AdminMemberRole;
}

export interface CreateMemberFormValues {
  username: string;
  discordUsername: string;
  discordId: string;
  role: AdminMemberRole;
}

export type CreateMemberFieldErrors = Partial<Record<keyof CreateMemberFormValues, string>>;
