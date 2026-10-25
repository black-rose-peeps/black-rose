import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const active = {
  id: "pal",
  name: "Palworld",
  display_name: "Palworld",
  slug: "palworld",
  is_active: true,
};
const retired = {
  id: "val",
  name: "Valorant",
  display_name: "Valorant",
  slug: "valorant",
  is_active: false,
};
const team = {
  id: "team",
  name: "Old team",
  tag: "OLD",
  game: "Valorant",
  gameId: "val",
  activeTournamentId: null,
};

// Exercise component render and event code without a browser or new dependencies.
function harness(path: string, catalog: Record<string, unknown>, initial: unknown[] = []) {
  const states = [...initial];
  let cursor = 0;
  const writes: unknown[] = [];
  const serverHookCalls: unknown[] = [];
  const queryOptions: Record<string, unknown>[] = [];
  const ui = new Proxy({}, { get: (_, name) => String(name) });
  const constants = require("../src/features/teams/constants/index.ts");
  const source = readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports: Record<string, (props: unknown) => unknown> = {};
  const mockRequire = (id: string): unknown => {
    if (id === "react")
      return {
        ...require("react"),
        useState: (value: unknown) => {
          const index = cursor++;
          if (!(index in states)) states[index] = value;
          return [
            states[index],
            (next: unknown) => {
              states[index] = typeof next === "function" ? next(states[index]) : next;
            },
          ];
        },
        useEffect() {},
        useRef: (value: unknown) => ({ current: value }),
        useMemo: (fn: () => unknown) => fn(),
      };
    if (id === "react/jsx-runtime") return require(id);
    if (id === "@tanstack/react-router")
      return { createFileRoute: () => (options: unknown) => options, Link: "Link" };
    if (id === "@tanstack/react-query")
      return {
        useQueryClient: () => ({}),
        useQuery: (options: Record<string, unknown>) => {
          queryOptions.push(options);
          return {
            data: { servers: [{ id: "cached" }] },
            error: null,
            isLoading: false,
            refetch: async () => {
              writes.push("refetch");
            },
          };
        },
      };
    if (id.endsWith("profile-main-game"))
      return require("../src/features/member/utils/profile-main-game.ts");
    if (id.endsWith("/hooks/useGames"))
      return { useActiveGames: () => catalog, useGameRoles: () => ({ data: [] }) };
    if (id.endsWith("/constants") && id.includes("teams")) return constants;
    if (id.endsWith("teams.service"))
      return {
        createTeam: async (input: unknown) => {
          writes.push(input);
          return team;
        },
        updateTeam: async (_id: string, input: unknown) => {
          writes.push(input);
          return team;
        },
      };
    if (id.endsWith("member-profile.service")) return { fetchMemberProfileById: async () => null };
    if (id.endsWith("usePalworldServers"))
      return {
        usePalworldServers: (enabled: unknown) => {
          serverHookCalls.push(enabled);
          return { servers: [], isLoading: false };
        },
      };
    if (id.endsWith("wow-forever-launch"))
      return require("../src/features/game-servers/utils/wow-forever-launch.ts");
    if (id === "sonner") return { toast: { success() {}, error() {} } };
    if (id.endsWith("/hooks/useMemberSession")) return { useMemberSession: () => null };
    if (id.endsWith("MemberShell")) return { techFieldClass: "field" };
    return ui;
  };
  new Function("require", "exports", compiled)(mockRequire, exports);
  return {
    writes,
    serverHookCalls,
    queryOptions,
    render(name: string, props?: unknown) {
      cursor = 0;
      const entry = exports[name];
      return typeof entry === "function"
        ? entry(props)
        : (entry as unknown as { component(): unknown }).component();
    },
  };
}
interface TestElement {
  type: unknown;
  props: {
    children?: unknown;
    value?: string;
    disabled?: boolean;
    game?: { id: string };
    onSubmit: (event: { preventDefault(): void }) => Promise<void>;
    onValueChange: (value: string) => void;
  };
}
function nodes(tree: unknown): TestElement[] {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  const element = tree as TestElement;
  return [element, ...nodes(element.props?.children)];
}
const createPath = "features/teams/components/CreateTeamDialog.tsx";
const editPath = "features/teams/components/EditTeamDialog.tsx";
const overlayPath = "features/game-servers/components/GameServersOverlay.tsx";

