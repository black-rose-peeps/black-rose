import type { TournamentGame, TournamentStatus } from "../types";

export * from "./formats";

export const ALL_GAMES = "All Games";
export const ALL_STATUSES = "All";

export const GAME_FILTERS: (typeof ALL_GAMES | TournamentGame)[] = [
  ALL_GAMES,
  "Valorant",
  "League of Legends",
  "Teamfight Tactics",
  "Where Winds Meet",
];

export const STATUS_FILTERS: (typeof ALL_STATUSES | TournamentStatus)[] = [
  ALL_STATUSES,
  "Registration Open",
  "Live",
  "Registration Closed",
  "Completed",
  "Archived",
];

export const GAME_LABELS: Record<TournamentGame, string> = {
  Valorant: "Valorant · 5v5",
  "League of Legends": "League of Legends · 5v5",
  "Teamfight Tactics": "Teamfight Tactics · 8",
  "Where Winds Meet": "Where Winds Meet",
};

export const STATUS_CONFIG: Record<
  TournamentStatus,
  { label: string; dot: string; badge: string }
> = {
  "Registration Open": {
    label: "Registration Open",
    dot: "bg-emerald-400 animate-pulse-soft",
    badge: "border-emerald-400/30 text-emerald-400 bg-emerald-400/5",
  },
  Live: {
    label: "Live",
    dot: "bg-red-500 animate-pulse-soft",
    badge: "border-white/30 text-white bg-white/5",
  },
  "Registration Closed": {
    label: "Reg. Closed",
    dot: "bg-orange-400",
    badge: "border-white/10 text-muted-foreground",
  },
  Completed: {
    label: "Completed",
    dot: "bg-purple-500",
    badge: "border-sky-400/25 text-sky-300/90 bg-sky-400/5",
  },
  Archived: {
    label: "Archived",
    dot: "bg-muted-foreground",
    badge: "border-white/5 text-muted-foreground/50",
  },
};
