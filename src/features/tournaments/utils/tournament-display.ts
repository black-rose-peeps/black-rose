import type { TournamentStatus } from "../types";
import type { MockTournament } from "@/lib/mock-data";
import { resolveTournamentStatus } from "./tournament-status";

export function getGameAbbrev(game: string): string {
  return game.substring(0, 3).toUpperCase();
}

// Default accent for games not in the legacy constant
export const DEFAULT_ACCENT = {
  line: "from-white/80 via-white/20 to-transparent",
  tag: "border-white/35 text-white bg-white/8",
  cta: "hover:shadow-[0_0_28px_rgba(255,255,255,0.3)]",
  glow: "group-hover:border-white/25",
};

export function getGameAccent(game: string, gameData?: { accent_class: string | null }) {
  if (gameData?.accent_class) {
    return {
      line: gameData.accent_class,
      tag: "border-white/35 text-white bg-white/8",
      cta: "hover:shadow-[0_0_28px_rgba(255,255,255,0.3)]",
      glow: "group-hover:border-white/25",
    };
  }
  return DEFAULT_ACCENT;
}

export function getGameHeader(game: string, gameData?: { tournament_header_image: string | null }): string {
  return gameData?.tournament_header_image || "/og-hero.png";
}

export function formatShortDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatSlotLabel(registered: number, cap: number): string {
  return `${registered} / ${cap}`;
}

/** Landing spotlight — live and open events first, soonest deadline wins ties. */
export function pickSpotlightTournaments<T extends MockTournament>(
  tournaments: T[],
  limit = 3,
): T[] {
  const priority = (status: TournamentStatus | MockTournament["status"]) => {
    if (status === "Live") return 0;
    if (status === "Registration Open") return 1;
    if (status === "Registration Closed") return 2;
    return 3;
  };

  return [...tournaments]
    .map((t) => ({ ...t, status: resolveTournamentStatus(t) }))
    .filter((t) => t.status !== "Completed" && t.status !== "Archived" && t.status !== "Draft")
    .sort((a, b) => {
      const byStatus = priority(a.status) - priority(b.status);
      if (byStatus !== 0) return byStatus;
      return (
        new Date(a.registrationDeadline).getTime() - new Date(b.registrationDeadline).getTime()
      );
    })
    .slice(0, limit);
}
