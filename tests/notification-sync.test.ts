import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "../src/lib/query-keys";

type Invalidation = { queryKey: readonly unknown[]; refetchType?: "none" | "active" };
type Channel = {
  on: (event: unknown, options: { table: string }, callback: () => void) => Channel;
  subscribe: () => Channel;
};
type Client = {
  invalidateQueries: (options: Invalidation) => Promise<void>;
  cancelQueries: (options: { queryKey: readonly unknown[] }) => Promise<void>;
};

const f = {
  effect: undefined as undefined | (() => void),
  cleanup: undefined as undefined | (() => void),
  flush: undefined as undefined | (() => Promise<void>),
  handlers: new Map<string, () => void>(),
  invalidations: [] as Invalidation[],
  calls: [] as string[],
  channel: {} as Channel,
  client: {} as Client,
  readTournaments: undefined as undefined | (() => Promise<unknown[]>),
  gameReads: 0,
  gameFailure: false,
  teamReads: 0,
  newAcceptance: false,
  intervals: [] as { callback: () => void; delay: number }[],
  clearedIntervals: [] as number[],
};
f.client = {
  invalidateQueries: async (options: Invalidation) => {
    f.invalidations.push(options);
  },
  cancelQueries: async () => {},
};
f.channel = {
  on: (_: unknown, options: { table: string }, callback: () => void) => {
    f.handlers.set(options.table, callback);
    return f.channel;
  },
  subscribe: () => f.channel,
};
Object.assign(globalThis, { __notificationSync: f, window: new EventTarget() });
Object.assign(window, {
  setInterval(callback: () => void, delay: number) {
    f.intervals.push({ callback, delay });
    return f.intervals.length;
  },
  clearInterval(id: number) {
    f.clearedIntervals.push(id);
  },
});
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    let source: string | undefined;
    if (specifier === "react")
      source = `export function useEffect(effect){globalThis.__notificationSync.cleanup=effect();}`;
    if (specifier === "@tanstack/react-query")
      source = `export function useQueryClient(){return globalThis.__notificationSync.client;}`;
    if (specifier === "@/lib/supabase")
      source = `export function getSupabaseClient(){return {channel:()=>globalThis.__notificationSync.channel,removeChannel:async()=>{}};}`;
    if (specifier === "@/lib/debounce-refetch")
      source = `export function createDebouncedRefetch(fn){const f=globalThis.__notificationSync;const run=()=>{f.flush=fn};run.cancel=()=>{f.flush=undefined};return run;}`;
    if (specifier === "@/features/tournaments/hooks")
      source = `export const TOURNAMENTS_QUERY_KEY=['tournaments'];`;
    if (specifier === "@/features/member/queries/member-data-queries")
      source = `
      const f=globalThis.__notificationSync;
      export async function fetchActiveMemberTeamsCached(){f.teamReads++;return [{id:'team'}];}
      export async function fetchTournamentsLiteCached(){f.calls.push('tournaments');return f.readTournaments?f.readTournaments():[];}
      export function invalidateMemberDataQueries(){f.calls.push('broad-invalidation');}
      export async function loadMemberTournamentNotificationContext(){f.calls.push('context');return {memberTeams:[{id:'team'}],tournaments:[],registrationsByTeamId:new Map()};}`;
    const services = {
      "team-membership-notifications": "syncTeamMembershipNotifications",
      "profile-comment-notifications": "syncProfileCommentNotifications",
      "tournament-registration-request-notifications":
        "syncTournamentRegistrationRequestNotifications",
      "tournament-registration-notifications": "syncTournamentRegistrationNotifications",
      "tournament-live-notifications": "syncTournamentLiveNotifications",
    };
    for (const [name, fn] of Object.entries(services)) {
      if (specifier.endsWith(`/services/${name}`))
        source = `export async function ${fn}(){globalThis.__notificationSync.calls.push('${name}');return [];}`;
    }
    if (specifier === "../store") source = `export function setNotificationMemberId(){}`;
    if (specifier.endsWith("/services/game-membership-notifications"))
      source = `export async function syncGameMembershipNotifications(){const f=globalThis.__notificationSync;f.gameReads++;if(f.gameFailure)throw Error('Approval feed failed');return{notifications:[],hasNewAcceptance:f.newAcceptance}}`;
    if (source)
      return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const { useNotificationSync } =
  await import("../src/features/notifications/hooks/useNotificationSync");
hooks.deregister();
const settle = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};

test("comment events sync only comments without invalidating member or tournament data", async () => {
  useNotificationSync("member");
  await settle();
  f.calls = [];
  f.handlers.get("profile_comments")!();
  await f.flush!();
  await settle();
  assert.deepEqual(f.calls, ["profile-comment-notifications"]);
  assert.deepEqual(f.invalidations, []);
  f.cleanup!();
});