test("legacy member main-game selector does not reintroduce an inactive saved title", () => {
  const path = "features/member/components/EditInGameIdsModal.tsx";
  for (const catalog of [{ data: [active, retired] }, {}, { data: [active], isError: true }]) {
    const h = harness(path, catalog, ["Valorant"]);
    const rendered = nodes(h.render("EditInGameIdsModal", { ...props, profile: {} }));
    const select = rendered.find((n) => n.type === "Select")!;
    const options = nodes(select)
      .filter((n) => n.type === "SelectItem")
      .map((n) => n.props.value);
    assert.deepEqual(options, catalog.data && !catalog.isError ? ["Palworld"] : []);
    assert.equal(select.props.value ?? "", "");
  }
});

test("team edits preserve only the saved historical game as disabled while allowing active replacements", async () => {
  const h = harness(editPath, { data: [active, retired] });
  const rendered = nodes(h.render("EditTeamDialog", { ...props, team }));
  const items = rendered.filter((n) => n.type === "SelectItem");
  assert.equal(items.find((n) => n.props.value === "Valorant")?.props.disabled, true);
  assert.equal(items.find((n) => n.props.value === "Palworld")?.props.disabled, undefined);
  await rendered.find((n) => n.type === "form")!.props.onSubmit({ preventDefault() {} });
  assert.equal(h.writes.length, 1);
  assert.equal((h.writes[0] as { gameId: string }).gameId, "val");
  rendered.find((n) => n.type === "Select")!.props.onValueChange("Palworld");
  const changed = nodes(h.render("EditTeamDialog", props));
  await changed.find((n) => n.type === "form")!.props.onSubmit({ preventDefault() {} });
  assert.equal((h.writes[1] as { gameId: string }).gameId, "pal");
});
test("server entry icons drop inactive games immediately and fail closed on catalog errors", () => {
  const catalog = { data: [active, retired], isLoading: false, isError: false };
  const h = harness(overlayPath, catalog);
  const games = () =>
    nodes(h.render("HeroGameServersWidget"))
      .filter((n) => n.props?.game)
      .map((n) => n.props.game!.id);
  assert.deepEqual(games(), ["pal"]);
  catalog.data = [{ ...active, is_active: false }];
  assert.deepEqual(games(), []);
  catalog.data = [active];
  catalog.isError = true;
  assert.deepEqual(games(), []);
});

const props = {
  open: true,
  memberId: "me",
  team,
  onOpenChange() {},
  onCreated() {},
  onUpdated() {},
};

test("team creation never falls back to hardcoded games when the active catalog is unavailable", async () => {
  for (const catalog of [
    {},
    { isLoading: true },
    { isError: true, data: [active] },
    { data: [] },
  ]) {
    const h = harness(createPath, catalog, ["Name", "TAG", "Valorant", "TBD"]);
    const rendered = nodes(h.render("CreateTeamDialog", props));
    const gameSelect = rendered.find((n) => n.type === "Select");
    assert.equal(nodes(gameSelect).filter((n) => n.type === "SelectItem").length, 0);
    await rendered.find((n) => n.type === "form")!.props.onSubmit({ preventDefault() {} });
    assert.equal(h.writes.length, 0);
  }
});

test("team creation derives valid selection and ID from each refreshed active catalog", async () => {
  const custom = { ...active, id: "custom", name: "Custom title", display_name: "Custom display" };
  const multi = { ...active, id: "multi", name: "Multi" };
  const catalog = { data: [custom, retired, multi] };
  const h = harness(createPath, catalog, ["Name", "TAG", "Custom title", "TBD"]);
  const rendered = () => nodes(h.render("CreateTeamDialog", props));
  const options = rendered()
    .filter((n) => n.type === "SelectItem")
    .map((n) => n.props.value);
  assert.deepEqual(options, ["Custom title"]);
  await rendered()
    .find((n) => n.type === "form")!
    .props.onSubmit({ preventDefault() {} });
  assert.equal((h.writes[0] as { gameId: string }).gameId, "custom");
  catalog.data = [{ ...custom, is_active: false }];
  assert.equal(rendered().find((n) => n.type === "Select")!.props.value, "");
  await rendered()
    .find((n) => n.type === "form")!
    .props.onSubmit({ preventDefault() {} });
  assert.equal(h.writes.length, 1);
});

