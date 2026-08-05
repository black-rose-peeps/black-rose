import { normalizeGameKey, type Game } from "@/features/teams/constants";
import {
  formatValorantRiotId,
  hasValorantIdentity,
  isValorantGame,
  validateValorantIdentityInput,
} from "./valorant-identity";
import type { Game as AdminGame } from "@/features/admin/features/games/services/games.service";

/** Riot titles share one Riot ID (game name + tagline) on a single account. */
export const RIOT_GAMES = ["Valorant", "League of Legends", "Teamfight Tactics"] as const;

/** Legacy games for backward compatibility - should be replaced with dynamic games from database */
export const LEGACY_IDENTITY_GAMES = [
  "Where Winds Meet",
  "Palworld",
  "Marvel Rivals",
] as const;

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
  games: string[];
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
  // Dynamic game fields from database
  identityGroup?: string | null;
  identityFieldLabel?: string | null;
  identityFieldPlaceholder?: string | null;
  identityHelperText?: string | null;
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
  Palworld: {
    panelLabel: "Palworld",
    panelTitle: "In-Game Identity",
    fieldLabel: "In-Game Name",
    fieldPlaceholder: "Your Palworld character name",
    helperText:
      "Used to identify you on Black Rose Palworld servers. Enter the name your guild and server members know you by.",
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
  "Marvel Rivals": {
    panelLabel: "Marvel Rivals",
    panelTitle: "In-Game Identity",
    fieldLabel: "Player Name",
    fieldPlaceholder: "Your Marvel Rivals in-game name",
    helperText:
      "Used on Marvel Rivals team rosters and tournament brackets — enter the name shown in-game.",
    usesValorantRiotId: false,
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

export function gameIdentityConfig(game: string, games?: AdminGame[]): GameIdentityConfig | null {
  const normalized = normalizeGameKey(game);
  if (!normalized || normalized === "Multi") return null;
  
  // Check if it's a dynamic game from the database - use both exact and normalized comparison
  const dynamicGame = games?.find(g => g.display_name === game || normalizeGameKey(g.display_name) === normalized);
  if (dynamicGame) {
    return {
      game: normalized,
      panelLabel: dynamicGame.display_name,
      panelTitle: "In-Game Identity",
      fieldLabel: dynamicGame.identity_field_label || "In-Game ID",
      fieldPlaceholder: dynamicGame.identity_field_placeholder || "Your in-game name",
      helperText: dynamicGame.identity_helper_text || "Used on team rosters and tournament brackets.",
      usesValorantRiotId: false,
      identityGroup: dynamicGame.identity_group,
      identityFieldLabel: dynamicGame.identity_field_label,
      identityFieldPlaceholder: dynamicGame.identity_field_placeholder,
      identityHelperText: dynamicGame.identity_helper_text,
    };
  }
  
  // Fall back to legacy config
  const config = GAME_IDENTITY_CONFIG[normalized];
  if (!config) return null;
  return { game: normalized, ...config };
}

export function formatIdentityForGame(game: string, source: MemberIdentitySource, games?: AdminGame[]): string | null {
  const config = gameIdentityConfig(game, games);
  if (!config) return null;

  if (isRiotGame(game)) {
    const riotId = formatRiotId(source);
    if (riotId) return riotId;
    const legacy = source.gameIdentities[config.game]?.trim();
    return legacy || null;
  }

  // For legacy games, use config.game (the game name)
  // For dynamic games, use panelLabel (display_name) as the key
  // For dynamic games, also try the input game name directly (display_name)
  const isLegacy = LEGACY_IDENTITY_GAMES.includes(config.game as any);
  const identityKey = isLegacy ? config.game : config.panelLabel;
  
  // Try panelLabel first, then fall back to the original game input
  let name = source.gameIdentities[identityKey]?.trim();
  if (!name && !isLegacy) {
    name = source.gameIdentities[game]?.trim();
  }
  return name || null;
}

export function hasIdentityForGame(game: string, source: MemberIdentitySource, games?: AdminGame[]): boolean {
  return formatIdentityForGame(game, source, games) !== null;
}

export function formatMainGameIdentityDisplay(source: MemberIdentitySource, games?: AdminGame[]): string | null {
  if (!source.mainGame?.trim()) return null;
  return formatIdentityForGame(source.mainGame, source, games);
}

export function hasMainGameIdentity(source: MemberIdentitySource, games?: AdminGame[]): boolean {
  return formatMainGameIdentityDisplay(source, games) !== null;
}

export function listConfiguredGameIdentities(
  source: MemberIdentitySource,
): { game: Game; display: string }[] {
  return LEGACY_IDENTITY_GAMES.filter((game) => hasIdentityForGame(game, source)).map((game) => ({
    game,
    display: formatIdentityForGame(game, source)!,
  }));
}

/** Dashboard/public profile: one row per identity type (Riot ID grouped). */
export function listConfiguredIdentitySummaries(
  source: MemberIdentitySource,
  games?: AdminGame[],
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

  for (const game of LEGACY_IDENTITY_GAMES) {
    if (isRiotGame(game)) continue;
    const display = formatIdentityForGame(game, source, games);
    if (!display) continue;
    summaries.push({
      key: game,
      label: gameIdentityConfig(game, games)?.fieldLabel ?? "In-Game ID",
      games: [game],
      display,
      isMain: mainGame === game,
    });
  }

  // Handle dynamic games from database
  if (games) {
    for (const game of games) {
      if (!game.name) continue;
      const normalizedGameName = normalizeGameKey(game.name);
      if (!normalizedGameName) continue;
      // Skip if it's a Riot game or legacy game (already handled)
      if (isRiotGame(normalizedGameName) || LEGACY_IDENTITY_GAMES.includes(normalizedGameName as any)) {
        continue;
      }
      // Try display_name first, then normalized name for identity lookup
      const display = formatIdentityForGame(game.display_name, source, games) ||
                     formatIdentityForGame(normalizedGameName, source, games);
      if (!display) continue;
      summaries.push({
        key: game.name,
        label: game.identity_field_label ?? "In-Game ID",
        games: [game.display_name],
        display,
        isMain: mainGame === normalizedGameName,
      });
    }
  }

  // Sort so main game identity appears first
  return summaries.sort((a, b) => {
    if (a.isMain && !b.isMain) return -1;
    if (!a.isMain && b.isMain) return 1;
    return 0;
  });
}

export function sanitizeGameIdentities(identities: Record<string, string>, availableGames?: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  // Include legacy games
  for (const game of LEGACY_IDENTITY_GAMES) {
    if (isRiotGame(game)) continue;
    const value = identities[game]?.trim();
    if (value) result[game] = value;
  }
  // Include dynamic games from availableGames
  if (availableGames) {
    for (const game of availableGames) {
      // Skip Riot games (handled separately) and legacy games (already handled above)
      if (isRiotGame(game)) continue;
      if (LEGACY_IDENTITY_GAMES.includes(game as any)) continue;
      const value = identities[game]?.trim();
      if (value) result[game] = value;
    }
  }
  return result;
}

export function parseGameIdentitiesFromRow(row: {
  game_identities?: unknown;
  ingame_display_name?: string | null;
  main_game?: string | null;
}): Record<string, string> {
  if (
    row.game_identities &&
    typeof row.game_identities === "object" &&
    !Array.isArray(row.game_identities)
  ) {
    const parsed: Record<string, string> = {};
    for (const [key, value] of Object.entries(row.game_identities as Record<string, unknown>)) {
      // Don't normalize keys - keep them as-is (display_name for dynamic games, game name for legacy)
      if (!key || isRiotGame(key) || typeof value !== "string") continue;
      const trimmed = value.trim();
      if (trimmed) parsed[key] = trimmed;
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
}, availableGames?: string[]): string | null {
  const valorantError = validateValorantIdentityInput(
    source.valorantGameName,
    source.valorantTagline,
  );
  if (valorantError) return valorantError;

  // Validate legacy games
  for (const game of LEGACY_IDENTITY_GAMES) {
    if (isRiotGame(game)) continue;
    const config = gameIdentityConfig(game);
    if (!config) continue;
    const name = source.gameIdentities[game]?.trim();
    if (!name) continue;
    if (name.length < 2 || name.length > 64) {
      return `${config.fieldLabel} for ${config.panelLabel} must be 2–64 characters.`;
    }
  }

  // Validate dynamic games
  if (availableGames) {
    for (const game of availableGames) {
      if (isRiotGame(game) || LEGACY_IDENTITY_GAMES.includes(game as any)) continue;
      const name = source.gameIdentities[game]?.trim();
      if (!name) continue;
      if (name.length < 2 || name.length > 64) {
        return `${game} in-game ID must be 2–64 characters.`;
      }
    }
  }

  return null;
}

/** @deprecated Use gameIdentityConfig */
export const mainGameIdentityConfig = gameIdentityConfig;

export { isValorantGame, hasValorantIdentity };
