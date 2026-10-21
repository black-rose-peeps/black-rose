import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
const memberId = "11111111-1111-4111-8111-111111111111";
const f = {
  signedIn: true,
  clients: 0,
  error: false,
  rows: [] as Record<string, unknown>[],
  reads: [] as { table: string; columns: string; filters: [string, unknown][] }[],
};
Object.assign(globalThis, { __gameAcceptanceFeed: f });
const hook = registerHooks({
  resolve(specifier, context, next) {
    let source: string | undefined;
    if (specifier === "@/features/auth/server/trusted-session.server")
      source = `export async function requireMemberSession(){if(!globalThis.__gameAcceptanceFeed.signedIn)throw Error('Sign in required');return{memberId:'${memberId}'}}`;
    if (specifier === "@/lib/supabase-admin")
      source = `const f=globalThis.__gameAcceptanceFeed;export function getSupabaseAdmin(){f.clients++;return{from(table){const read={table,columns:'',filters:[]};f.reads.push(read);let range;const q={select(columns){read.columns=columns;return q},eq(key,value){read.filters.push([key,value]);return q},order(){return q},range(a,b){range=[a,b];return q},then(resolve,reject){let rows=f.rows.filter(row=>read.filters.every(([k,v])=>row[k]===v));if(range)rows=rows.slice(range[0],Math.min(range[0]+2,range[1]+1));return Promise.resolve({data:rows,error:f.error?{message:'Acceptance feed unavailable'}:null}).then(resolve,reject)}};return q}}}`;
    return source
      ? { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true }
      : next(specifier, context);
  },
});
const service =
  await import("../src/features/notifications/server/game-membership-notifications.server");
hook.deregister();
function event(id: string, gameId: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    member_id: memberId,
    game_id: gameId,
    old_status: "applying",
    new_status: "accepted",
    created_at: "2026-10-20T12:00:00.000Z",
    reason: "PRIVATE REASON",
    actor_id: "PRIVATE ACTOR",
    games: { id: gameId, name: gameId, display_name: `Game ${gameId}`, is_active: true },
    ...overrides,
  };
}
function reset() {
  f.signedIn = true;
  f.clients = 0;
  f.error = false;
  f.rows = [];
  f.reads = [];
}

test("acceptance feed requires a signed-in member before privileged reads", async () => {
  reset();
  f.signedIn = false;
  await assert.rejects(service.fetchMyGameMembershipAcceptances(), /Sign in/);
  assert.equal(f.clients, 0);
});

test("acceptance feed returns only the current member's minimal acceptance events", async () => {
  reset();
  f.rows = [
    event("event-1", "aion"),
    event("other-account", "secret", { member_id: "other" }),
    event("application", "valorant", { new_status: "applying" }),
    event("event-2", "palworld", { old_status: null }),
    event("no-transition", "bad", { old_status: "accepted" }),
  ];
  const result = await service.fetchMyGameMembershipAcceptances();
  assert.deepEqual(result, {
    memberId,
    events: [
      {
        eventId: "event-1",
        gameId: "aion",
        gameName: "Game aion",
        createdAt: "2026-10-20T12:00:00.000Z",
      },
      {
        eventId: "event-2",
        gameId: "palworld",
        gameName: "Game palworld",
        createdAt: "2026-10-20T12:00:00.000Z",
      },
    ],
  });
  assert.ok(f.reads.length >= 2, "traverse a smaller API cap");
  assert.ok(
    f.reads.every(
      (read) =>
        read.table === "game_membership_events" &&
        read.filters.some(([k, v]) => k === "member_id" && v === memberId),
    ),
  );
  assert.ok(
    f.reads.every((read) => !read.columns.includes("reason") && !read.columns.includes("actor")),
  );
});

test("inactive, missing and malformed acceptance summaries are withheld without changing source rows", async () => {
  reset();
  f.rows = [
    event("inactive", "aion", { games: { id: "aion", name: "Aion 2", is_active: false } }),
    event("missing", "missing", { games: null }),
    event("bad-date", "bad", { created_at: "not-a-date" }),
    event("array", "palworld", {
      games: [{ id: "palworld", display_name: "Palworld", is_active: true }],
    }),
  ];
  const original = structuredClone(f.rows);
  assert.deepEqual(
    (await service.fetchMyGameMembershipAcceptances()).events.map((item) => item.eventId),
    ["array"],
  );
  assert.deepEqual(f.rows, original);
});

test("acceptance feed propagates failures instead of representing them as an empty inbox", async () => {
  reset();
  f.error = true;
  await assert.rejects(service.fetchMyGameMembershipAcceptances(), /Acceptance feed unavailable/);
});

test("acceptance history is bounded even when a member has many older approvals", async () => {
  reset();
  f.rows = Array.from({ length: 150 }, (_, i) => event(`event-${i}`, "aion"));
  const result = await service.fetchMyGameMembershipAcceptances();
  assert.equal(result.events.length, 100);
  assert.ok(!result.events.some((item) => item.eventId === "event-100"));
});
