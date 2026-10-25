import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import * as store from "../src/features/notifications/store";
import type { AppNotification } from "../src/features/notifications/types";

const storage = new Map<string, string>();
const localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};
Object.assign(globalThis, {
  window: new EventTarget(),
  localStorage,
  sessionStorage: localStorage,
});

function acceptance(event: string, overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: `game-membership-accepted-${event}`,
    type: "game_membership_accepted",
    title: "Game membership accepted",
    body: "You’ve been accepted into Black Rose for Valorant.",
    createdAt: "2026-10-20T01:00:00Z",
    read: false,
    href: "/dashboard?view=games&focusGame=game-uuid",
    ...overrides,
  };
}

beforeEach(() => {
  storage.clear();
  store.setNotificationMemberId("member-a");
});

test("acceptance merges deduplicate stable event IDs and preserve unrelated notifications", () => {
  const invite = acceptance("invite", { id: "team-invite-team", type: "team_invite" });
  store.mergeTeamInviteNotifications([invite]);
  store.mergeGameMembershipNotifications([acceptance("audit-1"), acceptance("audit-1")]);
  assert.deepEqual(store.getNotifications(), [acceptance("audit-1"), invite]);
});

test("read IDs and original timestamps survive resync and logout while the next acceptance stays unread", () => {
  store.mergeGameMembershipNotifications([acceptance("audit-1")]);
  store.markAsRead("game-membership-accepted-audit-1");
  store.setNotificationMemberId(null);
  store.setNotificationMemberId("member-a");
  store.mergeGameMembershipNotifications([
    acceptance("audit-1", { createdAt: "2026-10-21T01:00:00Z" }),
    acceptance("audit-2", { createdAt: "2026-10-22T01:00:00Z" }),
  ]);
  assert.deepEqual(store.getNotifications(), [
    acceptance("audit-2", { createdAt: "2026-10-22T01:00:00Z" }),
    acceptance("audit-1", { read: true }),
  ]);
  assert.equal(store.getUnreadCount(), 1);
  assert.deepEqual(JSON.parse(storage.get("br_notification_reads:member-a")!), [
    "game-membership-accepted-audit-1",
  ]);
  store.mergeGameMembershipNotifications([]);
  store.mergeGameMembershipNotifications([acceptance("audit-1")]);
  assert.equal(store.getNotifications()[0].read, true);
});

test("authoritative empty replaces only acceptances and late explicit-member merges cannot clear another member", () => {
  const invite = acceptance("invite", { id: "team-invite-team", type: "team_invite" });
  store.mergeTeamInviteNotifications([invite]);
  store.mergeGameMembershipNotifications([acceptance("audit-1")]);
  store.markAllAsRead();
  store.setNotificationMemberId("member-b");
  store.mergeGameMembershipNotifications([acceptance("audit-1")]);
  const memberB = storage.get("br_notifications:member-b");
  store.mergeGameMembershipNotifications([], "member-a");
  assert.deepEqual(store.getNotifications("member-a"), [{ ...invite, read: true }]);
  assert.equal(storage.get("br_notifications:member-b"), memberB);
  assert.deepEqual(store.getNotifications(), [acceptance("audit-1")]);
  assert.equal(store.isNotificationRead("game-membership-accepted-audit-1", "member-a"), true);
  assert.equal(store.isNotificationRead("game-membership-accepted-audit-1", "member-b"), false);
});

test("merges without a member are no-ops and unrelated incoming types cannot overwrite existing categories", () => {
  store.setNotificationMemberId(null);
  store.mergeGameMembershipNotifications([acceptance("audit-1")]);
  assert.equal(storage.size, 0);
  store.setNotificationMemberId("member-a");
  const invite = acceptance("invite", { id: "team-invite-team", type: "team_invite" });
  store.mergeTeamInviteNotifications([invite]);
  store.mergeGameMembershipNotifications([{ ...invite, title: "Not an acceptance" }]);
  assert.deepEqual(store.getNotifications(), [invite]);
});
