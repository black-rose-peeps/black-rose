import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { MemberProfile, UpcomingMatch, TournamentEntry } from "../src/features/member/types";

const profile: MemberProfile = {
  memberId: "member",
  slug: "fixture",
  displayName: "Fixture",
  username: "fixture",
  discordUsername: "fixture",
  headline: "Ready to play",
  bio: "",
  avatarInitials: "FX",
  avatarUrl: null,
  mainGame: "Palworld",
  mainRole: "Builder",
  region: "SEA",
  isVerified: true,
  isPublic: false,
  socialLinks: [
    { platform: "twitch", label: "Twitch", url: "https://twitch.tv/fixture", isPublic: false },
    { platform: "youtube", label: "YouTube", url: null, isPublic: false },
  ],
  valorantGameName: "",
  valorantTagline: "",
  gameIdentities: { Palworld: "BuilderRose" },
  ingameDisplayName: "",
  tournamentHistory: [],
  activeRegistrations: [],
  upcomingMatches: [],
  profileCompletion: 50,
};
const f = { profile, loading: false };
Object.assign(globalThis, { __overviewPresentation: f });
const react = import.meta.resolve("react");
const hooks = registerHooks({
  resolve(specifier, context, next) {
    let source: string | undefined;
    if (/\.(png|svg)$/.test(specifier)) source = `export default '/fixture.png';`;
    if (specifier === "@tanstack/react-router")
      source = `import {createElement as h} from '${react}';export const Link=({children,to,params,search,...p})=>h('a',{...p,href:to==='/'?to:to.replace('$slug',params?.slug||'').replace('$id',params?.id||'')+(search?'?'+new URLSearchParams(search):'')},children);`;
    if (specifier.endsWith("/useMemberDashboardPage"))
      source = `export const useMemberDashboardPage=()=>({session:{id:'member',displayName:'Fixture',role:'verified',profileSlug:'stable-slug'},profile:globalThis.__overviewPresentation.profile,championships:[],isLoading:globalThis.__overviewPresentation.loading});`;
    if (specifier.endsWith("/hooks/useGames"))
      source = `export const useActiveGames=()=>({data:[{id:'palworld',name:'Palworld',display_name:'Palworld',slug:'palworld',is_active:true}],isPending:false,isError:false});`;
    if (specifier.endsWith("/useProfileCompleteCelebration"))
      source = `export const useProfileCompleteCelebration=()=>({celebrationOpen:false,celebrateIfUnseen(){},openCelebration(){},dismissCelebration(){}});`;
    if (specifier.endsWith("/MemberShell"))
      source = `import {createElement as h} from '${react}';export const CornerAccents=()=>null;export const TechPanel=({title,children,action})=>h('section',null,h('h2',null,title),action,children);export const MemberHeroBanner=({title,subtitle,meta,actions,children})=>h('header',{'data-layout':'hero'},title,subtitle,meta,actions,children);`;
    const name = specifier.split("/").at(-1);
    if (
      ["ProfileCompleteCelebrationDialog", "ChampionshipTitlesCard", "ChampionMarkGroup"].includes(
        name ?? "",
      )
    )
      source = `export const ${name}=()=>null;`;
    if (name === "DashboardHubSkeleton")
      source = `import {createElement as h} from '${react}';export const DashboardHubSkeleton=()=>h('p',null,'Loading dashboard');`;
    return source
      ? { url: "data:text/javascript," + encodeURIComponent(source), shortCircuit: true }
      : next(specifier, context);
  },
});
const { DashboardOverview } = await import("../src/features/member/components/DashboardOverview");
hooks.deregister();
const match: UpcomingMatch = {
  matchId: "match",
  tournamentId: "cup",
  tournamentName: "Rose Cup",
  teamName: "Black Rose",
  opponent: "Rivals",
  scheduledAt: "Tomorrow at 8 PM",
  round: "Final",
  venueType: "online",
  hasRoundSchedule: true,
};
const entry: TournamentEntry = {
  tournamentId: "cup",
  tournamentName: "Rose Cup",
  game: "Palworld",
  status: "Approved",
  teamName: "Black Rose",
  teamTag: "BR",
};
function render() {
  return renderToStaticMarkup(
    createElement(DashboardOverview, {
      navigation: createElement("nav", null, "Overview | My Games | Teams"),
    }),
  );
}

test("Overview retains the shared feature-page hero and familiar card layout", () => {
  f.profile = { ...profile, upcomingMatches: [match], activeRegistrations: [entry] };
  const html = render();
  assert.match(html, /data-layout="hero"/);
  assert.match(html, /lg:grid-cols-3/);
  assert.match(html, /sm:grid-cols-4/);
  assert.match(html, /grid items-stretch gap-5 lg:grid-cols-3/);
  assert.match(html, /grid items-stretch gap-5 lg:grid-cols-2/);
  assert.doesNotMatch(html, /grid items-start/);
  assert.ok(html.indexOf("In-Game Identity") < html.indexOf("Upcoming Matches"));
  assert.doesNotMatch(html, /Player summary|Your activity/);
  assert.match(html, /href="\/br\/stable-slug"/);
  assert.match(html, /tab=identity/);
  assert.match(html, /view=games/);
  assert.match(html, /Rose Cup|Tomorrow at 8 PM/);
});

test("registration and schedule keep their original sections and labels", () => {
  f.profile = { ...profile, activeRegistrations: [entry] };
  const html = render();
  assert.match(html, /Active Registration/);
  assert.match(html, /Upcoming Matches/);
  assert.ok(html.indexOf("Active Registration") < html.indexOf("Upcoming Matches"));
});

test("social panel preserves linked/missing states, privacy and edit access", () => {
  f.profile = profile;
  const html = render();
  assert.match(html, /Twitch/);
  assert.match(html, /Missing/);
  assert.match(html, /YouTube/);
  assert.doesNotMatch(html, /href="https:\/\/twitch.tv\/fixture"/);
  assert.match(html, /Private/);
  assert.match(html, /tab=socials/);
  f.profile = { ...profile, socialLinks: [] };
  assert.match(render(), /No social links added yet/);
});

test("empty states reuse the site's Arena design and loading retains the skeleton", () => {
  f.profile = profile;
  const html = render();
  const text = html.replace(/<[^>]*>/g, "");
  assert.match(text, /No matches scheduled/);
  assert.match(text, /No active registrations/);
  assert.match(html, /text-stroke/);
  f.loading = true;
  assert.match(render(), /Loading dashboard/);
  f.loading = false;
});
