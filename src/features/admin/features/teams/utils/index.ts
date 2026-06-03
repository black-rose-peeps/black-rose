import type { AdminMember } from "@/features/admin/features/members/types";
import type { Team, TeamMember } from "@/features/teams/types";
import type {
  AddTeamMemberFormValues,
  AddTeamMemberInput,
  CreateTeamFieldErrors,
  CreateTeamFormValues,
  CreateTeamInput,
  AddTeamMemberFieldErrors,
} from "../types";

export function formValuesToCreateTeamInput(values: CreateTeamFormValues): CreateTeamInput {
  return {
    name: values.name.trim(),
    tag: values.tag.trim().toUpperCase(),
    game: values.game,
    captainMemberId: values.captainMemberId,
  };
}

export function formValuesToAddTeamMemberInput(
  teamId: string,
  values: AddTeamMemberFormValues,
): AddTeamMemberInput {
  return {
    teamId,
    memberId: values.memberId,
    role: values.role,
  };
}

export function validateCreateTeamForm(
  values: CreateTeamFormValues,
  existingTeams: Team[],
): CreateTeamFieldErrors {
  const errors: CreateTeamFieldErrors = {};
  const name = values.name.trim();
  const tag = values.tag.trim().toUpperCase();

  if (!name) {
    errors.name = "Team name is required.";
  } else if (name.length < 2) {
    errors.name = "Team name must be at least 2 characters.";
  }

  if (!tag) {
    errors.tag = "Tag is required.";
  } else if (!/^[A-Z0-9]{2,5}$/.test(tag)) {
    errors.tag = "Use 2–5 uppercase letters or numbers.";
  } else if (existingTeams.some((t) => t.tag === tag)) {
    errors.tag = "This tag is already in use.";
  }

  if (!values.captainMemberId) {
    errors.captainMemberId = "Select a captain from registered members.";
  }

  return errors;
}

export function validateAddTeamMemberForm(
  values: AddTeamMemberFormValues,
): AddTeamMemberFieldErrors {
  const errors: AddTeamMemberFieldErrors = {};
  if (!values.memberId) {
    errors.memberId = "Select a member to add.";
  }
  return errors;
}

export function hasFormErrors<T extends object>(errors: Partial<Record<keyof T, string>>): boolean {
  return Object.keys(errors).length > 0;
}

export function adminMemberToTeamMember(member: AdminMember, role: TeamMember["role"]): TeamMember {
  const initials = member.username.slice(0, 2).toUpperCase();
  return {
    userId: member.id,
    username: member.username,
    displayName: member.username,
    avatarInitials: initials,
    ign: member.username,
    role,
    status: "active",
    joinedAt: new Date().toISOString(),
  };
}

export function getTeamCaptainUsername(team: Team): string {
  const captain = team.members.find((m) => m.status === "captain");
  return captain?.username ?? "—";
}

export function countActiveMembers(team: Team): number {
  return team.members.filter((m) => m.status === "captain" || m.status === "active").length;
}
