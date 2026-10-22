import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Game } from "../src/features/admin/features/games/services/games.service";

const catalog = [
  "Valorant",
  "League of Legends",
  "Teamfight Tactics",
  "Where Winds Meet",
  "Palworld",
  "Marvel Rivals",
].map((name) => ({
  id: name,
  name,
  display_name: name,
  slug: name.toLowerCase().replaceAll(" ", "-"),
  is_active: true,
})) as Game[];
const profile = {
  memberId: "member",
  slug: "fixture",
  displayName: "Fixture",
  headline: "Member headline",
  avatarInitials: "FX",
  avatarUrl: null,
  mainGame: "Palworld",
  mainRole: "Builder",
  isVerified: true,
  socialLinks: [],
  valorantGameName: "Rose",
  valorantTagline: "BR",
  gameIdentities: {
    "Where Winds Meet": "WindRose",
    Palworld: "BuilderRose",
    "Marvel Rivals": "MarvelRose",
  } as Record<string, string>,
  tournamentHistory: [],
  activeRegistrations: [],
  upcomingMatches: [],
  profileCompletion: 50,
};
const state = {
  profile,
  catalog,
  expanded: false,
  buttons: [] as Record<string, unknown>[],
};
Object.assign(globalThis, { __overviewIdentityDisclosure: state });
const reactUrl = import.meta.resolve("react");
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    let source: string | undefined;
    if (specifier === "react" && context.parentURL?.includes("/DashboardOverview"))
      source = `export * from '${reactUrl}'; export function useState(initial){const s=globalThis.__overviewIdentityDisclosure;return [s.expanded,(next)=>{s.expanded=typeof next==='function'?next(s.expanded):next}]} export const useEffect=()=>{};`;
    if (specifier === "@tanstack/react-router")
      source = `import {createElement} from '${reactUrl}'; export const Link=({children,to})=>createElement('a',{href:to},children);`;
    if (specifier.endsWith("/hooks/useGames"))
      source = `export const useActiveGames=()=>({data:globalThis.__overviewIdentityDisclosure.catalog,isPending:false,isError:false})`;
    if (specifier.endsWith("/useMemberDashboardPage"))
      source = `export const useMemberDashboardPage=()=>({session:{id:'member',role:'verified',displayName:'Fixture'},profile:globalThis.__overviewIdentityDisclosure.profile,championships:[],isLoading:false})`;
    if (specifier.endsWith("/useProfileCompleteCelebration"))
      source = `export const useProfileCompleteCelebration=()=>({celebrationOpen:false,celebrateIfUnseen(){},openCelebration(){},dismissCelebration(){}})`;
    if (specifier.endsWith("/MemberShell"))
      source = `import {createElement} from '${reactUrl}'; export const TechPanel=({label,title,children})=>createElement('section',null,label,title,children); export const CornerAccents=()=>null; export const MemberHeroBanner=({title,subtitle,meta,actions,children})=>createElement('header',null,title,subtitle,meta,actions,children);`;
    if (specifier.endsWith("/ui/button"))
      source = `import {createElement} from '${reactUrl}'; export function Button({children,asChild,variant,size,...props}){globalThis.__overviewIdentityDisclosure.buttons.push(props);return asChild?children:createElement('button',props,children)}`;
    const name = specifier.split("/").at(-1);
    if (
      [
        "ActiveRegistrationsPanel",
        "UpcomingMatchesPanel",
        "ProfileCompletionPanel",
        "ProfileCompleteCelebrationDialog",
        "DashboardHubSkeleton",
        "ChampionMarkGroup",
        "ChampionshipTitlesCard",
      ].includes(name ?? "")
    )
      source = `export const ${name}=()=>null`;
    if (source)
      return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const { DashboardOverview } = await import("../src/features/member/components/DashboardOverview");
hooks.deregister();
function render() {
  state.buttons = [];
  return renderToStaticMarkup(createElement(DashboardOverview, { navigation: null }));
}
function list(html: string) {
  return html.match(/<ul[^>]*id="([^"]+)"[^>]*>(.*?)<\/ul>/s);
}

