import type { TournamentGame } from "@/features/tournaments/types";

/** Map archive/game strings to a known TournamentGame for editorial tokens. */
export function resolveGame(game: string): TournamentGame {
  if (game === "League of Legends") return "League of Legends";
  if (game === "Teamfight Tactics") return "Teamfight Tactics";
  if (game === "Where Winds Meet") return "Where Winds Meet";
  return "Valorant";
}
