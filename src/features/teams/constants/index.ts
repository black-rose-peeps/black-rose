import type { TeamMemberRole } from "../types";

export type Game =
  | "Valorant"
  | "League of Legends"
  | "Teamfight Tactics"
  | "Where Winds Meet"
  | "Multi";

export const GAME_OPTIONS: { value: Game; label: string }[] = [
  { value: "Valorant", label: "Valorant" },
  { value: "League of Legends", label: "League of Legends" },
  { value: "Teamfight Tactics", label: "Teamfight Tactics" },
  { value: "Where Winds Meet", label: "Where Winds Meet" },
  { value: "Multi", label: "Multi-game" },
];

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

const TFT_ROLES: TeamMemberRole[] = ["Flex", "IGL", "Sub", "TBD"];

const WWM_ROLES: TeamMemberRole[] = ["DPS", "Tank", "Support", "Flex", "Sub", "TBD"];

const GENERIC_ROLES: TeamMemberRole[] = ["IGL", "Flex", "Sub", "TBD"];

const GAME_ALIASES: Record<string, Game> = {
  valorant: "Valorant",
  "league of legends": "League of Legends",
  lol: "League of Legends",
  "teamfight tactics": "Teamfight Tactics",
  tft: "Teamfight Tactics",
  "where winds meet": "Where Winds Meet",
  wwm: "Where Winds Meet",
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

  const caseInsensitive = GAME_OPTIONS.find(
    (g) => g.value.toLowerCase() === trimmed.toLowerCase(),
  );
  return caseInsensitive?.value ?? null;
}

/** Main role options filtered by the member's or team's primary game. */
export function getRoleOptionsForGame(game: string): TeamMemberRole[] {
  switch (normalizeGameKey(game)) {
    case "Valorant":
      return VALORANT_ROLES;
    case "League of Legends":
      return LOL_ROLES;
    case "Teamfight Tactics":
      return TFT_ROLES;
    case "Where Winds Meet":
      return WWM_ROLES;
    case "Multi":
      return GENERIC_ROLES;
    default:
      return GENERIC_ROLES;
  }
}

export const GAME_COLOR: Record<Game, string> = {
  Valorant: "text-red-400",
  "League of Legends": "text-blue-400",
  "Teamfight Tactics": "text-violet-400",
  "Where Winds Meet": "text-cyan-400",
  Multi: "text-muted-foreground",
};

export const GAME_ACCENT: Record<Game, string> = {
  Valorant: "from-red-500/20 via-red-500/5 to-transparent",
  "League of Legends": "from-blue-500/20 via-blue-500/5 to-transparent",
  "Teamfight Tactics": "from-violet-500/20 via-violet-500/5 to-transparent",
  "Where Winds Meet": "from-cyan-500/20 via-cyan-500/5 to-transparent",
  Multi: "from-white/10 via-white/5 to-transparent",
};

export const MAX_TEAM_SIZE = 7; // 5 starters + 2 subs
export const MIN_TEAM_SIZE = 5;