test("team edit cannot submit an inactive replacement after refresh or bypass the tournament lock", async () => {
  const catalog = { data: [active] };
  const h = harness(editPath, catalog);
  nodes(h.render("EditTeamDialog", props))
    .find((n) => n.type === "Select")!
    .props.onValueChange("Palworld");
  catalog.data = [];
  let rendered = nodes(h.render("EditTeamDialog", props));
  assert.equal(rendered.find((n) => n.type === "Select")!.props.value, "");
  await rendered.find((n) => n.type === "form")!.props.onSubmit({ preventDefault() {} });
  assert.equal(h.writes.length, 0);
  catalog.data = [active];
  rendered = nodes(
    h.render("EditTeamDialog", { ...props, team: { ...team, activeTournamentId: "tournament" } }),
  );
  await rendered.find((n) => n.type === "form")!.props.onSubmit({ preventDefault() {} });
  assert.equal(h.writes.length, 0);
});

test("the guild application page does not promote an inactive game through a direct URL", () => {
  const wwm = {
    ...active,
    id: "wwm",
    name: "Where Winds Meet",
    display_name: "Where Winds Meet",
    slug: "where-winds-meet",
  };
  for (const catalog of [
    { data: [{ ...wwm, is_active: false }] },
    { data: [] },
    { isLoading: true },
    { data: [wwm], isError: true },
  ]) {
    const h = harness("routes/guilds.tsx", catalog);
    assert.doesNotMatch(
      JSON.stringify(h.render("Route")),
      /four active guilds in Where Winds Meet/,
    );
  }
});

test("direct server routes mount their polling and join bodies only inside the active-game boundary", () => {
  for (const path of ["routes/servers.index.tsx", "routes/servers.$id.tsx"]) {
    const h = harness(path, {});
    const tree = h.render("Route") as TestElement;
    assert.equal(tree.type, "ActivePalworldBoundary");
    assert.equal(h.serverHookCalls.length, 0);
  }
});

test("server boundary withholds game content while loading, inactive, empty, or failed", () => {
  const path = "features/game-servers/components/ActivePalworldBoundary.tsx";
  const child = { type: "secret-server-and-join-content", props: {} };
  const catalog: Record<string, unknown> = { data: [active] };
  const h = harness(path, catalog);
  assert.equal(h.render("ActivePalworldBoundary", { children: child }), child);
  for (const state of [
    { data: [retired] },
    { data: [] },
    { isLoading: true },
    { data: [active], isError: true },
  ]) {
    delete catalog.data;
    delete catalog.isLoading;
    delete catalog.isError;
    Object.assign(catalog, state);
    assert.equal(
      nodes(h.render("ActivePalworldBoundary", { children: child })).some(
        (n) => n.type === child.type,
      ),
      false,
    );
  }
});

test("the hero does not start server polling when the game is inactive or the catalog fails", () => {
  for (const catalog of [{ data: [retired] }, { data: [active], isError: true }, {}]) {
    const h = harness(overlayPath, catalog);
    h.render("HeroGameServersWidget");
    assert.deepEqual(h.serverHookCalls, [false]);
  }
});

test("disabled server hook suppresses polling, cached rows, and manual refresh without changing default consumers", async () => {
  const h = harness("features/game-servers/hooks/usePalworldServers.ts", {});
  const disabled = h.render("usePalworldServers", false) as {
    servers: unknown[];
    refetch(): Promise<unknown>;
  };
  assert.equal(h.queryOptions[0].enabled, false);
  assert.equal(h.queryOptions[0].refetchInterval, false);
  assert.deepEqual(disabled.servers, []);
  await disabled.refetch();
  assert.equal(h.writes.length, 0);
  const enabled = h.render("usePalworldServers") as typeof disabled;
  assert.equal(h.queryOptions[1].enabled, true);
  assert.equal(h.queryOptions[1].refetchInterval, 60_000);
  assert.deepEqual(enabled.servers, [{ id: "cached" }]);
  await enabled.refetch();
  assert.deepEqual(h.writes, ["refetch"]);
});
