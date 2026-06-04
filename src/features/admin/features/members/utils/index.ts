import type {
  AdminMember,
  CreateMemberFormValues,
  CreateMemberInput,
  MemberStatus,
} from "../types";

export function validateCreateMemberForm(
  values: CreateMemberFormValues,
  existingMembers: AdminMember[],
): Partial<Record<keyof CreateMemberFormValues, string>> {
  const errors: Partial<Record<keyof CreateMemberFormValues, string>> = {};

  if (!values.username.trim()) {
    errors.username = "Username is required.";
  } else if (
    existingMembers.some((m) => m.username.toLowerCase() === values.username.toLowerCase())
  ) {
    errors.username = "Username is already taken.";
  }

  if (!values.discordUsername.trim()) {
    errors.discordUsername = "Discord username is required.";
  } else if (
    existingMembers.some(
      (m) => m.discordUsername.toLowerCase() === values.discordUsername.toLowerCase(),
    )
  ) {
    errors.discordUsername = "Discord username is already registered.";
  }

  if (values.discordId && !/^\d{17,20}$/.test(values.discordId)) {
    errors.discordId = "Discord ID must be a 17–20 digit number.";
  }

  if (values.role === "Admin") {
    if (!values.password) {
      errors.password = "Password is required for Admin accounts.";
    } else if (values.password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }
    if (!values.confirmPassword) {
      errors.confirmPassword = "Please confirm the password.";
    } else if (values.password !== values.confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
  }

  return errors;
}

export function hasFormErrors(
  errors: Partial<Record<keyof CreateMemberFormValues, string>>,
): boolean {
  return Object.values(errors).some(Boolean);
}

export function formValuesToCreateInput(values: CreateMemberFormValues): CreateMemberInput {
  return {
    username: values.username.trim(),
    discordUsername: values.discordUsername.trim(),
    discordId: values.discordId.trim() || undefined,
    role: values.role,
    password: values.role === "Admin" ? values.password : undefined,
  };
}

export function rowToAdminMember(row: Record<string, unknown>): AdminMember {
  return {
    id: row.id as string,
    username: row.username as string,
    discordUsername: row.discord_username as string,
    discordId: row.discord_id as string | null,
    role: row.role as AdminMember["role"],
    status: row.status as AdminMember["status"],
    registeredAt: row.registered_at as string,
    createdAt: row.created_at as string,
  };
}

export function buildAdminMemberFromInput(input: CreateMemberInput): AdminMember {
  return {
    id: crypto.randomUUID(),
    username: input.username,
    discordUsername: input.discordUsername,
    discordId: input.discordId ?? null,
    role: input.role,
    status: "Active",
    registeredAt: new Date().toISOString().split("T")[0],
    createdAt: new Date().toISOString(),
  };
}

export function mapMockUserToAdminMember(user: {
  id: string;
  username: string;
  discordUsername: string;
  discordId?: string;
  role: AdminMember["role"];
  status: AdminMember["status"];
  registeredAt: string;
  createdAt: string;
}): AdminMember {
  return {
    id: user.id,
    username: user.username,
    discordUsername: user.discordUsername,
    discordId: user.discordId ?? null,
    role: user.role,
    status: user.status,
    registeredAt: user.registeredAt,
    createdAt: user.createdAt,
  };
}

export function memberStatusBadgeVariant(
  status: MemberStatus,
): "default" | "destructive" | "outline" | "secondary" {
  switch (status) {
    case "Active":
      return "default";
    case "Suspended":
      return "destructive";
    default:
      return "secondary";
  }
}
