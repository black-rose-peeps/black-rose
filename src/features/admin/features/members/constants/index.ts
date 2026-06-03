import type { AdminMemberRole, AdminMemberStatus, CreateMemberFormValues } from "../types";

export const ADMIN_MEMBER_ROLES: AdminMemberRole[] = ["User", "Tournament Admin", "Super Admin"];

export const DEFAULT_MEMBER_STATUS: AdminMemberStatus = "Active";

export const DEFAULT_CREATE_MEMBER_FORM: CreateMemberFormValues = {
  username: "",
  discordUsername: "",
  discordId: "",
  role: "User",
};
