import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  WOW_FOREVER_LAUNCH_MS,
  WOW_FOREVER_ANNOUNCEMENT_URL,
  WOW_FOREVER_PAGE_PATH,
} from "../src/features/game-servers/utils/wow-forever-launch";

const game = {
  id: "wow",
  name: "World of Warcraft Forever",
  slug: "wow-forever",
  display_name: "WoW Forever",
  icon: null,
  is_active: true,
};
const f = {
  games: [game],
  now: WOW_FOREVER_LAUNCH_MS - 86400000,
  error: false,
  loading: false,
  serversEnabled: [] as boolean[],
};
Object.assign(globalThis, { __wowLaunchComponents: f });
const react = import.meta.resolve("react");
const launch = new URL("../src/features/game-servers/utils/wow-forever-launch.ts", import.meta.url)
  .href;
const hooks = registerHooks({
  resolve(specifier, context, next) {
    let source: string | undefined;
    if (specifier === "@tanstack/react-router")
      source = `import {createElement as h} from '${react}';export const Link=({children,to,...props})=>h('a',{...props,href:to},children);`;
    if (specifier.endsWith("/hooks/useGames"))
      source = `const f=globalThis.__wowLaunchComponents;export const useActiveGames=()=>({data:f.games,isError:f.error,isLoading:f.loading});`;
    if (specifier.endsWith("usePalworldServers"))
      source = `export function usePalworldServers(enabled){globalThis.__wowLaunchComponents.serversEnabled.push(enabled);return {servers:[],isLoading:false}}`;
    if (specifier.endsWith("useWoWForeverCountdown"))
      source = `import {getWoWForeverCountdown} from '${launch}';export const useWoWForeverCountdown=enabled=>enabled?getWoWForeverCountdown(globalThis.__wowLaunchComponents.now):null;`;
    return source
      ? { url: "data:text/javascript," + encodeURIComponent(source), shortCircuit: true }
      : next(specifier, context);
  },
});
const { HeroGameServersWidget } =
  await import("../src/features/game-servers/components/GameServersOverlay");
hooks.deregister();
const render = () => renderToStaticMarkup(createElement(HeroGameServersWidget));
function reset() {
  f.games = [game];
  f.error = false;
  f.loading = false;
  f.now = WOW_FOREVER_LAUNCH_MS - 86400000;
  f.serversEnabled = [];
}

test("both approved catalog variants keep a quiet icon linking to the internal launch page in the same tab", () => {
  for (const [slug, display_name] of [
    ["world-of-warcraft-forever", "World of Warcraft: Forever"],
    ["wow-forever", "WoW Forever"],
  ]) {
    reset();
    f.games = [{ ...game, slug, display_name }];
    const html = render();
    assert.ok(html.includes(WOW_FOREVER_PAGE_PATH));
    assert.ok(!html.includes(WOW_FOREVER_ANNOUNCEMENT_URL));
    assert.doesNotMatch(html, /target="_blank"|role="timer"|ring-amber|text-amber/);
    assert.ok(html.includes(display_name));
    assert.match(html, /Launch details/);
    assert.deepEqual(f.serversEnabled, [false]);
  }
});

test("expiry removes the countdown and restores the original community link without changing saved catalog data", () => {
  reset();
  const before = structuredClone(f.games);
  for (const now of [WOW_FOREVER_LAUNCH_MS, WOW_FOREVER_LAUNCH_MS + 1000]) {
    f.now = now;
    const html = render();
    assert.match(html, /href="\/community"/);
    assert.match(html, /aria-label="WoW Forever"/);
    assert.doesNotMatch(html, /role="timer"|facebook\.com|target="_blank"|ring-amber/);
  }
  assert.deepEqual(f.games, before);
});

test("inactive, unavailable and failed catalogs cannot reveal the promotion", () => {
  for (const variant of ["inactive", "empty", "error", "loading"]) {
    reset();
    if (variant === "inactive") f.games = [{ ...game, is_active: false }];
    if (variant === "empty") f.games = [];
    if (variant === "error") f.error = true;
    if (variant === "loading") f.loading = true;
    assert.doesNotMatch(render(), /WoW Forever|facebook\.com|role="timer"/);
    assert.deepEqual(f.serversEnabled, [false]);
  }
});

test("other game destinations and Palworld query gating stay unchanged", () => {
  reset();
  f.games = [
    { ...game, id: "pal", name: "Palworld", slug: "palworld", display_name: "Palworld" },
    {
      ...game,
      id: "wind",
      name: "Where Winds Meet",
      slug: "where-winds-meet",
      display_name: "Where Winds Meet",
    },
    { ...game, id: "val", name: "Valorant", slug: "valorant", display_name: "Valorant" },
  ];
  const html = render();
  assert.match(html, /href="\/servers"/);
  assert.match(html, /href="\/guilds"/);
  assert.match(html, /href="\/community"/);
  assert.doesNotMatch(html, /role="timer"|facebook\.com/);
  assert.deepEqual(f.serversEnabled, [true]);
});
