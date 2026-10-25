import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import type { GameMembershipAcceptanceFeed } from "../src/features/notifications/types/game-membership";
import type { AppNotification } from "../src/features/notifications/types";
const f = {
  feed: { memberId: "member", events: [] } as GameMembershipAcceptanceFeed,
  existing: [] as AppNotification[],
  readIds: new Set<string>(),
  merges: [] as AppNotification[][],
  reads: 0,
  failed: false,
  gate: undefined as Promise<void> | undefined,
};
Object.assign(globalThis, { __acceptanceNotificationSync: f });
const hook = registerHooks({
  resolve(specifier, context, next) {
    let source: string | undefined;
    if (specifier.endsWith("/functions/game-membership-notifications.functions"))
      source = `export async function fetchMyGameMembershipAcceptances(){const f=globalThis.__acceptanceNotificationSync;f.reads++;const result=structuredClone(f.feed);await f.gate;if(f.failed)throw Error('Feed failed');return result;}`;
    if (specifier === "../store")
      source = `const f=globalThis.__acceptanceNotificationSync;export const getNotifications=()=>f.existing;export const isNotificationRead=id=>f.readIds.has(id);export function mergeGameMembershipNotifications(rows){f.merges.push(rows);f.existing=rows;}export function notifyListeners(){}`;
    return source
      ? { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true }
      : next(specifier, context);
  },
});
const service =
  await import("../src/features/notifications/services/game-membership-notifications");
hook.deregister();
const acceptance = {
  eventId: "event-1",
  gameId: "game-1",
  gameName: "Aion 2",
  createdAt: "2026-10-20T12:00:00.000Z",
};
function reset() {
  f.feed = { memberId: "member", events: [acceptance] };
  f.existing = [];
  f.readIds.clear();
  f.merges = [];
  f.reads = 0;
  f.failed = false;
  f.gate = undefined;
}

test("acceptance sync creates a stable unread alert and preserves its read state on repeated sync", async () => {
  reset();
  const first = await service.syncGameMembershipNotifications("member");
  assert.equal(first.hasNewAcceptance, true);
  assert.deepEqual(first.notifications, [
    {
      id: "game-membership-accepted-event-1",
      type: "game_membership_accepted",
      title: "Game membership accepted",
      body: "You’ve been accepted into Black Rose for Aion 2.",
      createdAt: acceptance.createdAt,
      read: false,
      href: "/dashboard?view=games&focusGame=game-1",
    },
  ]);
  f.readIds.add(first.notifications[0].id);
  const again = await service.syncGameMembershipNotifications("member");
  assert.equal(again.hasNewAcceptance, false);
  assert.equal(again.notifications[0].read, true);
  assert.equal(again.notifications[0].createdAt, acceptance.createdAt);
});

test("a new acceptance event is unread even for the same game, and duplicate IDs do not duplicate alerts", async () => {
  reset();
  await service.syncGameMembershipNotifications("member");
  f.readIds.add("game-membership-accepted-event-1");
  const newer = { ...acceptance, eventId: "event-2", createdAt: "2026-10-21T12:00:00.000Z" };
  f.feed.events = [newer, newer, acceptance];
  const result = await service.syncGameMembershipNotifications("member");
  assert.equal(result.hasNewAcceptance, true);
  assert.equal(result.notifications.length, 2);
  assert.equal(result.notifications.find((item) => item.id.endsWith("event-2"))?.read, false);
  assert.equal(result.notifications.find((item) => item.id.endsWith("event-1"))?.read, true);
});

test("concurrent acceptance sync calls share one request and one merge", async () => {
  reset();
  let release!: () => void;
  f.gate = new Promise<void>((resolve) => (release = resolve));
  const first = service.syncGameMembershipNotifications("member");
  const second = service.syncGameMembershipNotifications("member");
  assert.equal(first, second);
  assert.equal(f.reads, 1);
  release();
  await first;
  assert.equal(f.merges.length, 1);
});

test("mismatched account responses and failed reads cannot overwrite notification state", async () => {
  reset();
  f.feed.memberId = "other-member";
  await assert.rejects(service.syncGameMembershipNotifications("member"), /account|session/i);
  assert.equal(f.merges.length, 0);
  f.feed.memberId = "member";
  f.failed = true;
  await assert.rejects(service.syncGameMembershipNotifications("member"), /Feed failed/);
  assert.equal(f.merges.length, 0);
  f.failed = false;
  assert.equal((await service.syncGameMembershipNotifications("member")).notifications.length, 1);
});
