import type { CreateMemberFormValues, MemberRole } from "../types";

export const ADMIN_MEMBER_ROLES: MemberRole[] = ["User", "Admin", "Moderator"];

export const DEFAULT_CREATE_MEMBER_FORM: CreateMemberFormValues = {
  username: "",
  discordUsername: "",
  discordId: "",
  role: "User",
};
