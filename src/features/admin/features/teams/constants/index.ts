import type { CreateTeamFormValues, AddTeamMemberFormValues } from "../types";
import { GAME_OPTIONS } from "@/features/teams/constants";
import { useActiveGames } from "@/features/admin/features/games/hooks/useGames";
import type { Game } from "@/features/admin/features/games/services/games.service";

// Legacy fallback for when games data is not loaded
export const ADMIN_TEAM_GAMES = GAME_OPTIONS.filter((g) => g.value !== "Multi");

// Convert database games to admin game options format
export function dbGamesToAdminOptions(games: Game[]): { value: string; label: string }[] {
  return games
    .filter((g) => g.name !== "Multi") // Exclude Multi-game from team creation
    .map((g) => ({ value: g.name, label: g.display_name }));
}

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
