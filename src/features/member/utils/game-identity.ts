import { PROFILE_GAME_OPTIONS } from "../constants";
import { normalizeGameKey, type Game } from "@/features/teams/constants";
import {
  formatValorantRiotId,
  hasValorantIdentity,
  isValorantGame,
  validateValorantIdentityInput,
} from "./valorant-identity";

export const IDENTITY_GAMES = PROFILE_GAME_OPTIONS;

/** Riot titles share one Riot ID (game name + tagline) on a single account. */
export const RIOT_GAMES = ["Valorant", "League of Legends", "Teamfight Tactics"] as const;

export type RiotGame = (typeof RIOT_GAMES)[number];

export function isRiotGame(game: string): boolean {
  const normalized = normalizeGameKey(game);
  return (
    normalized === "Valorant" ||
    normalized === "League of Legends" ||
    normalized === "Teamfight Tactics"
  );
}

export function formatRiotId(source: MemberIdentitySource): string | null {
  return formatValorantRiotId(source.valorantGameName, source.valorantTagline);
}

export function hasRiotIdentity(source: MemberIdentitySource): boolean {
  return formatRiotId(source) !== null;
}

export interface ConfiguredIdentitySummary {
  key: string;
  label: string;
  games: Game[];
  display: string;
  isMain: boolean;
}

export interface GameIdentityConfig {
  game: Game;
  panelLabel: string;
  panelTitle: string;
  fieldLabel: string;
  fieldPlaceholder: string;
  helperText: string;
  usesValorantRiotId: boolean;
}

export interface MemberIdentitySource {
  mainGame?: string;
  valorantGameName: string;
  valorantTagline: string;
  gameIdentities: Record<string, string>;
}

const GAME_IDENTITY_CONFIG: Record<Game, Omit<GameIdentityConfig, "game">> = {
  Valorant: {
    panelLabel: "Valorant",
    panelTitle: "In-Game Identity",
    fieldLabel: "Riot ID",
    fieldPlaceholder: "",
    helperText:
      "Used on Valorant team rosters and tournament brackets — even when Valorant is not your profile main game.",
    usesValorantRiotId: true,
  },
  "Where Winds Meet": {
    panelLabel: "Where Winds Meet",
    panelTitle: "In-Game Identity",
    fieldLabel: "Character Name",
    fieldPlaceholder: "Your in-game character name",
    helperText: "Used on Where Winds Meet rosters and events for that title.",
    usesValorantRiotId: false,
  },
  "League of Legends": {
    panelLabel: "League of Legends",
    panelTitle: "In-Game Identity",
    fieldLabel: "Riot ID",
    fieldPlaceholder: "SummonerName#TAG",
    helperText: "Uses your shared Riot ID — the same name and tagline as Valorant and TFT.",
    usesValorantRiotId: true,
  },
  "Teamfight Tactics": {
    panelLabel: "Teamfight Tactics",
    panelTitle: "In-Game Identity",
    fieldLabel: "Riot ID",
    fieldPlaceholder: "PlayerName#TAG",
    helperText: "Uses your shared Riot ID — the same name and tagline as Valorant and League.",
    usesValorantRiotId: true,
  },
  Multi: {
    panelLabel: "Multi-game",
    panelTitle: "In-Game Identity",
    fieldLabel: "In-Game ID",
    fieldPlaceholder: "",
    helperText: "",
    usesValorantRiotId: false,
  },
};

export function gameIdentityConfig(game: string): GameIdentityConfig | null {
  const normalized = normalizeGameKey(game);
  if (!normalized || normalized === "Multi") return null;
  const config = GAME_IDENTITY_CONFIG[normalized];
  if (!config) return null;
  return { game: normalized, ...config };
}

export function formatIdentityForGame(game: string, source: MemberIdentitySource): string | null {
  const config = gameIdentityConfig(game);
  if (!config) return null;

  if (isRiotGame(game)) {
    const riotId = formatRiotId(source);
    if (riotId) return riotId;
    const legacy = source.gameIdentities[config.game]?.trim();
    return legacy || null;
  }

  const name = source.gameIdentities[config.game]?.trim();
  return name || null;
}

