import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Game } from "../src/features/admin/features/games/services/games.service";

const profile = {
  memberId: "member",
  slug: "fixture",
  displayName: "Fixture",
  username: "fixture",
  discordUsername: "fixture",
  headline: "Public headline",
  bio: "Public bio",
  avatarInitials: "FX",
  avatarUrl: null,
  mainGame: "Palworld",
  mainRole: "BuilderRole",
  region: "SEA",
  isVerified: true,
  isPublic: true,
  acceptedGameMemberships: [{ gameId: "palworld-id", gameName: "Palworld", gameIcon: null }],
  socialLinks: [],
  valorantGameName: "",
  valorantTagline: "",
  gameIdentities: { Palworld: "StoredBuilder" },
  ingameDisplayName: "",
  tournamentHistory: ["Historical Palworld cup"],
  activeRegistrations: [],
  upcomingMatches: [],
  profileCompletion: 50,
};
const state = {
  profile,
  stateIndex: 0,
  catalog: [] as Game[] | undefined,
  isError: false,
  isPending: false,
  session: { id: "member", role: "member", displayName: "Fixture", profileSlug: "fixture" },
};
Object.assign(globalThis, { __activeVisibilitySurfaces: state });
const reactUrl = import.meta.resolve("react");
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    let source: string | undefined;
    if (/\.(png|svg)$/.test(specifier)) source = `export default '/fixture-asset.png'`;
    if (specifier === "react" && context.parentURL?.includes("/src/routes/br."))
      source = `export * from '${reactUrl}'; const f=globalThis.__activeVisibilitySurfaces; export const useEffect=()=>{}; export function useState(){return [[f.profile,false,false,null,[]][f.stateIndex++],()=>{}]}`;
    if (specifier === "@tanstack/react-router")
      source = `import {createElement} from '${reactUrl}'; export const Link=({children,to,...props})=>createElement('a',{'href':to},children); export const createFileRoute=()=>options=>({options,useParams:()=>({slug:'fixture'})});`;
    if (specifier.endsWith("/hooks/useGames"))
      source = `export function useActiveGames(){const f=globalThis.__activeVisibilitySurfaces;return {data:f.catalog,isError:f.isError,isPending:f.isPending}}`;
    if (specifier.endsWith("/store/session"))
      source = `export const getSession=()=>globalThis.__activeVisibilitySurfaces.session`;
    if (specifier.endsWith("/auth/utils/routes"))
      source = `export const hasFullMemberAccess=()=>true`;
    if (specifier.endsWith("/useMemberDashboardPage"))
      source = `export function useMemberDashboardPage(){const f=globalThis.__activeVisibilitySurfaces;return {session:f.session,profile:f.profile,championships:[],isLoading:false}}`;
    if (specifier.endsWith("/useProfileCompleteCelebration"))
      source = `export const useProfileCompleteCelebration=()=>({celebrationOpen:false,celebrateIfUnseen(){},openCelebration(){},dismissCelebration(){}})`;
    if (specifier.endsWith("/MemberShell"))
      source = `import {createElement} from '${reactUrl}'; export const TechPanel=({label,title,children})=>createElement('section',null,label,title,children); export const CornerAccents=()=>null; export const MemberPageLayout=({children})=>createElement('main',null,children); export const MemberHeroBanner=({title,subtitle,meta,actions,children})=>createElement('header',null,title,subtitle,meta,actions,children);`;
    if (
      ["MemberProfileSkeleton", "DashboardHubSkeleton"].includes(specifier.split("/").at(-1) ?? "")
    )
      source = `export const ${specifier.split("/").at(-1)}=()=>null`;
    if (specifier.endsWith("/member-profile.service"))
      source = `export const fetchMemberProfileBySlug=async()=>null`;
    if (specifier.endsWith("/championship.service"))
      source = `export const fetchMemberChampionships=async()=>[]`;
    const name = specifier.split("/").at(-1);
    if (
      [
        "ProfileCommentsPanel",
        "ActiveRegistrationsPanel",
        "UpcomingMatchesPanel",
        "ProfileCompletionPanel",
        "ProfileCompleteCelebrationDialog",
        "ChampionshipTitlesCard",
        "ChampionMarkGroup",
      ].includes(name ?? "")
    )
      source = `export const ${name}=()=>null`;
    if (source)
      return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const { Route } = await import("../src/routes/br.$slug");
const { DashboardOverview } = await import("../src/features/member/components/DashboardOverview");
hooks.deregister();
const catalog = [
  {
    id: "palworld-id",
    name: "Palworld",
    display_name: "Palworld",
    slug: "palworld",
    is_active: true,
  },
] as Game[];
function publicMarkup() {
  state.stateIndex = 0;
  return renderToStaticMarkup(
    createElement(Route.options.component as () => ReturnType<typeof createElement>),
  );
}
function overviewMarkup() {
  return renderToStaticMarkup(createElement(DashboardOverview, { navigation: null }));
}

for (const [name, markup] of [
  ["public profile", publicMarkup],
  ["Dashboard Overview", overviewMarkup],
] as const) {
  test(`${name} hides inactive identity and main role and restores them on catalog refresh`, () => {
    const original = structuredClone(profile);
    state.catalog = catalog;
    state.isError = false;
    state.isPending = false;
    const active = markup();
    assert.match(active, /StoredBuilder/);
    assert.match(active, /BuilderRole/);
    state.catalog = [];
    const inactive = markup();
    assert.doesNotMatch(inactive, /StoredBuilder|BuilderRole|Accepted member/);
    if (name === "public profile") {
      assert.match(inactive, /Main Game<\/(?:dt|p)><(?:dd|p)[^>]*>—<\//);
      assert.match(inactive, /Historical Palworld cup/);
      assert.match(inactive, /Public bio/);
      assert.doesNotMatch(inactive, /Black Rose memberships/);
    } else {
      assert.doesNotMatch(inactive, /Palworld/);
      assert.match(inactive, /No in-game IDs set/);
    }
    state.catalog = catalog;
    assert.equal(markup(), active);
    state.isError = true;
    assert.doesNotMatch(markup(), /StoredBuilder|BuilderRole|Accepted member/);
    state.isError = false;
    state.isPending = true;
    assert.doesNotMatch(markup(), /StoredBuilder|BuilderRole|Accepted member/);
    state.isPending = false;
    state.catalog = undefined;
    assert.doesNotMatch(markup(), /StoredBuilder|BuilderRole|Accepted member/);
    assert.deepEqual(profile, original);
  });
}
