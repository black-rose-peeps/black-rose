import valorantHeader from "@/assets/valorant-tournament-header.jpg";
import lolHeader from "@/assets/lol-tournament-header.jpg";
import tftHeader from "@/assets/tft-tournament-header.jpg";
import wwmHeader from "@/assets/wwm-tournament-header.jpg";
import type { TournamentStatus } from "../types";
import type { MockTournament } from "@/lib/mock-data";
import { resolveTournamentStatus } from "./tournament-status";

// Legacy abbreviations - will be replaced with dynamic data from games table
export const GAME_ABBREVIATIONS: Record<string, string> = {
  Valorant: "VAL",
  "League of Legends": "LoL",
  "Teamfight Tactics": "TFT",
  "Where Winds Meet": "WWM",
  "Marvel Rivals": "MR",
};

export function getGameAbbrev(game: string): string {
  return GAME_ABBREVIATIONS[game] || game.substring(0, 3).toUpperCase();
}

// Default accent for games not in the legacy constant
export const DEFAULT_ACCENT = {
  line: "from-white/80 via-white/20 to-transparent",
  tag: "border-white/35 text-white bg-white/8",
  cta: "hover:shadow-[0_0_28px_rgba(255,255,255,0.3)]",
  glow: "group-hover:border-white/25",
};

export function getGameAccent(game: string) {
  return GAME_EDITORIAL_ACCENT[game] || DEFAULT_ACCENT;
}

export function getGameHeader(game: string): string {
  return GAME_TOURNAMENT_HEADER[game] || "/og-hero.png";
}

// Legacy tournament headers - will be replaced with dynamic data from games table
export const GAME_TOURNAMENT_HEADER: Record<string, string> = {
  Valorant: valorantHeader,
  "League of Legends": lolHeader,
  "Teamfight Tactics": tftHeader,
  "Where Winds Meet": wwmHeader,
  "Marvel Rivals": "/marvel-rivals.png",
};

/** Editorial accent tokens — neon edge + tag styling per title. */
export const GAME_EDITORIAL_ACCENT: Record<
  string,
  { line: string; tag: string; cta: string; glow: string }
> = {
  Valorant: {
    line: "from-[#ff4655]/80 via-[#ff4655]/20 to-transparent",
    tag: "border-[#ff4655]/35 text-[#ff8a94] bg-[#ff4655]/8",
    cta: "hover:shadow-[0_0_28px_rgba(255,70,85,0.35)]",
    glow: "group-hover:border-[#ff4655]/30",
  },
  "League of Legends": {
    line: "from-[#c8aa6e]/90 via-[#3c89e8]/25 to-transparent",
    tag: "border-[#c8aa6e]/35 text-[#e8d5a8] bg-[#c8aa6e]/8",
    cta: "hover:shadow-[0_0_28px_rgba(200,170,110,0.3)]",
    glow: "group-hover:border-[#c8aa6e]/25",
  },
  "Teamfight Tactics": {
    line: "from-violet-400/90 via-fuchsia-500/20 to-transparent",
    tag: "border-violet-400/35 text-violet-200 bg-violet-500/8",
    cta: "hover:shadow-[0_0_28px_rgba(167,139,250,0.3)]",
    glow: "group-hover:border-violet-400/25",
  },
  "Where Winds Meet": {
    line: "from-cyan-400/90 via-teal-500/20 to-transparent",
    tag: "border-cyan-400/35 text-cyan-100 bg-cyan-500/8",
    cta: "hover:shadow-[0_0_28px_rgba(34,211,238,0.28)]",
    glow: "group-hover:border-cyan-400/25",
  },
  "Marvel Rivals": {
    line: "from-amber-400/90 via-yellow-500/25 to-transparent",
    tag: "border-amber-400/35 text-amber-100 bg-amber-500/8",
    cta: "hover:shadow-[0_0_28px_rgba(251,191,36,0.32)]",
    glow: "group-hover:border-amber-400/25",
  },
};

/** @deprecated Use GAME_TOURNAMENT_HEADER — kept for any gradient fallbacks. */
export const GAME_COVER_GRADIENT: Record<string, string> = {
  Valorant: "from-red-950 via-red-900/60 to-zinc-950",
  "League of Legends": "from-blue-950 via-blue-900/60 to-zinc-950",
  "Teamfight Tactics": "from-violet-950 via-violet-900/60 to-zinc-950",
  "Where Winds Meet": "from-cyan-950 via-cyan-900/60 to-zinc-950",
  "Marvel Rivals": "from-amber-950 via-yellow-900/50 to-zinc-950",
};

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
