import type { TeamMemberRole } from "../types";

export const GAME_OPTIONS = [
  { value: "Valorant", label: "Valorant" },
  { value: "MLBB", label: "Mobile Legends (MLBB)" },
  { value: "CS2", label: "Counter-Strike 2" },
  { value: "Multi", label: "Multi-game" },
] as const;

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
  "Mid",
  "Jungle",
  "Roam",
  "EXP",
  "Gold",
  "Sub",
  "TBD",
];

export const GAME_COLOR: Record<string, string> = {
  Valorant: "text-red-400",
  MLBB: "text-sky-400",
  CS2: "text-amber-400",
  Multi: "text-muted-foreground",
};

export const GAME_ACCENT: Record<string, string> = {
  Valorant: "from-red-500/20 via-red-500/5 to-transparent",
  MLBB: "from-sky-500/20 via-sky-500/5 to-transparent",
  CS2: "from-amber-500/20 via-amber-500/5 to-transparent",
  Multi: "from-white/10 via-white/5 to-transparent",
};

export const MAX_TEAM_SIZE = 7; // 5 starters + 2 subs
export const MIN_TEAM_SIZE = 5;