test("focus and realtime bursts coalesce while membership changes invalidate only related data", async () => {
  f.calls = [];
  f.invalidations = [];
  useNotificationSync("member");
  await settle();
  f.calls = [];
  window.dispatchEvent(new Event("focus"));
  window.dispatchEvent(new Event("focus"));
  await f.flush!();
  assert.equal(f.calls.filter((name) => name === "context").length, 1);
  assert.deepEqual(f.invalidations, []);
  f.calls = [];
  f.handlers.get("team_members")!();
  f.handlers.get("team_members")!();
  await f.flush!();
  assert.equal(f.calls.filter((name) => name === "context").length, 1);
  const keys = f.invalidations.map((entry) => entry.queryKey);
  assert.ok(keys.some((key) => key[0] === "member-championships"));
  assert.ok(keys.some((key) => key[0] === "team-registrations" && key[1] === "team"));
  assert.ok(!keys.some((key) => key[0] === "tournaments"));
  assert.ok(f.handlers.has("teams"), "team metadata changes must refresh hydrated team context");
  assert.ok(f.handlers.has("tournaments"), "live tournament changes must sync alerts");
  f.cleanup!();
});

test("a realtime change cannot leave an older background tournament read fresh in cache", async () => {
  const previousClient = f.client;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  f.client = client;
  useNotificationSync("member");
  await settle();
  const key = queryKeys.tournamentsLite();
  let resolveOld!: (rows: { id: string; name: string; status: string }[]) => void;
  const old = client
    .fetchQuery({
      queryKey: key,
      queryFn: () =>
        new Promise<{ id: string; name: string; status: string }[]>((resolve) => {
          resolveOld = resolve;
        }),
      staleTime: 60_000,
    })
    .catch(() => undefined);
  f.readTournaments = () =>
    client.fetchQuery({
      queryKey: key,
      queryFn: async () => [{ id: "cup", name: "Cup", status: "Live" }],
      staleTime: 60_000,
    });
  try {
    f.handlers.get("tournaments")!();
    const updated = f.flush!();
    await settle();
    resolveOld([{ id: "cup", name: "Cup", status: "Upcoming" }]);
    await Promise.all([updated, old]);
    assert.equal(client.getQueryData<{ status: string }[]>(key)?.[0].status, "Live");
  } finally {
    f.cleanup!();
    f.readTournaments = undefined;
    f.client = previousClient;
    client.clear();
  }
});

test("game approvals sync on startup and foreground polling without broad member reads", async () => {
  f.gameReads = 0;
  f.newAcceptance = false;
  f.intervals = [];
  f.clearedIntervals = [];
  useNotificationSync("member");
  try {
    await settle();
    assert.equal(f.gameReads, 1);
    assert.equal(f.intervals[0]?.delay, 60_000);
    f.calls = [];
    f.invalidations = [];
    f.intervals[0].callback();
    await f.flush!();
    assert.equal(f.gameReads, 2);
    assert.deepEqual(f.calls, []);
    assert.equal(f.invalidations.length, 0);
    f.newAcceptance = true;
    f.intervals[0].callback();
    await f.flush!();
    assert.deepEqual(
      f.invalidations.map((item) => item.queryKey),
      [["my-game-workspace", "member"]],
    );
  } finally {
    f.newAcceptance = false;
    f.cleanup!();
  }
  assert.deepEqual(f.clearedIntervals, [1]);
});

test("hidden pages skip approval polling while focus still refreshes approval alerts", async () => {
  f.gameReads = 0;
  f.intervals = [];
  useNotificationSync("member");
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  try {
    await settle();
    Object.defineProperty(globalThis, "document", { configurable: true, value: { hidden: true } });
    assert.equal(f.intervals.length, 1);
    f.intervals[0].callback();
    assert.equal(f.gameReads, 1);
    window.dispatchEvent(new Event("focus"));
    await f.flush!();
    assert.equal(f.gameReads, 2);
  } finally {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else Reflect.deleteProperty(globalThis, "document");
    f.cleanup!();
  }
});

test("a private approval read failure does not interrupt legacy membership sync and can retry", async () => {
  f.gameReads = 0;
  f.teamReads = 0;
  f.gameFailure = true;
  f.intervals = [];
  const previousError = console.error;
  const previousWarn = console.warn;
  console.error = console.warn = () => {};
  useNotificationSync("member");
  try {
    await settle();
    assert.equal(
      f.teamReads,
      2,
      "initial subscription and post-sync membership refresh both finish",
    );
    assert.equal(f.gameReads, 1);
    f.gameFailure = false;
    f.intervals[0].callback();
    await f.flush!();
    assert.equal(f.gameReads, 2);
  } finally {
    f.gameFailure = false;
    f.cleanup!();
    console.error = previousError;
    console.warn = previousWarn;
  }
});
