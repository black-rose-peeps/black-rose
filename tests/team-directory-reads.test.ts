/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic hook/module host models heterogeneous React slots. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/query-core";
import ts from "typescript";

// Exercise the actual component at its rendered props/event boundary, with a
// small hook host and real TanStack cache/observer (no browser or database).
const f: any = {
  client: undefined,
  slots: [],
  cursor: 0,
  effects: [],
  pending: false,
  tree: undefined,
  reads: 0,
  championships: [],
  notifications: 0,
  navigations: [],
  marked: [],
  session: { id: "member", role: "member" },
  syncing: false,
  serverTeams: [],
  realtime: undefined,
  failRead: false,
};
const equalDeps = (a: any[], b: any[]) =>
  a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
function schedule() {
  if (f.pending) return;
  f.pending = true;
  queueMicrotask(() => {
    f.pending = false;
    render();
  });
}
f.useState = (initial: any) => {
  const index = f.cursor++;
  if (!f.slots[index])
    f.slots[index] = { value: typeof initial === "function" ? initial() : initial };
  return [
    f.slots[index].value,
    (value: any) => {
      f.slots[index].value = typeof value === "function" ? value(f.slots[index].value) : value;
      schedule();
    },
  ];
};
f.useCallback = (fn: any) => fn;
f.useEffect = (effect: any, deps: any[]) => {
  const index = f.cursor++;
  const previous = f.slots[index];
  if (equalDeps(previous?.deps, deps)) return;
  f.slots[index] = { deps, cleanup: previous?.cleanup };
  f.effects.push(() => {
    previous?.cleanup?.();
    f.slots[index].cleanup = effect();
  });
};
f.useQuery = (options: any) => {
  const index = f.cursor++;
  let slot = f.slots[index];
  if (!slot) {
    const observer = new QueryObserver(f.client, options);
    slot = f.slots[index] = { observer, cleanup: observer.subscribe(schedule) };
  } else slot.observer.setOptions(options);
  return slot.observer.getCurrentResult();
};
f.fetchTeams = async () => {
  f.reads++;
  if (f.failRead) throw new Error("Teams unavailable");
  const snapshot = f.serverTeams;
  const gate = f.nextReadGate;
  f.nextReadGate = undefined;
  await gate;
  return snapshot;
};
f.navigate = (options: any) => f.navigations.push(options);
Object.assign(globalThis, { __teamDirectory: f });
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    let source: string | undefined;
    if (specifier === "react")
      source = `const f=globalThis.__teamDirectory; export const useState=f.useState,useEffect=f.useEffect,useCallback=f.useCallback;`;
    if (specifier === "react/jsx-runtime")
      source = `export const Fragment='Fragment'; export const jsx=(type,props,key)=>({type,props,key}); export const jsxs=jsx;`;
    if (specifier === "@tanstack/react-query")
      source = `const f=globalThis.__teamDirectory; export const useQuery=f.useQuery; export const useQueryClient=()=>f.client;`;
    if (specifier === "@tanstack/react-router")
      source = `export const Link='Link'; export const useNavigate=()=>globalThis.__teamDirectory.navigate;`;
    if (specifier === "lucide-react")
      source = `export const Plus='Plus',Trophy='Trophy',ChevronRight='ChevronRight',Crown='Crown';`;
    if (specifier.endsWith("/services/teams.service"))
      source = `const f=globalThis.__teamDirectory;
      export const fetchTeamsForUser=f.fetchTeams;
      export const rosterActorFromMemberSession=()=>({});
      export async function acceptTeamInvite(){f.serverTeams=f.serverTeams.map(t=>({...t,members:t.members.map(m=>({...m,status:'active'}))}));}
      export async function declineTeamInvite(){f.serverTeams=[];}`;
    if (specifier.endsWith("/useSyncedMemberSession"))
      source = `export const useSyncedMemberSession=()=>({session:globalThis.__teamDirectory.session,isSyncing:globalThis.__teamDirectory.syncing});`;
    if (specifier.endsWith("/auth/utils/routes"))
      source = `export const hasFullMemberAccess=role=>role==='member';`;
    if (specifier.endsWith("/services/team-membership-notifications"))
      source = `export async function syncTeamMembershipNotifications(){globalThis.__teamDirectory.notifications++;}`;
    if (specifier.endsWith("/notifications/store"))
      source = `export const markTeamInviteRead=id=>globalThis.__teamDirectory.marked.push(id);`;
    if (specifier.endsWith("/useTeamMembersRealtime"))
      source = `export const useMemberTeamMembershipRealtime=(id,fn)=>{globalThis.__teamDirectory.realtime=id?fn:undefined;};`;
    if (specifier.endsWith("/services/championship.service"))
      source = `export async function fetchTeamsChampionshipMap(ids,options){globalThis.__teamDirectory.championships.push({ids,options});return new Map();}`;
    if (specifier === "@/features/teams/constants") source = `export const GAME_ACCENT={};`;
    if (
      specifier.startsWith("@/") &&
      ["/lib/query-keys", "/member/queries/member-query-options", "/teams/utils/membership"].some(
        (s) => specifier.endsWith(s),
      )
    ) {
      return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    const names = [
      "Button",
      "DashboardHubSkeleton",
      "MemberHeroBanner",
      "TechPanel",
      "CreateTeamDialog",
      "TeamsEmptyState",
      "TeamInviteCard",
      "ChampionMarkGroup",
      "RoseStarMark",
    ];
    if (specifier.startsWith("@/") && specifier.includes("/components/")) {
      source = names.map((name) => `export const ${name}='${name}';`).join("\n");
    }
    if (source)
      return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith("/TeamDirectory.tsx"))
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
hooks.deregister();
function render() {
  f.cursor = 0;
  f.tree = TeamDirectory({
    navigation: null,
    openCreateFromUrl: f.openCreate,
    onCreateIntentConsumed: f.consumed,
  });
  const effects = f.effects.splice(0);
  effects.forEach((effect: any) => effect());
}
function nodes(type: string): any[] {
  const result: any[] = [];
  function walk(node: any) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.type === type || node.type?.name === type) result.push(node);
    walk(node.props?.children);
  }
  walk(f.tree);
  return result;
}
async function settle() {
  for (let i = 0; i < 8; i++) await new Promise((resolve) => setTimeout(resolve, 2));
}
const team = (status = "invited", name = "Roses") => ({
  id: "team",
  name,
  tag: "RS",
  game: "Valorant",
  captainUserId: "captain",
  members: [{ userId: "member", status }],
});
function setup(teams = [team()]) {
  for (const slot of f.slots) slot?.cleanup?.();
  f.client?.clear();
  Object.assign(f, {
    client: new QueryClient({
      defaultOptions: { queries: { retry: false, retryDelay: 0, gcTime: Infinity } },
    }),
    slots: [],
    effects: [],
    reads: 0,
    championships: [],
    notifications: 0,
    navigations: [],
    marked: [],
    serverTeams: teams,
    failRead: false,
    openCreate: false,
    consumed: () => {},
    syncing: false,
  });
}

