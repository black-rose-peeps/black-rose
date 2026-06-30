export {
  gameIdentityConfig,
  gameIdentityConfig as mainGameIdentityConfig,
  formatIdentityForGame,
  formatMainGameIdentityDisplay,
  hasIdentityForGame,
  hasMainGameIdentity,
  listConfiguredGameIdentities,
  listConfiguredIdentitySummaries,
  sanitizeGameIdentities,
  parseGameIdentitiesFromRow,
  validateGameIdentitiesInput,
  IDENTITY_GAMES,
  RIOT_GAMES,
  isRiotGame,
  formatRiotId,
  hasRiotIdentity,
  isValorantGame,
  hasValorantIdentity,
  type GameIdentityConfig,
  type GameIdentityConfig as MainGameIdentityConfig,
  type MemberIdentitySource,
} from "./game-identity";

import {
  gameIdentityConfig,
  validateGameIdentitiesInput,
} from "./game-identity";

/** @deprecated Use validateGameIdentitiesInput */
export function validateMainGameIdentityInput(
  mainGame: string,
  valorantGameName: string,
  valorantTagline: string,
  ingameDisplayName: string,
): string | null {
  const config = gameIdentityConfig(mainGame);
  if (!config) return null;

  const gameIdentities: Record<string, string> = {};
  if (config.game !== "Valorant" && ingameDisplayName.trim()) {
    gameIdentities[config.game] = ingameDisplayName;
  }

  return validateGameIdentitiesInput({ valorantGameName, valorantTagline, gameIdentities });
}

export function isMainGameWithIdentity(mainGame: string): boolean {
  return gameIdentityConfig(mainGame) !== null;
}
