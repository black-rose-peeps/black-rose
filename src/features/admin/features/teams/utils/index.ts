import { resolveMemberProfileSlug } from "@/features/member/utils/profile-slug";
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

export function teamToEditFormValues(
  team: Team,
): Pick<CreateTeamFormValues, "name" | "tag" | "game"> {
  return {
    name: team.name,
    tag: team.tag,
    game: team.game,
  };
}

function validateTeamNameAndTag(
  values: Pick<CreateTeamFormValues, "name" | "tag">,
  existingTeams: Team[],
  excludeTeamId?: string,
): Pick<CreateTeamFieldErrors, "name" | "tag"> {
  const errors: Pick<CreateTeamFieldErrors, "name" | "tag"> = {};
  const name = values.name.trim();
  const tag = values.tag.trim().toUpperCase();
  const others = excludeTeamId
    ? existingTeams.filter((team) => team.id !== excludeTeamId)
    : existingTeams;

  if (!name) {
    errors.name = "Team name is required.";
  } else if (name.length < 2) {
    errors.name = "Team name must be at least 2 characters.";
  }

  if (!tag) {
    errors.tag = "Tag is required.";
  } else if (!/^[A-Z0-9]{2,5}$/.test(tag)) {
    errors.tag = "Use 2–5 uppercase letters or numbers.";
  } else if (others.some((team) => team.tag.trim().toUpperCase() === tag)) {
    errors.tag = "This tag is already in use.";
  }

  return errors;
}

export function validateCreateTeamForm(
  values: CreateTeamFormValues,
  existingTeams: Team[],
): CreateTeamFieldErrors {
  const errors: CreateTeamFieldErrors = {
    ...validateTeamNameAndTag(values, existingTeams),
  };

  if (!values.captainMemberId) {
    errors.captainMemberId = "Select a captain from registered members.";
  }

  return errors;
}

export function validateEditTeamForm(
  values: Pick<CreateTeamFormValues, "name" | "tag" | "game">,
  existingTeams: Team[],
  teamId: string,
): Pick<CreateTeamFieldErrors, "name" | "tag"> {
  return validateTeamNameAndTag(values, existingTeams, teamId);
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

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function adminMemberToTeamMember(
  member: AdminMember,
  role: TeamMember["role"],
  displayName = member.username,
  ign = member.username,
): TeamMember {
  return {
    userId: member.id,
    username: member.username,
    discordUsername: member.discordUsername,
    displayName,
    avatarInitials: initialsFromName(displayName),
    avatarUrl: member.avatarUrl,
    profileSlug: resolveMemberProfileSlug(member.profileSlug, member.username),
    ign,
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

function getActiveTeamMemberIds(teams: Team[]): Set<string> {
  const onTeam = new Set<string>();
  for (const team of teams) {
    for (const member of team.members) {
      if (member.status === "captain" || member.status === "active") {
        onTeam.add(member.userId);
      }
    }
  }
  return onTeam;
}

/** Verified members not already on a team — eligible as a new team captain. */
export function getMembersAvailableForNewTeam(
  members: AdminMember[],
  teams: Team[],
): AdminMember[] {
  const onTeam = getActiveTeamMemberIds(teams);
  return members.filter((m) => m.status === "Verified" && !onTeam.has(m.id));
}

/** Members not on any active roster — eligible to join a team. */
export function getMembersAvailableForRoster(members: AdminMember[], teams: Team[]): AdminMember[] {
  const onTeam = getActiveTeamMemberIds(teams);
  return members.filter((m) => !onTeam.has(m.id));
}
