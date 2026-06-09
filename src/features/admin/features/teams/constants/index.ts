import type { CreateTeamFormValues, AddTeamMemberFormValues } from "../types";
import { GAME_OPTIONS } from "@/features/teams/constants";

export const ADMIN_TEAM_GAMES = GAME_OPTIONS.filter((g) => g.value !== "Multi");

export const DEFAULT_CREATE_TEAM_FORM: CreateTeamFormValues = {
  name: "",
  tag: "",
  game: "Valorant",
  captainMemberId: "",
};

export const DEFAULT_ADD_TEAM_MEMBER_FORM: AddTeamMemberFormValues = {
  memberId: "",
  role: "TBD",
};
