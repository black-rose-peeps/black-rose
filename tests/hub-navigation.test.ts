import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  isRedirect,
  Outlet,
  RouterProvider,
  useSearch,
} from "@tanstack/react-router";
import { HubNavigation } from "../src/features/shared/components/HubNavigation";
import {
  dashboardHubSearch,
  isHubPathActive,
  legacyTeamsSearch,
  legacyProfileGamesSearch,
  shouldGuardMyGamesExit,
  tournamentHubSearch,
} from "../src/features/shared/utils/hub-search";
import { Route as championsRoute } from "../src/routes/champions.index";
import { Route as teamsRoute } from "../src/routes/teams.index";
import { Route as createTeamRoute } from "../src/routes/teams.create";

function hub(hub: "tournaments" | "dashboard") {
  return function HubFixture() {
    const search = useSearch({ strict: false }) as { view?: "champions" | "teams" };
    return createElement(HubNavigation, {
      hub,
      view: search.view ?? (hub === "tournaments" ? "browse" : "overview"),
    });
  };
}

async function makeRouter(url: string) {
  const root = createRootRoute({ component: Outlet });
  const tournaments = createRoute({
    getParentRoute: () => root,
    path: "/tournaments",
    validateSearch: tournamentHubSearch,
    component: hub("tournaments"),
  });
  const dashboard = createRoute({
    getParentRoute: () => root,
    path: "/dashboard",
    validateSearch: dashboardHubSearch,
    component: hub("dashboard"),
  });
  const router = createRouter({
    routeTree: root.addChildren([tournaments, dashboard]),
    history: createMemoryHistory({ initialEntries: [url] }),
    isServer: false,
    defaultPendingMinMs: 0,
  });
  await router.load();
  return router;
}

function markup(router: Awaited<ReturnType<typeof makeRouter>>) {
  return renderToStaticMarkup(createElement(RouterProvider, { router }));
}

test("optional hub search defaults tolerate old links and reject unsupported views", () => {
  assert.deepEqual(tournamentHubSearch({}), {});
  assert.deepEqual(tournamentHubSearch({ view: "unknown" }), {});
  assert.deepEqual(dashboardHubSearch({}), {});
  assert.deepEqual(dashboardHubSearch({ view: "unknown", create: "false" }), {});
  assert.deepEqual(dashboardHubSearch({ create: "true" }), { view: "teams", create: true });
  assert.deepEqual(legacyTeamsSearch({ create: false }), { view: "teams" });
});

test("dashboard order is Overview, My Games, Teams with refreshable focus links and native history", async () => {
  assert.deepEqual(dashboardHubSearch({ view: "games", focusGame: "valorant" }), {
    view: "games",
    focusGame: "valorant",
  });
  assert.deepEqual(dashboardHubSearch({ view: "teams", focusGame: "valorant" }), { view: "teams" });
  const router = await makeRouter("/dashboard?view=games&focusGame=valorant");
  const html = markup(router);
  assert.match(html, /My Games/);
  assert.equal((html.match(/<a /g) ?? []).length, 3);
  assert.ok(html.indexOf('href="/dashboard"') < html.indexOf('href="/dashboard?view=games"'));
  assert.ok(
    html.indexOf('href="/dashboard?view=games"') < html.indexOf('href="/dashboard?view=teams"'),
  );
  assert.match(html, /<a(?=[^>]*href="\/dashboard\?view=games")(?=[^>]*aria-current="page")[^>]*>/);
  assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
  router.history.push("/dashboard?view=teams");
  await router.load();
  router.history.back();
  await router.load();
  assert.deepEqual({ ...router.state.location.search }, { view: "games", focusGame: "valorant" });
});

test("legacy game sections preserve focus and My Games guards only real exits", () => {
  assert.deepEqual(legacyProfileGamesSearch({ tab: "player", focusGame: "Valorant" }), {
    view: "games",
    focusGame: "Valorant",
  });
  assert.deepEqual(legacyProfileGamesSearch({ tab: "ingame" }), { view: "games" });
  assert.deepEqual(legacyProfileGamesSearch({ focusGame: "g1" }), {
    view: "games",
    focusGame: "g1",
  });
  assert.equal(legacyProfileGamesSearch({ tab: "identity" }), null);
  assert.equal(
    shouldGuardMyGamesExit(true, "/dashboard", { view: "games", focusGame: "g2" }),
    false,
  );
  assert.equal(shouldGuardMyGamesExit(true, "/dashboard", { view: "teams" }), true);
  assert.equal(shouldGuardMyGamesExit(true, "/dashboard", {}), true);
  assert.equal(shouldGuardMyGamesExit(true, "/dashboard/profile", {}), true);
  assert.equal(shouldGuardMyGamesExit(false, "/dashboard", {}), false);
});