export function hasIdentityForGame(game: string, source: MemberIdentitySource): boolean {
  return formatIdentityForGame(game, source) !== null;
}

export function formatMainGameIdentityDisplay(source: MemberIdentitySource): string | null {
  if (!source.mainGame?.trim()) return null;
  return formatIdentityForGame(source.mainGame, source);
}

export function hasMainGameIdentity(source: MemberIdentitySource): boolean {
  return formatMainGameIdentityDisplay(source) !== null;
}

export function listConfiguredGameIdentities(
  source: MemberIdentitySource,
): { game: Game; display: string }[] {
  return IDENTITY_GAMES.filter((game) => hasIdentityForGame(game, source)).map((game) => ({
    game,
    display: formatIdentityForGame(game, source)!,
  }));
}

/** Dashboard/public profile: one row per identity type (Riot ID grouped). */
export function listConfiguredIdentitySummaries(
  source: MemberIdentitySource,
): ConfiguredIdentitySummary[] {
  const summaries: ConfiguredIdentitySummary[] = [];
  const mainGame = normalizeGameKey(source.mainGame ?? "");

  const riotDisplay = formatRiotId(source);
  if (riotDisplay) {
    summaries.push({
      key: "riot",
      label: "Riot ID",
      games: [...RIOT_GAMES],
      display: riotDisplay,
      isMain: !!mainGame && isRiotGame(mainGame),
    });
  }

  for (const game of IDENTITY_GAMES) {
    if (isRiotGame(game)) continue;
    const display = formatIdentityForGame(game, source);
    if (!display) continue;
    summaries.push({
      key: game,
      label: gameIdentityConfig(game)?.fieldLabel ?? "In-Game ID",
      games: [game],
      display,
      isMain: mainGame === game,
    });
  }

  return summaries;
}

export function sanitizeGameIdentities(
  identities: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const game of IDENTITY_GAMES) {
    if (isRiotGame(game)) continue;
    const value = identities[game]?.trim();
    if (value) result[game] = value;
  }
  return result;
}

export function parseGameIdentitiesFromRow(row: {
  game_identities?: unknown;
  ingame_display_name?: string | null;
  main_game?: string | null;
}): Record<string, string> {
  if (row.game_identities && typeof row.game_identities === "object" && !Array.isArray(row.game_identities)) {
    const parsed: Record<string, string> = {};
    for (const [key, value] of Object.entries(row.game_identities as Record<string, unknown>)) {
      const game = normalizeGameKey(key);
      if (!game || isRiotGame(game) || typeof value !== "string") continue;
      const trimmed = value.trim();
      if (trimmed) parsed[game] = trimmed;
    }
    if (Object.keys(parsed).length > 0) return parsed;
  }

  const legacy = row.ingame_display_name?.trim();
  const mainGame = normalizeGameKey(row.main_game ?? "");
  if (legacy && mainGame && !isRiotGame(mainGame)) {
    return { [mainGame]: legacy };
  }

  return {};
}

export function validateGameIdentitiesInput(source: {
  valorantGameName: string;
  valorantTagline: string;
  gameIdentities: Record<string, string>;
}): string | null {
  const valorantError = validateValorantIdentityInput(
    source.valorantGameName,
    source.valorantTagline,
  );
  if (valorantError) return valorantError;

  for (const game of IDENTITY_GAMES) {
    if (isRiotGame(game)) continue;
    const config = gameIdentityConfig(game);
    if (!config) continue;
    const name = source.gameIdentities[game]?.trim();
    if (!name) continue;
    if (name.length < 2 || name.length > 64) {
      return `${config.fieldLabel} for ${config.panelLabel} must be 2–64 characters.`;
    }
  }

  return null;
}

/** @deprecated Use gameIdentityConfig */
export const mainGameIdentityConfig = gameIdentityConfig;

export { isValorantGame, hasValorantIdentity };
