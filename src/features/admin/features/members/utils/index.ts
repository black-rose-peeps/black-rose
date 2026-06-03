import type { MockUser } from "@/lib/mock-data";
import type { BadgeProps } from "@/components/ui/badge";
import type {
  AdminMember,
  AdminMemberStatus,
  CreateMemberFormValues,
  CreateMemberInput,
  CreateMemberFieldErrors,
} from "../types";
import { DEFAULT_MEMBER_STATUS } from "../constants";

export function normalizeDiscordUsername(value: string): string {
  return value.trim().replace(/^@/, "");
}

export function mapMockUserToAdminMember(user: MockUser): AdminMember {
  return {
    id: user.id,
    username: user.username,
    discordUsername: user.username.toLowerCase(),
    discordId: null,
    role: user.role,
    status: user.status,
    registrationDate: user.registrationDate,
    email: user.email,
  };
}

export function formValuesToCreateInput(values: CreateMemberFormValues): CreateMemberInput {
  return {
    username: values.username.trim(),
    discordUsername: normalizeDiscordUsername(values.discordUsername),
    discordId: values.discordId.trim() || undefined,
    role: values.role,
  };
}

export function buildAdminMemberFromInput(input: CreateMemberInput): AdminMember {
  return {
    id: `u-${crypto.randomUUID().slice(0, 8)}`,
    username: input.username,
    discordUsername: input.discordUsername,
    discordId: input.discordId ?? null,
    role: input.role,
    status: DEFAULT_MEMBER_STATUS,
    registrationDate: new Date().toISOString().slice(0, 10),
  };
}

export function validateCreateMemberForm(
  values: CreateMemberFormValues,
  existingMembers: AdminMember[],
): CreateMemberFieldErrors {
  const errors: CreateMemberFieldErrors = {};
  const username = values.username.trim();
  const discordUsername = normalizeDiscordUsername(values.discordUsername);
  const discordId = values.discordId.trim();

  if (!username) {
    errors.username = "Username is required.";
  } else if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
    errors.username = "Use 3–32 characters: letters, numbers, and underscores only.";
  } else if (existingMembers.some((m) => m.username.toLowerCase() === username.toLowerCase())) {
    errors.username = "This username is already taken.";
  }

  if (!discordUsername) {
    errors.discordUsername = "Discord username is required.";
  } else if (!/^[a-z0-9._]{2,32}$/i.test(discordUsername)) {
    errors.discordUsername = "Use 2–32 characters: letters, numbers, dots, and underscores.";
  } else if (
    existingMembers.some((m) => m.discordUsername.toLowerCase() === discordUsername.toLowerCase())
  ) {
    errors.discordUsername = "This Discord username is already registered.";
  }

  if (discordId && !/^\d{17,20}$/.test(discordId)) {
    errors.discordId = "Discord ID must be a 17–20 digit snowflake.";
  } else if (discordId && existingMembers.some((m) => m.discordId === discordId)) {
    errors.discordId = "This Discord ID is already linked.";
  }

  return errors;
}

export function hasFormErrors(errors: CreateMemberFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function memberStatusBadgeVariant(
  status: AdminMemberStatus,
): NonNullable<BadgeProps["variant"]> {
  switch (status) {
    case "Active":
      return "default";
    case "Suspended":
      return "secondary";
    case "Banned":
      return "destructive";
  }
}
