/* eslint-disable @typescript-eslint/no-explicit-any -- Small JSX/hook host exercises component event boundaries without browser or database access. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import ts from "typescript";

// Render the actual presentation components; isolate only hooks and external services.
const f: any = {
  slots: [],
  cursor: 0,
  query: { data: [], isPending: false, error: null },
  session: { id: "member", role: "member" },
  navigations: [],
  marked: [],
  invalidations: [],
  accept: async () => {},
  decline: async () => {},
};
f.useState = (initial: any) => {
  const index = f.cursor++;
  if (!(index in f.slots)) f.slots[index] = initial;
  return [
    f.slots[index],
    (value: any) => {
      f.slots[index] = value;
    },
  ];
};
f.client = {
  getQueryState: () => ({ fetchStatus: "idle" }),
  invalidateQueries: async (...args: any[]) => {
    f.invalidations.push(args);
  },
};
Object.assign(globalThis, { __dashboardTeamsPresentation: f });
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    let source: string | undefined;
    if (specifier === "react")
      source = `const f=globalThis.__dashboardTeamsPresentation; export const useState=f.useState,useCallback=fn=>fn,useEffect=()=>{};`;
    if (specifier === "react/jsx-runtime")
      source = `export const Fragment='Fragment'; export const jsx=(type,props,key)=>({type,props,key}); export const jsxs=jsx;`;
    if (specifier === "@tanstack/react-query")
      source = `const f=globalThis.__dashboardTeamsPresentation; export const useQuery=()=>f.query,useQueryClient=()=>f.client;`;
    if (specifier === "@tanstack/react-router")
      source = `export const Link='Link',useNavigate=()=>options=>globalThis.__dashboardTeamsPresentation.navigations.push(options);`;
    if (specifier === "lucide-react")
      source = `export const Plus='Plus',Trophy='Trophy',ChevronRight='ChevronRight',Crown='Crown',Check='Check',Loader2='Loader2',X='X';`;
    if (specifier.endsWith("/services/teams.service"))
      source = `const f=globalThis.__dashboardTeamsPresentation; export const fetchTeamsForUser=async()=>[],rosterActorFromMemberSession=()=>({actor:'session'}),acceptTeamInvite=(...args)=>f.accept(...args),declineTeamInvite=(...args)=>f.decline(...args);`;
    if (specifier.endsWith("/useSyncedMemberSession"))
      source = `export const useSyncedMemberSession=()=>({session:globalThis.__dashboardTeamsPresentation.session,isSyncing:false});`;
    if (specifier.endsWith("/auth/utils/routes"))
      source = `export const hasFullMemberAccess=role=>role==='member';`;
    if (specifier.endsWith("/notifications/store"))
      source = `export const markTeamInviteRead=id=>globalThis.__dashboardTeamsPresentation.marked.push(id);`;
    if (specifier.endsWith("/services/team-membership-notifications"))
      source = `export const syncTeamMembershipNotifications=async()=>{};`;
    if (specifier.endsWith("/useTeamMembersRealtime"))
      source = `export const useMemberTeamMembershipRealtime=()=>{};`;
    if (specifier.endsWith("/services/championship.service"))
      source = `export const fetchTeamsChampionshipMap=async()=>new Map();`;
    if (
      specifier.startsWith("@/") &&
      ["/lib/query-keys", "/member/queries/member-query-options", "/teams/utils/membership"].some(
        (s) => specifier.endsWith(s),
      )
    )
      return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    if (specifier.startsWith("@/") && specifier.includes("/components/")) {
      if (specifier.endsWith("/TeamInviteCard") || specifier.endsWith("/TeamsEmptyState"))
        return nextResolve(
          new URL(`../src/${specifier.slice(2)}.tsx`, import.meta.url).href,
          context,
        );
      source = [
        "Button",
        "MemberHeroBanner",
        "ArenaEmptyState",
        "DashboardHubSkeleton",
        "TechPanel",
        "CreateTeamDialog",
        "ChampionMarkGroup",
        "RoseStarMark",
      ]
        .map((name) => `export const ${name}='${name}';`)
        .join("\n");
    }
    if (specifier === "./TournamentRegistrationGuide")
      source = `export const TournamentRegistrationGuide='TournamentRegistrationGuide';`;
    if (source)
      return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (/\/(TeamDirectory|TeamInviteCard|TeamsEmptyState)\.tsx$/.test(url))
      return {
        format: "module",
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
          compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
        }).outputText,
      };
    return nextLoad(url, context);
  },
});
const { TeamDirectory } = await import("../src/features/teams/components/TeamDirectory.tsx");
const { TeamInviteCard } = await import("../src/features/teams/components/TeamInviteCard.tsx");
const { TeamsEmptyState } = await import("../src/features/teams/components/TeamsEmptyState.tsx");
hooks.deregister();

function nodes(tree: any, type: string): any[] {
  if (Array.isArray(tree)) return tree.flatMap((node) => nodes(node, type));
  if (!tree || typeof tree !== "object") return [];
  return [
    ...(tree.type === type || tree.type?.name === type ? [tree] : []),
    ...nodes(tree.props?.children, type),
  ];
}
function text(tree: any): string {
  if (Array.isArray(tree)) return tree.map(text).join("");
  if (tree == null || typeof tree === "boolean") return "";
  if (typeof tree !== "object") return String(tree);
  return text(tree.props?.children);
}
function team(id = "team", status = "active"): any {
  return {
    id,
    name: `Roses ${id}`,
    tag: "RS",
    game: "Valorant",
    captainUserId: "captain",
    members: [
      { userId: "member", status },
      { userId: "captain", status: "captain", displayName: "Rose Captain" },
    ],
  };
}
function setup(teams = [team()]) {
  Object.assign(f, {
    slots: [],
    query: { data: teams, isPending: false, error: null },
    navigations: [],
    marked: [],
    invalidations: [],
    accept: async () => {},
    decline: async () => {},
  });
}
function render() {
  f.cursor = 0;
  return TeamDirectory({ navigation: "navigation", onCreateIntentConsumed: () => {} });
}
async function settle() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

test("shared feature-page hero, invitation sections and counts preserve create action", () => {
  setup([
    team("joined"),
    team("invited", "invited"),
    { ...team("captained", "captain"), captainUserId: "member" },
  ]);
  const tree = render();
  const header = nodes(tree, "MemberHeroBanner")[0];
  assert.equal(header.props.title, "My Teams");
  assert.equal(header.props.eyebrow, "Dashboard · Member Console");
  assert.ok(nodes(tree, "div").some((node) => /auto-rows-fr/.test(node.props.className ?? "")));
  assert.deepEqual(nodes(tree, "h2").map(text), ["Pending Invitations 1", "Your Teams 2"]);
  assert.deepEqual(
    nodes(tree, "section").map((n) => n.props["aria-labelledby"]),
    ["team-invitations-heading", "joined-teams-heading"],
  );
  assert.equal(nodes(tree, "TeamInviteCard")[0].props.captainName, "Rose Captain");
  assert.deepEqual(
    nodes(tree, "TeamSummaryCard").map((n) => n.props.isCaptain),
    [false, true],
  );
  nodes(header.props.actions, "Button")[0].props.onClick();
  assert.equal(nodes(render(), "CreateTeamDialog")[0].props.open, true);
});

test("branded team cards retain role-aware actions, roster counts and championship/tournament links", () => {
  setup();
  const summary = nodes(render(), "TeamSummaryCard")[0];
  const championship = { tournamentName: "Rose Cup" };
  const roster = {
    ...team(),
    activeTournamentId: "cup",
    activeTournamentName: "Current cup",
    members: [
      ...team().members,
      { status: "invited" },
      { status: "invited" },
      { status: "removed" },
    ],
  };
  for (const isCaptain of [false, true]) {
    const row = summary.type({ team: roster, isCaptain, championships: [championship] });
    assert.match(text(row), /2 active2 pending invites/);
    assert.match(text(row), isCaptain ? /Captain/ : /Member/);
    const links = nodes(row, "Link");
    assert.equal(text(links[0]), isCaptain ? "Manage team" : "View team");
    assert.deepEqual(links[0].props.params, { id: "team" });
    assert.equal(links[0].props.to, "/teams/$id");
    assert.equal(links[1].props.to, "/tournaments/$id");
    assert.deepEqual(links[1].props.params, { id: "cup" });
    assert.equal(nodes(row, "ChampionMarkGroup")[0].props.titles[0], championship);
    assert.equal(nodes(row, "RoseStarMark").length, 1);
    for (const button of nodes(row, "Button")) assert.match(button.props.className, /\bh-11\b/);
    assert.match(
      nodes(row, "div")
        .map((n) => n.props.className)
        .join(" "),
      /bg-linear-to-r/,
    );
  }
  const row = summary.type({ team: team(), isCaptain: false });
  assert.doesNotMatch(text(row), /pending invite/);
  assert.equal(nodes(row, "Link").length, 1);
});

test("invitation buttons preserve callbacks, busy disables, view route and reduced-motion feedback", () => {
  let accepted = 0,
    declined = 0;
  const props = {
    team: team(),
    captainName: "Captain",
    onAccept: () => {
      accepted++;
    },
    onDecline: () => {
      declined++;
    },
  };
  const tree = TeamInviteCard(props);
  const buttons = nodes(tree, "Button");
  buttons[0].props.onClick();
  buttons[1].props.onClick();
  assert.deepEqual([accepted, declined], [1, 1]);
  assert.deepEqual(nodes(tree, "Link")[0].props.params, { id: "team" });
  assert.equal(nodes(tree, "Link")[0].props.to, "/teams/$id");
  for (const button of buttons) assert.match(button.props.className, /\bh-11\b/);
  const busy = TeamInviteCard({ ...props, responding: true });
  assert.equal(busy.props["aria-busy"], true);
  assert.deepEqual(
    nodes(busy, "Button")
      .slice(0, 2)
      .map((n) => n.props.disabled),
    [true, true],
  );
  assert.match(nodes(busy, "Loader2")[0].props.className, /motion-reduce:animate-none/);
});

test("failed accept/decline retains joined teams/invites, restores actions and offers working retry", async () => {
  for (const action of ["onAccept", "onDecline"]) {
    setup([team("joined"), team("invited", "invited")]);
    let reject!: (error: Error) => void;
    const gate = new Promise<void>((_, fail) => {
      reject = fail;
    });
    f[action === "onAccept" ? "accept" : "decline"] = () => gate;
    nodes(render(), "TeamInviteCard")[0].props[action]();
    assert.equal(nodes(render(), "TeamInviteCard")[0].props.responding, true);
    reject(new Error("Please try again"));
    await settle();
    const failed = render();
    assert.equal(nodes(failed, "TeamInviteCard").length, 1);
    assert.equal(nodes(failed, "TeamSummaryCard").length, 1);
    assert.equal(nodes(failed, "TeamInviteCard")[0].props.responding, false);
    assert.equal(nodes(failed, "TechPanel").length, 0);
    assert.match(
      text(nodes(failed, "div").find((n) => n.props.role === "alert")),
      /Please try again/,
    );
    assert.deepEqual(f.marked, []);
    assert.deepEqual(f.navigations, []);
    nodes(failed, "Button")
      .find((n) => text(n) === "Retry")
      .props.onClick();
    await settle();
    assert.equal(
      nodes(render(), "div").some((n) => n.props.role === "alert"),
      false,
    );
    assert.equal(f.invalidations.length, 1);
  }
});

test("successful invite responses preserve service arguments, read markers, refresh and accept-only navigation", async () => {
  for (const action of ["onAccept", "onDecline"]) {
    setup([team("invited", "invited")]);
    let args: any[] = [];
    f[action === "onAccept" ? "accept" : "decline"] = async (...values: any[]) => {
      args = values;
    };
    nodes(render(), "TeamInviteCard")[0].props[action]();
    await settle();
    assert.deepEqual(args.slice(0, 2), ["invited", "member"]);
    if (action === "onAccept") assert.deepEqual(args[2], { actor: "session" });
    assert.deepEqual(f.marked, ["invited"]);
    assert.deepEqual(f.invalidations, [
      [{ queryKey: ["member-teams", "member"] }, { cancelRefetch: false, throwOnError: true }],
    ]);
    assert.deepEqual(
      f.navigations,
      action === "onAccept" ? [{ to: "/teams/$id", params: { id: "invited" } }] : [],
    );
  }
});

test("background read error retains cached UI while initial read error keeps retry panel", () => {
  setup([team()]);
  f.query.isPending = true;
  assert.equal(nodes(render(), "DashboardHubSkeleton").length, 1);
  f.query.isPending = false;
  f.query.error = new Error("Refresh failed");
  assert.equal(nodes(render(), "TeamSummaryCard").length, 1);
  assert.equal(nodes(render(), "TechPanel").length, 0);
  f.query.data = undefined;
  assert.equal(nodes(render(), "TechPanel")[0].props.title, "Could not load teams");
  assert.equal(nodes(render(), "TeamsEmptyState").length, 0);
});

test("empty state reuses Arena styling and retains create and tournament guidance", () => {
  setup([]);
  assert.equal(nodes(render(), "TeamsEmptyState").length, 1);
  let created = 0;
  const tree = TeamsEmptyState({
    onCreateTeam: () => {
      created++;
    },
  });
  const empty = nodes(tree, "ArenaEmptyState")[0];
  assert.match(empty.props.description, /ask a captain to invite you/);
  nodes(empty.props.actions, "Button")[0].props.onClick();
  assert.equal(created, 1);
  assert.equal(nodes(empty.props.actions, "Link")[0].props.to, "/tournaments");
  assert.equal(nodes(tree, "TournamentRegistrationGuide").length, 1);
  assert.equal(nodes(tree, "details").length, 0);
});
