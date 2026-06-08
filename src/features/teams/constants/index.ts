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
  "Mid",
  "Jungle",
  "Roam",
  "EXP",
  "Gold",
  "Sub",
  "TBD",
];

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
