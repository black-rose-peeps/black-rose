import type { Team, TeamMemberRole } from "@/features/teams/types";

export type { Team, TeamMemberRole };

export interface CreateTeamInput {
  name: string;
  tag: string;
  game: Team["game"];
  captainMemberId: string;
  captainRole?: TeamMemberRole;
}

export interface CreateTeamFormValues {
  name: string;
  tag: string;
  game: Team["game"];
  captainMemberId: string;
}

export interface AddTeamMemberInput {
  teamId: string;
  memberId: string;
  role?: TeamMemberRole;
}

export interface AddTeamMemberFormValues {
  memberId: string;
  role: TeamMemberRole;
}

export type CreateTeamFieldErrors = Partial<Record<keyof CreateTeamFormValues, string>>;
export type AddTeamMemberFieldErrors = Partial<Record<keyof AddTeamMemberFormValues, string>>;
