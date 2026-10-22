import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createGameProfileEditor } from "../src/features/game-membership/components/game-profile-editor";
import { createMainGamePreference } from "../src/features/game-membership/components/main-game-preference";
import type { MemberGameWorkspace, MembershipGame } from "../src/features/game-membership/types";

const active = {
  id: "active",
  name: "Active game",
  slug: "active-game",
  display_name: "Active game",
  is_active: true,
  roles: [],
} as unknown as MembershipGame;
const inactive = {
  ...active,
  id: "retired",
  name: "Secret retired title",
  display_name: "Secret retired title",
  is_active: false,
};
const data: MemberGameWorkspace = {
  games: [inactive, active],
  profiles: [],
  memberships: [],
  legacy: {
    mainGame: inactive.display_name,
    mainRole: "",
    valorantGameName: "",
    valorantTagline: "",
    gameIdentities: {},
    ingameDisplayName: "",
  },
};
const f = {
  data,
  preference: createMainGamePreference(inactive.id, async () => {}),
  select: null as null | {
    value: string;
    options: { value: string; label: string; disabled?: boolean }[];
    onValueChange(value: string): void;
  },
  blocker: null as null | { enableBeforeUnload(): boolean },
};
Object.assign(globalThis, { __activeMyGames: f });
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    let source: string | undefined;
    if (specifier === "@tanstack/react-router")
      source = "export function useBlocker(value){globalThis.__activeMyGames.blocker=value;}";
    if (specifier === "@tanstack/react-query")
      source =
        "export function useQuery(){return {data:globalThis.__activeMyGames.data,isPending:false};} export function useQueryClient(){return {};}";
    if (specifier.endsWith("/useSyncedMemberSession"))
      source =
        "export function useSyncedMemberSession(){return {session:{id:'me',role:'verified'},isSyncing:false};}";
    if (specifier.endsWith("/MemberShell"))
      source =
        "export const techFieldClass='test'; export function MemberHeroBanner(){return null;}";
    // Inspect the exact props crossing the select boundary, not Radix's closed portal markup.
    if (specifier.endsWith("/MemberSelect"))
      source =
        "export function MemberSelect(props){globalThis.__activeMyGames.select=props;return props.options.map(option=>option.label).join(' | ');}";
    if (specifier === "./main-game-preference")
      source =
        "export function createMainGamePreference(){return globalThis.__activeMyGames.preference;}";
    if (specifier.endsWith("/services/game-membership.service"))
      source =
        "export function fetchMyGameWorkspace(){} export function changeMyMainGame(){} export function saveMyGameProfile(){} export function changeMyGameMembership(){}";
    if (source)
      return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
    if (specifier.startsWith("@/"))
      return nextResolve(pathToFileURL(`${process.cwd()}/src/${specifier.slice(2)}`).href, context);
    return nextResolve(specifier, context);
  },
});
const { GameProfilesPanel } =
  await import("../src/features/game-membership/components/GameProfilesPanel");
const { MyGamesDashboard } =
  await import("../src/features/game-membership/components/MyGamesDashboard");
hooks.deregister();

const api = {
  async saveProfile() {
    throw Error("Unexpected write");
  },
  async changeMembership() {
    throw Error("Unexpected write");
  },
};

test("inactive focused games cannot render a list item or profile, even with preserved editor entries", () => {
  for (const focusGame of [inactive.id, inactive.name]) {
    const html = renderToStaticMarkup(
      createElement(GameProfilesPanel, {
        entries: data.games.map((game) => ({
          game,
          editor: createGameProfileEditor(game, null, null, data.legacy, api),
        })),
        loading: false,
        error: null,
        onRetry() {},
        focusGame,
      }),
    );
    assert.doesNotMatch(html, /Secret retired title|game-profile-retired/);
    assert.match(html, /Active game/);
  }
  const empty = renderToStaticMarkup(
    createElement(GameProfilesPanel, {
      entries: [
        { game: inactive, editor: createGameProfileEditor(inactive, null, null, data.legacy, api) },
      ],
      loading: false,
      error: null,
      onRetry() {},
      focusGame: inactive.id,
    }),
  );
  assert.match(empty, /No games available/);
  assert.doesNotMatch(empty, /Secret retired title|Find a game/);
});

test("inactive saved Main Game retains its identifier without exposing its title or creating dirty state", () => {
  f.preference = createMainGamePreference(inactive.id, async () => {});
  const html = renderToStaticMarkup(
    createElement(MyGamesDashboard, { navigation: null, onSelectGame() {} }),
  );
  assert.doesNotMatch(html, /Secret retired title/);
  assert.match(html, /Unavailable Main Game preference/);
  assert.equal(f.select?.value, inactive.id);
  assert.equal(f.select?.options.find((option) => option.value === inactive.id)?.disabled, true);
  assert.deepEqual(
    f.select?.options.filter((option) => !option.disabled).map((option) => option.value),
    ["__none__", active.id],
  );
  assert.equal(f.preference.getSnapshot().value, inactive.id);
  assert.equal(f.preference.getSnapshot().dirty, false);
  assert.equal(f.blocker?.enableBeforeUnload(), false);
  f.select?.onValueChange("retired");
  assert.equal(f.preference.getSnapshot().dirty, false);
  f.select?.onValueChange(active.id);
  assert.equal(f.preference.getSnapshot().value, active.id);
  assert.equal(f.preference.getSnapshot().dirty, true);
  f.preference.discard();
  assert.equal(f.preference.getSnapshot().value, inactive.id);
  assert.equal(f.preference.getSnapshot().dirty, false);
});

test("refresh and reactivation change Main Game visibility without rewriting its untouched saved preference", () => {
  f.preference = createMainGamePreference(inactive.id, async () => {});
  const render = () =>
    renderToStaticMarkup(createElement(MyGamesDashboard, { navigation: null, onSelectGame() {} }));
  const reactivated = { ...data, games: [{ ...inactive, is_active: true }, active] };
  f.data = reactivated;
  assert.match(render(), /Secret retired title/);
  f.data = data;
  assert.doesNotMatch(render(), /Secret retired title/);
  assert.equal(f.preference.getSnapshot().dirty, false);
  assert.equal(f.blocker?.enableBeforeUnload(), false);
  f.data = reactivated;
  assert.match(render(), /Secret retired title/);
  assert.equal(f.select?.value, inactive.id);
  assert.equal(f.preference.getSnapshot().dirty, false);
  f.data = data;
});

test("unknown legacy Main Game labels are generic and a deactivated unsaved choice cannot be saved", () => {
  f.data = { ...data, legacy: { ...data.legacy, mainGame: "Unknown retired title" } };
  f.preference = createMainGamePreference("legacy:Unknown retired title", async () => {});
  const render = () =>
    renderToStaticMarkup(createElement(MyGamesDashboard, { navigation: null, onSelectGame() {} }));
  assert.doesNotMatch(render(), /Unknown retired title|Secret retired title/);
  assert.equal(f.preference.getSnapshot().dirty, false);
  f.preference = createMainGamePreference(active.id, async () => {});
  f.preference.edit(inactive.id);
  const html = render();
  assert.match(html, /disabled=""[^>]*>Save Main Game/);
  assert.doesNotMatch(html, /Secret retired title/);
  assert.equal(
    f.preference.getSnapshot().value,
    inactive.id,
    "do not silently clear a real user draft",
  );
  f.select?.onValueChange(inactive.id);
  assert.equal(f.preference.getSnapshot().value, inactive.id);
  f.preference.discard();
  assert.equal(f.preference.getSnapshot().value, active.id);
  f.data = data;
});
