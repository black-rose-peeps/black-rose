import type { CreateMemberFormValues, MemberVerificationStatus } from "../types";

export const DEFAULT_SYNC_HOT_DAYS = 30;

export const MEMBER_VERIFICATION_STATUSES: MemberVerificationStatus[] = [
  "Not Verified",
  "Verified",
];

export const MEMBER_SYNC_QUEUE_FILTERS = [
  { value: "all", label: "All" },
  { value: "hot", label: "Hot queue" },
  { value: "cold", label: "Cold queue" },
  { value: "paused", label: "Paused" },
  { value: "backlog", label: "Backlog" },
] as const;

export const DEFAULT_CREATE_MEMBER_FORM: CreateMemberFormValues = {
  username: "",
  discordUsername: "",
  discordId: "",
  status: "Not Verified",
};