test("My Teams reuses a fresh shared read, supplies hydration, and observes notification cache updates", async () => {
  setup();
  const cached = [team()];
  f.client.setQueryData(["member-teams", "member"], cached);
  render();
  await settle();
  assert.equal(f.reads, 0, "mount must not repeat an already hydrated shared read");
  assert.equal(nodes("TeamInviteCard")[0]?.props.team.name, "Roses");
  assert.deepEqual(f.championships[0]?.options?.teams, cached);
  f.client.setQueryData(["member-teams", "member"], [team("active", "Updated by notifications")]);
  await settle();
  assert.equal(nodes("TeamInviteCard").length, 0);
  assert.equal(nodes("TeamSummaryCard")[0]?.props.team.name, "Updated by notifications");
});

test("accepting and declining invitations refresh fresh cache entries and preserve navigation/read markers", async () => {
  for (const action of ["onAccept", "onDecline"]) {
    setup();
    f.client.setQueryData(["member-teams", "member"], f.serverTeams);
    render();
    await settle();
    nodes("TeamInviteCard")[0].props[action]();
    await settle();
    assert.equal(
      f.reads,
      1,
      "a successful mutation must bypass the still-fresh pre-mutation cache",
    );
    assert.equal(nodes("TeamInviteCard").length, 0);
    assert.deepEqual(f.marked, ["team"]);
    if (action === "onAccept") {
      assert.equal(nodes("TeamSummaryCard")[0]?.props.team.name, "Roses");
      assert.equal(
        f.client.getQueryData(["member-teams", "member"])[0].members[0].status,
        "active",
      );
      assert.deepEqual(f.navigations, [{ to: "/teams/$id", params: { id: "team" } }]);
    } else {
      assert.equal(nodes("TeamsEmptyState").length, 1);
      assert.deepEqual(f.client.getQueryData(["member-teams", "member"]), []);
      assert.deepEqual(f.navigations, []);
    }
    assert.ok(f.notifications >= 2, "membership notifications must also resync after mutation");
  }
});

