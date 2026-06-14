import { resolveMemberProfileSlug } from "@/features/member/utils/profile-slug";
import type {
  AdminMember,
  CreateMemberFormValues,
  CreateMemberInput,
  MemberVerificationStatus,
} from "../types";

const LEGACY_ACTIVE_STATUSES = new Set(["Active", "active"]);

export function normalizeMemberStatus(raw: string): MemberVerificationStatus {
  if (raw === "Verified" || raw === "Not Verified") return raw;
  if (LEGACY_ACTIVE_STATUSES.has(raw)) return "Verified";
  return "Not Verified";
}

export function validateCreateMemberForm(
  values: CreateMemberFormValues,
  existingMembers: AdminMember[],
  excludeMemberId?: string,
): Partial<Record<keyof CreateMemberFormValues, string>> {
  const errors: Partial<Record<keyof CreateMemberFormValues, string>> = {};
  const others = excludeMemberId
    ? existingMembers.filter((m) => m.id !== excludeMemberId)
    : existingMembers;

  if (!values.username.trim()) {
    errors.username = "Username is required.";
  } else if (others.some((m) => m.username.toLowerCase() === values.username.toLowerCase())) {
    errors.username = "Username is already taken.";
  }

  if (!values.discordUsername.trim()) {
    errors.discordUsername = "Discord username is required.";
  } else if (
    others.some((m) => m.discordUsername.toLowerCase() === values.discordUsername.toLowerCase())
  ) {
    errors.discordUsername = "Discord username is already registered.";
  }

  if (values.discordId && !/^\d{17,20}$/.test(values.discordId)) {
    errors.discordId = "Discord ID must be a 17–20 digit number.";
  }

  return errors;
}

export function hasFormErrors(
  errors: Partial<Record<keyof CreateMemberFormValues, string>>,
): boolean {
  return Object.values(errors).some(Boolean);
}

export function memberToFormValues(member: AdminMember): CreateMemberFormValues {
  return {
    username: member.username,
    discordUsername: member.discordUsername,
    discordId: member.discordId ?? "",
    status: member.status,
  };
}

export function formValuesToCreateInput(values: CreateMemberFormValues): CreateMemberInput {
  return {
    username: values.username.trim(),
    discordUsername: values.discordUsername.trim(),
    discordId: values.discordId.trim() || undefined,
    status: values.status,
  };
}

export function rowToAdminMember(row: Record<string, unknown>): AdminMember {
  const profiles = row.member_profiles as
    | { avatar_url?: string | null; slug?: string | null }
    | Array<{ avatar_url?: string | null; slug?: string | null }>
    | null
    | undefined;
  const profile = Array.isArray(profiles) ? profiles[0] : profiles;
  const avatarUrl = profile?.avatar_url?.trim() || null;
  const profileSlug = resolveMemberProfileSlug(profile?.slug, row.username as string);

  return {
    id: row.id as string,
    username: row.username as string,
    discordUsername: row.discord_username as string,
    discordId: row.discord_id as string | null,
    status: normalizeMemberStatus(String(row.status ?? "Not Verified")),
    registeredAt: row.registered_at as string,
    createdAt: row.created_at as string,
    avatarUrl,
    profileSlug,
  };
}

export function buildAdminMemberFromInput(input: CreateMemberInput): AdminMember {
  return {
    id: crypto.randomUUID(),
    username: input.username,
    discordUsername: input.discordUsername,
    discordId: input.discordId ?? null,
    status: input.status,
    registeredAt: new Date().toISOString().split("T")[0],
    createdAt: new Date().toISOString(),
    avatarUrl: null,
    profileSlug: input.username.trim(),
  };
}

export function memberStatusBadgeVariant(
  status: MemberVerificationStatus,
): "default" | "destructive" | "outline" | "secondary" {
  switch (status) {
    case "Verified":
      return "default";
    case "Not Verified":
      return "secondary";
    default:
      return "outline";
  }
}
