import type { CreateMemberFormValues, MemberVerificationStatus } from "../types";

export const MEMBER_VERIFICATION_STATUSES: MemberVerificationStatus[] = [
  "Not Verified",
  "Verified",
];

export const DEFAULT_CREATE_MEMBER_FORM: CreateMemberFormValues = {
  username: "",
  discordUsername: "",
  discordId: "",
  status: "Not Verified",
};