test("tournament links use canonical URLs, current state and native link semantics", async () => {
  const router = await makeRouter("/tournaments?view=champions");
  const html = markup(router);
  assert.ok(html.includes('aria-label="Tournament views"'));
  assert.match(html, /href="\/tournaments"/);
  assert.match(
    html,
    /<a(?=[^>]*href="\/tournaments\?view=champions")(?=[^>]*aria-current="page")[^>]*>/,
  );
  assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
  assert.ok(html.includes("min-h-16"));
  assert.ok(html.includes("focus-visible:ring-2"));
  assert.ok(!html.includes('role="tab"'));
  assert.ok(!html.includes('href="/champions"'));
});

test("dashboard defaults to overview and teams links stay inside dashboard", async () => {
  const router = await makeRouter("/dashboard");
  let html = markup(router);
  assert.match(html, /<a(?=[^>]*href="\/dashboard")(?=[^>]*aria-current="page")[^>]*>/);
  assert.ok(html.includes('href="/dashboard?view=teams"'));
  router.history.push("/dashboard?view=teams");
  await router.load();
  html = markup(router);
  assert.match(html, /<a(?=[^>]*href="\/dashboard\?view=teams")(?=[^>]*aria-current="page")[^>]*>/);
  assert.equal(router.state.location.pathname, "/dashboard");
  assert.deepEqual({ ...router.state.location.search }, { view: "teams" });
  const refreshed = await makeRouter(router.state.location.href);
  assert.match(
    markup(refreshed),
    /<a(?=[^>]*href="\/dashboard\?view=teams")(?=[^>]*aria-current="page")[^>]*>/,
  );
  router.history.back();
  await router.load();
  assert.deepEqual({ ...router.state.location.search }, {});
  assert.equal((markup(router).match(/aria-current="page"/g) ?? []).length, 1);
});

test("legacy champion/list/create callbacks preserve canonical destination and create intent", () => {
  for (const [route, inputSearch, expectedPath, expectedSearch] of [
    [championsRoute, {}, "/tournaments", { view: "champions" }],
    [teamsRoute, legacyTeamsSearch({}), "/dashboard", { view: "teams" }],
    [
      teamsRoute,
      legacyTeamsSearch({ create: "true" }),
      "/dashboard",
      { view: "teams", create: true },
    ],
    [teamsRoute, legacyTeamsSearch({ create: false }), "/dashboard", { view: "teams" }],
    [createTeamRoute, {}, "/dashboard", { view: "teams", create: true }],
  ] as const) {
    assert.throws(
      () => route.options.beforeLoad!({ search: inputSearch } as never),
      (error: unknown) => {
        assert.ok(isRedirect(error));
        assert.equal(error.options.to, expectedPath);
        assert.deepEqual(error.options.search, expectedSearch);
        assert.equal(error.options.replace, true);
        return true;
      },
    );
  }
});

test("detail and profile paths activate the owning header hub without false matches", () => {
  for (const path of ["/tournaments", "/tournaments/one", "/champions", "/champions/one"]) {
    assert.equal(isHubPathActive(path, "tournaments"), true, path);
  }
  for (const path of ["/dashboard", "/dashboard/profile", "/teams", "/teams/one"]) {
    assert.equal(isHubPathActive(path, "dashboard"), true, path);
  }
  assert.equal(isHubPathActive("/teamsters", "dashboard"), false);
  assert.equal(isHubPathActive("/championships", "tournaments"), false);
});

test("extracted features never import routes or nest page shells; auth and invite actions remain", () => {
  const sources = [
    "src/features/tournaments/components/TournamentDirectory.tsx",
    "src/features/championships/components/ChampionArchive.tsx",
    "src/features/member/components/DashboardOverview.tsx",
    "src/features/teams/components/TeamDirectory.tsx",
  ].map((path) => readFileSync(path, "utf8"));
  for (const source of sources) {
    assert.ok(!source.includes('from "@/routes/'));
    assert.ok(!source.includes("<MemberPageLayout"));
    assert.ok(!source.includes("<Header"));
    assert.ok(!source.includes("<Footer"));
    assert.ok(source.includes("{navigation}"));
  }
  const teams = sources[3];
  assert.ok(teams.includes("useSyncedMemberSession()"));
  assert.ok(teams.includes("!hasFullMemberAccess(memberRole)"));
  for (const action of [
    "acceptTeamInvite",
    "declineTeamInvite",
    "useMemberTeamMembershipRealtime",
    "<CreateTeamDialog",
    "onCreateIntentConsumed();",
  ]) {
    assert.ok(teams.includes(action), action);
  }
  assert.ok(teams.includes('to: "/teams/$id"'));
});