test("Overview starts with three active identity summaries, counting shared Riot ID once", () => {
  state.expanded = false;
  state.catalog = catalog;
  const html = render();
  assert.ok(list(html), "the identity disclosure must control a stable list id");
  assert.equal((list(html)![2].match(/<li /g) ?? []).length, 3);
  assert.match(list(html)![2], /BuilderRose/);
  assert.match(list(html)![2], /Rose#BR/);
  assert.match(list(html)![2], /Valorant · League of Legends · Teamfight Tactics/);
  assert.doesNotMatch(list(html)![2], /MarvelRose/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /Showing 3 of 4/);
  assert.match(html, /Show 1 more identity/);
  assert.match(html, /Member headline/);
  assert.match(html, /Builder/);
});

test("identity disclosure uses a native button and toggles all summaries without navigation", () => {
  state.expanded = false;
  state.catalog = catalog;
  const collapsed = render();
  const listId = list(collapsed)![1];
  const button = state.buttons.find((props) => props["aria-controls"] === listId)!;
  assert.ok(button);
  assert.equal(button.type, "button", "disclosure must not submit a surrounding form");
  assert.equal(button["aria-expanded"], false);
  (button.onClick as () => void)();
  const expanded = render();
  assert.equal(list(expanded)![1], listId, "list id stays stable across toggles");
  assert.equal((list(expanded)![2].match(/<li /g) ?? []).length, 4);
  assert.match(list(expanded)![2], /MarvelRose/);
  assert.match(expanded, /aria-expanded="true"/);
  assert.match(expanded, /Showing 4 of 4/);
  assert.match(expanded, /Show less/);
  const collapse = state.buttons.find((props) => props["aria-controls"] === listId)!;
  (collapse.onClick as () => void)();
  assert.equal(render(), collapsed);
});

test("inactive games never leak into the expanded list or disclosure count", () => {
  state.expanded = true;
  state.catalog = catalog.map((game) => ({ ...game, is_active: game.name !== "Marvel Rivals" }));
  const html = render();
  assert.equal((list(html)![2].match(/<li /g) ?? []).length, 3);
  assert.doesNotMatch(html, /MarvelRose|Show \d+ more|Show less|aria-expanded|Showing \d+ of/);
  state.catalog = catalog;
  state.expanded = false;
});

test("zero through three identity summaries have no expansion control", () => {
  for (const count of [0, 1, 2, 3]) {
    state.catalog = catalog.filter((game) =>
      ["Palworld", "Where Winds Meet", "Marvel Rivals"].slice(0, count).includes(game.name),
    );
    const html = render();
    assert.doesNotMatch(html, /Show \d+ more|Show less|aria-expanded|Showing \d+ of/);
    if (count === 0) {
      assert.match(html, /No in-game IDs set/);
    } else {
      assert.equal((list(html)![2].match(/<li /g) ?? []).length, count);
    }
  }
  state.catalog = catalog;
});

test("disclosure blends into the list without a boxed footer or visible counter", () => {
  state.expanded = false;
  state.catalog = catalog;
  const html = render();
  const control = state.buttons.find((props) => props["aria-controls"] === list(html)![1])!;
  assert.doesNotMatch(String(control.className), /w-full|border-white|bg-white/);
  assert.match(String(control.className), /text-xs/);
  assert.match(String(control.className), /text-muted-foreground/);
  assert.match(String(control.className), /min-h-11/);
  assert.ok(control["aria-describedby"]);
  assert.ok(html.includes(`id="${control["aria-describedby"]}"`));
  assert.match(html, /id="[^"]+-count" class="sr-only"/);
  assert.match(html, /<span>1 more<\/span>/);
  assert.match(html, /lucide-chevron-down/);
  assert.match(html, /motion-reduce:transition-none/);
});

test("hidden identity count uses plural copy and counts active summaries only", () => {
  state.expanded = false;
  state.profile = {
    ...profile,
    gameIdentities: { ...profile.gameIdentities, "Aion 2": "AionRose" },
  };
  state.catalog = [
    ...catalog,
    { id: "aion", name: "Aion 2", display_name: "Aion 2", is_active: true } as Game,
  ];
  try {
    const html = render();
    assert.match(html, /Showing 3 of 5/);
    assert.match(html, /Show 2 more identities/);
    assert.equal((list(html)![2].match(/<li /g) ?? []).length, 3);
  } finally {
    state.profile = profile;
    state.catalog = catalog;
  }
});
