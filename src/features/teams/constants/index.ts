import type { TeamMemberRole } from "../types";
import type { Game as DbGame, GameRole } from "@/features/admin/features/games/services/games.service";

// Legacy type for backward compatibility during migration
export type Game =
  | "Valorant"
  | "Marvel Rivals"
  | "League of Legends"
  | "Teamfight Tactics"
  | "Where Winds Meet"
  | "Palworld"
  | "Multi";

// Hardcoded options for fallback (will be replaced with dynamic data)
export const GAME_OPTIONS: { value: Game; label: string }[] = [
  { value: "Valorant", label: "Valorant" },
  { value: "Marvel Rivals", label: "Marvel Rivals" },
  { value: "League of Legends", label: "League of Legends" },
  { value: "Teamfight Tactics", label: "Teamfight Tactics" },
  { value: "Where Winds Meet", label: "Where Winds Meet" },
  { value: "Palworld", label: "Palworld" },
  { value: "Multi", label: "Multi-game" },
];

// Convert database game to legacy Game type
export function dbGameToLegacyGame(dbGame: DbGame): Game {
  if (dbGame.name === "Multi") return "Multi";
  return dbGame.name as Game;
}

// Convert legacy Game to database game name
export function legacyGameToDbName(game: Game): string {
  return game;
}

export const ROLE_OPTIONS: TeamMemberRole[] = [
  "IGL",
  "Duelist",
  "Controller",
  "Initiator",
  "Sentinel",
  "Flex",
  "AWPer",
  "Rifler",
  "Support",
  "Lurker",
  "Top",
  "Mid",
  "Jungle",
  "ADC",
  "Roam",
  "EXP",
  "Gold",
  "DPS",
  "Tank",
  "Healer",
  "Vanguard",
  "Strategist",
  "Sub",
  "TBD",
];

const VALORANT_ROLES: TeamMemberRole[] = [
  "IGL",
  "Duelist",
  "Controller",
  "Initiator",
  "Sentinel",
  "Flex",
  "Sub",
  "TBD",
];

const LOL_ROLES: TeamMemberRole[] = [
  "Top",
  "Jungle",
  "Mid",
  "ADC",
  "Support",
  "IGL",
  "Flex",
  "Sub",
  "TBD",
];

const MARVEL_RIVALS_ROLES: TeamMemberRole[] = [
  "Vanguard",
  "Duelist",
  "Strategist",
  "Flex",
  "Sub",
  "TBD",
];

const TFT_ROLES: TeamMemberRole[] = ["Flex", "IGL", "Sub", "TBD"];

const WWM_ROLES: TeamMemberRole[] = ["DPS", "Tank", "Healer", "Support", "Flex", "Sub", "TBD"];

const PALWORLD_ROLES: TeamMemberRole[] = ["DPS", "Tank", "Support", "Flex", "Sub", "TBD"];

const GENERIC_ROLES: TeamMemberRole[] = ["IGL", "Flex", "Sub", "TBD"];

const GAME_ALIASES: Record<string, Game> = {
  valorant: "Valorant",
  "league of legends": "League of Legends",
  lol: "League of Legends",
  "teamfight tactics": "Teamfight Tactics",
  tft: "Teamfight Tactics",
  "where winds meet": "Where Winds Meet",
  wwm: "Where Winds Meet",
  palworld: "Palworld",
  "marvel rivals": "Marvel Rivals",
  mr: "Marvel Rivals",
  multi: "Multi",
  "multi-game": "Multi",
};

/** Normalize free-text or legacy main_game values to a canonical Game key. */
export function normalizeGameKey(game: string): Game | null {
  const trimmed = game.trim();
  if (!trimmed) return null;

  const alias = GAME_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;

  const exact = GAME_OPTIONS.find((g) => g.value === trimmed);
  if (exact) return exact.value;

  const caseInsensitive = GAME_OPTIONS.find((g) => g.value.toLowerCase() === trimmed.toLowerCase());
  if (caseInsensitive) return caseInsensitive.value;

  // For dynamic games not in legacy list, return the trimmed value as-is
  // This allows dynamic games to be handled throughout the system
  return trimmed as Game;
}

/** Main role options filtered by the member's or team's primary game. */
export function getRoleOptionsForGame(game: string, gameRoles?: GameRole[]): TeamMemberRole[] {
  const normalized = normalizeGameKey(game);
  
  // If dynamic game roles are explicitly provided (even if empty), use them
  // This allows games with 0 roles to show no roles instead of falling back to legacy
  if (gameRoles !== undefined) {
    return gameRoles.map(r => r.role_name as TeamMemberRole);
  }
  
  // Fall back to legacy hardcoded roles only when no dynamic data is provided
  switch (normalized) {
    case "Valorant":
      return VALORANT_ROLES;
    case "League of Legends":
      return LOL_ROLES;
    case "Teamfight Tactics":
      return TFT_ROLES;
    case "Where Winds Meet":
      return WWM_ROLES;
    case "Palworld":
      return PALWORLD_ROLES;
    case "Marvel Rivals":
      return MARVEL_RIVALS_ROLES;
    case "Multi":
      return GENERIC_ROLES;
    default:
      return GENERIC_ROLES;
  }
}

/** Pick a role valid for `game`, falling back to TBD when the profile role does not apply. */
export function resolveRoleForGame(
  role: TeamMemberRole | string | null | undefined,
  game: string,
  gameRoles?: GameRole[],
): TeamMemberRole {
  const options = getRoleOptionsForGame(game, gameRoles);
  if (role && options.includes(role as TeamMemberRole)) {
    return role as TeamMemberRole;
  }
  return "TBD";
}

export const GAME_ACCENT: Record<Game, string> = {
  Valorant: "from-red-500/20 via-red-500/5 to-transparent",
  "League of Legends": "from-blue-500/20 via-blue-500/5 to-transparent",
  "Teamfight Tactics": "from-violet-500/20 via-violet-500/5 to-transparent",
  "Where Winds Meet": "from-cyan-500/20 via-cyan-500/5 to-transparent",
  Palworld: "from-emerald-500/20 via-emerald-500/5 to-transparent",
  "Marvel Rivals": "from-rose-500/20 via-rose-500/5 to-transparent",
  Multi: "from-white/10 via-white/5 to-transparent",
};

export const MAX_TEAM_SIZE = 7; // 5 starters + 2 subs
export const MIN_TEAM_SIZE = 5;

// Get accent from database game, fallback to legacy mapping
export function getGameAccent(dbGame: DbGame): string {
  return dbGame.accent_class;
}
