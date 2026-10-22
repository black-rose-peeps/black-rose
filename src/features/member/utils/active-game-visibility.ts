import type { Game } from "@/features/admin/features/games/services/games.service";
import type { MemberProfile } from "@/features/member/types";
import { normalizeGameKey } from "@/features/teams/constants";
import { listConfiguredIdentitySummaries } from "./game-identity";

type VisibilitySource = Pick<
  MemberProfile,
  | "mainGame"
  | "mainRole"
  | "valorantGameName"
  | "valorantTagline"
  | "gameIdentities"
  | "acceptedGameMemberships"
>;

function gameKey(value: string): string {
  return (normalizeGameKey(value) ?? "").toLowerCase();
}

/** Read-only display projection; never remove saved preferences when a game is paused. */
export function projectActiveGameVisibility(source: VisibilitySource, catalog?: Game[]) {
  const games = (catalog ?? []).filter((game) => game.is_active);
  const findGame = (value: string) =>
    games.find((game) =>
      [game.name, game.display_name, game.slug].some((name) => gameKey(name) === gameKey(value)),
    );
  const mainGame = findGame(source.mainGame);
  // Adapt aliases on a new object only; the shared historical identity helpers stay unchanged.
  const gameIdentities: Record<string, string> = {};
  for (const [key, value] of Object.entries(source.gameIdentities)) {
    const game = findGame(key);
    if (!game) continue;
    gameIdentities[normalizeGameKey(game.name) ?? game.name] = value;
    gameIdentities[game.display_name] = value;
  }
  const identitySummaries = listConfiguredIdentitySummaries(
    {
      ...source,
      mainGame: mainGame ? (normalizeGameKey(mainGame.name) ?? mainGame.name) : "",
      gameIdentities,
    },
    games,
  ).flatMap((entry) => {
    const visibleGames = games.filter((game) =>
      entry.games.some((label) => findGame(label)?.id === game.id),
    );
    return visibleGames.length
      ? [
          {
            ...entry,
            games: visibleGames.map((game) => game.display_name),
            isMain: visibleGames.some((game) => game.id === mainGame?.id),
          },
        ]
      : [];
  });
  const activeIds = new Set(games.map((game) => game.id));
  return {
    mainGame: mainGame ? source.mainGame : "",
    mainRole: mainGame ? source.mainRole : "",
    identitySummaries,
    acceptedGameMemberships: (source.acceptedGameMemberships ?? []).filter((membership) =>
      activeIds.has(membership.gameId),
    ),
  };
}
