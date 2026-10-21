import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  WOW_FOREVER_ANNOUNCEMENT_URL,
  WOW_FOREVER_LAUNCH_MS,
} from "../src/features/game-servers/utils/wow-forever-launch";

const game = {
  id: "wow",
  name: "World of Warcraft Forever",
  display_name: "WoW Forever",
  slug: "wow-forever",
  is_active: true,
};
const f = {
  games: [game],
  pending: false,
  error: false,
  ready: true,
  now: WOW_FOREVER_LAUNCH_MS - 1000,
};
Object.assign(globalThis, { __wowPageFixture: f });
const react = import.meta.resolve("react");
const launch = new URL("../src/features/game-servers/utils/wow-forever-launch.ts", import.meta.url)
  .href;
const root = new URL("../src/", import.meta.url);
const hooks = registerHooks({
  resolve(specifier, context, next) {
    let source: string | undefined;
    if (specifier === "react" && context.parentURL?.endsWith("/WoWForeverLaunchPage.tsx"))
      source = `export * from '${react}';export const useState=()=>[globalThis.__wowPageFixture.ready,()=>{}];`;
    if (specifier === "@tanstack/react-router")
      source = `import {createElement as h} from '${react}';export const Link=({children,to,...p})=>h('a',{...p,href:to},children);`;
    if (specifier.endsWith("/hooks/useGames"))
      source = `export const useActiveGames=()=>{const f=globalThis.__wowPageFixture;return {data:f.games,isPending:f.pending,isError:f.error,refetch:()=>{}}};`;
    if (specifier.endsWith("useWoWForeverCountdown"))
      source = `import {getWoWForeverCountdown} from '${launch}';export const useWoWForeverCountdown=()=>getWoWForeverCountdown(globalThis.__wowPageFixture.now);`;
    if (specifier.endsWith("/Header"))
      source = `import {createElement as h} from '${react}';export const Header=()=>h('header',null,'Site header');`;
    if (specifier.endsWith("/Footer"))
      source = `import {createElement as h} from '${react}';export const Footer=()=>h('footer',null,'Site footer');`;
    if (specifier === "@/features/auth/constants")
      source = `export const DISCORD_SERVER_INVITE='https://discord.com/invite/blackrosehq';`;
    if (specifier.endsWith("/DiscordAppAnchor"))
      source = `import {createElement as h} from '${react}';export const DiscordAppAnchor=({discordUrl,children,...p})=>h('a',{...p,href:discordUrl},children);`;
    if (specifier === "@/components/ui/button")
      source = `import {createElement as h,cloneElement} from '${react}';export const Button=({asChild,children,...p})=>asChild?cloneElement(children,p):h('button',p,children);`;
    if (source)
      return { url: "data:text/javascript," + encodeURIComponent(source), shortCircuit: true };
    if (specifier.startsWith("@/")) return next(new URL(specifier.slice(2), root).href, context);
    return next(specifier, context);
  },
});
const { WoWForeverLaunchPage } =
  await import("../src/features/game-servers/components/WoWForeverLaunchPage");
const { getWoWForeverEmbedUrl } =
  await import("../src/features/game-servers/utils/wow-forever-launch");
hooks.deregister();
const render = () => renderToStaticMarkup(createElement(WoWForeverLaunchPage));
function reset() {
  Object.assign(f, {
    games: [game],
    pending: false,
    error: false,
    ready: true,
    now: WOW_FOREVER_LAUNCH_MS - 1000,
  });
}

test("launch page preserves catalog labels, restrained countdown, joining details and the independent Facebook fallback", () => {
  reset();
  const html = render();
  assert.match(html, /<header/);
  assert.match(html, /<footer/);
  assert.match(html, /<h1[^>]*>WoW Forever<\/h1>/);
  assert.match(html, /role="timer"/);
  assert.match(html, /aria-live="off"/);
  assert.match(html, /November 5, 2026 · 7:00 AM Philippine time/);
  assert.match(html, /Horde · PvP/);
  assert.match(html, /Join Discord/);
  assert.match(html, /https:\/\/discord.com\/invite\/blackrosehq/);
  assert.ok(html.includes(WOW_FOREVER_ANNOUNCEMENT_URL.replaceAll("&", "&amp;")));
  assert.match(html, /View on Facebook/);
  assert.match(html, /noopener noreferrer/);
  assert.doesNotMatch(html, /amber-|animate-pulse|shadow-\[/);
});

test("first hydration is deterministic and never incorrectly claims Now live before the client clock is ready", () => {
  reset();
  f.ready = false;
  assert.match(render(), /Loading launch time/);
  assert.doesNotMatch(render(), /Now live|role="timer"/);
});

test("active post-expiry page remains useful with Now live and joining information", () => {
  reset();
  f.now = WOW_FOREVER_LAUNCH_MS;
  const html = render();
  assert.match(html, /Now live/);
  assert.match(html, /Join Discord/);
  assert.match(html, /View on Facebook/);
  assert.doesNotMatch(html, /role="timer"/);
});

test("pending, failed retained, inactive and missing catalogs withhold all campaign and external embed content", () => {
  for (const state of ["pending", "error", "inactive", "missing"]) {
    reset();
    if (state === "pending") f.pending = true;
    if (state === "error") f.error = true;
    if (state === "inactive") f.games = [{ ...game, is_active: false }];
    if (state === "missing") f.games = [];
    const html = render();
    assert.doesNotMatch(html, /role="timer"|Join Discord|facebook.com|WoW Forever/);
    if (state === "error") assert.match(html, /Retry/);
  }
});

test("Facebook embed encodes the exact supplied post and communicates a bounded width rather than scaling its contents", () => {
  for (const [requested, expected] of [
    [350, 350],
    [390.5, 390],
    [750, 500],
    [300, 350],
  ]) {
    const url = new URL(getWoWForeverEmbedUrl(requested));
    assert.equal(url.origin + url.pathname, "https://www.facebook.com/plugins/post.php");
    assert.equal(url.searchParams.get("href"), WOW_FOREVER_ANNOUNCEMENT_URL);
    assert.equal(url.searchParams.get("show_text"), "true");
    assert.equal(url.searchParams.get("width"), String(expected));
  }
});