test("realtime invalidates shared teams without cancelling an active read", async () => {
  setup([team("active")]);
  f.client.setQueryData(["member-teams", "member"], f.serverTeams);
  render();
  await settle();
  const invalidations: any[] = [];
  const invalidate = f.client.invalidateQueries.bind(f.client);
  f.client.invalidateQueries = (...args: any[]) => {
    invalidations.push(args);
    return invalidate(...args);
  };
  f.serverTeams = [team("active", "Realtime team")];
  f.realtime();
  await settle();
  assert.equal(f.reads, 1);
  assert.equal(nodes("TeamSummaryCard")[0]?.props.team.name, "Realtime team");
  assert.deepEqual(invalidations[0][0].queryKey, ["member-teams", "member"]);
  assert.equal(invalidations[0][1].cancelRefetch, false);
});

test("a synchronized session gates reads and preserves create intent consumption", async () => {
  setup([]);
  f.syncing = true;
  let consumed = 0;
  f.openCreate = true;
  f.consumed = () => {
    consumed++;
    f.openCreate = false;
  };
  render();
  await settle();
  assert.equal(f.reads, 0);
  assert.equal(nodes("DashboardHubSkeleton").length, 1);
  assert.equal(consumed, 0);
  f.syncing = false;
  render();
  await settle();
  assert.equal(f.reads, 1);
  assert.equal(consumed, 1);
  assert.equal(nodes("CreateTeamDialog")[0]?.props.open, true);
});

test("a failed initial read exposes a working retry", async () => {
  setup();
  f.failRead = true;
  render();
  await settle();
  assert.equal(nodes("TechPanel")[0]?.props.title, "Could not load teams");
  f.failRead = false;
  nodes("Button")
    .find((node) => node.props.children === "Retry")!
    .props.onClick();
  await settle();
  assert.equal(nodes("TechPanel").length, 0);
  assert.equal(nodes("TeamInviteCard")[0]?.props.team.name, "Roses");
});

test("creating a team refreshes the directory cache before the next consumer reads it", async () => {
  setup([]);
  f.client.setQueryData(["member-teams", "member"], []);
  render();
  await settle();
  f.serverTeams = [team("active")];
  nodes("CreateTeamDialog")[0].props.onCreated({ id: "team" });
  await settle();
  assert.equal(f.reads, 1);
  assert.equal(nodes("TeamSummaryCard")[0]?.props.team.name, "Roses");
  assert.deepEqual(f.navigations, [{ to: "/teams/$id", params: { id: "team" } }]);
});

test("a pre-mutation in-flight read cannot restore the old invitation after acceptance", async () => {
  setup();
  f.client.setQueryData(["member-teams", "member"], f.serverTeams);
  render();
  await settle();
  let release!: () => void;
  f.nextReadGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const background = f.client.refetchQueries({ queryKey: ["member-teams", "member"] });
  nodes("TeamInviteCard")[0].props.onAccept();
  await settle();
  release();
  await background;
  await settle();
  assert.equal(
    nodes("TeamInviteCard").length,
    0,
    "the final read must start after the membership mutation",
  );
  assert.equal(f.client.getQueryData(["member-teams", "member"])[0].members[0].status, "active");
});
