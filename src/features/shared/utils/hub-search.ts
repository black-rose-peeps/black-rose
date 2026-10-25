export type TournamentHubSearch = { view?: "champions" };
export type DashboardHubSearch = { view?: "teams" | "games"; create?: boolean; focusGame?: string };

export function tournamentHubSearch(search: Record<string, unknown>): TournamentHubSearch {
  return search.view === "champions" ? { view: "champions" } : {};
}

export function dashboardHubSearch(search: Record<string, unknown>): DashboardHubSearch {
  const create = search.create === true || search.create === "true";
  const games = search.view === "games" && !create;
  return {
    ...(search.view === "teams" || create ? { view: "teams" as const } : {}),
    ...(games ? { view: "games" as const } : {}),
    ...(games && typeof search.focusGame === "string" && search.focusGame
      ? { focusGame: search.focusGame }
      : {}),
    ...(create ? { create: true as const } : {}),
  };
}

export function legacyTeamsSearch(search: Record<string, unknown>): DashboardHubSearch {
  return { ...dashboardHubSearch(search), view: "teams" };
}

/** Preserve old player/ingame and focused links without keeping a second editor. */
export function legacyProfileGamesSearch(
  search: Record<string, unknown>,
): DashboardHubSearch | null {
  const focusGame =
    typeof search.focusGame === "string" && search.focusGame ? search.focusGame : undefined;
  if (search.tab !== "player" && search.tab !== "ingame" && !focusGame) return null;
  return { view: "games", ...(focusGame ? { focusGame } : {}) };
}

/** Game switches retain the workspace; overview/teams are actual unmounts. */
export function shouldGuardMyGamesExit(
  dirtyOrBusy: boolean,
  pathname: string,
  search: Record<string, unknown>,
): boolean {
  return dirtyOrBusy && (pathname.replace(/\/+$/, "") !== "/dashboard" || search.view !== "games");
}

/** Legacy detail URLs stay visually grouped under their owning hub. */
export function isHubPathActive(pathname: string, hub: "tournaments" | "dashboard"): boolean {
  const paths = hub === "tournaments" ? ["/tournaments", "/champions"] : ["/dashboard", "/teams"];
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
