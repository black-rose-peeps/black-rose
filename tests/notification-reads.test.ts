import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import type { Team } from "../src/features/teams/types";
import type { MemberTournamentNotificationContext } from "../src/features/member/queries/member-data-queries";

const fixture = {
  rows: [] as { teamId: string; status: string; joinedAt?: string }[],
  teams: [] as ReturnType<typeof team>[],
  missing: [] as ReturnType<typeof team>[],
  requests: [] as {
    id: string;
    tournamentId: string;
    rosterTeamId: string;
    requesterUserId: string;
    createdAt: string;
  }[],
  alerts: [] as {
    commentId: string;
    authorDisplayName: string;
    bodyPreview: string;
    createdAt: string;
    profileSlug: string;
  }[],
  requesterReads: 0,
  reads: { memberships: 0, cached: 0, individual: 0, batches: [] as string[][] },
};
Object.assign(globalThis, { __notificationFixture: fixture });
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    let source: string | undefined;
    if (specifier === "@/features/admin/features/teams/services/teams.service") {
      source = `const f=globalThis.__notificationFixture;
        export async function fetchUserTeamMembershipRows(){f.reads.memberships++;return f.rows;}
        export async function fetchTeamById(id){f.reads.individual++;return [...f.teams,...f.missing].find(t=>t.id===id)??null;}
        export async function fetchTeamsByIds(ids){f.reads.batches.push(ids);return f.missing.filter(t=>ids.includes(t.id));}`;
    }
    if (specifier === "@/features/member/queries/member-data-queries") {
      source = `export async function fetchMemberTeamsCached(){const f=globalThis.__notificationFixture;f.reads.cached++;return f.teams;}
        export async function fetchTournamentsForNotificationsCached(){throw new Error('Expected supplied tournament context');}`;
    }
    if (specifier === "@/features/admin/features/members/services/members.service") {
      source = `export async function fetchMemberById(){globalThis.__notificationFixture.requesterReads++;return {username:'Requester'};}`;
    }
    if (specifier === "@/features/tournaments/services/tournament-registration-requests.service") {
      source = `export async function fetchPendingRegistrationRequestsForCaptain(){return globalThis.__notificationFixture.requests;}`;
    }
    if (specifier === "@/features/member/services/profile-comments.service") {
      source = `export async function fetchProfileCommentAlerts(){return globalThis.__notificationFixture.alerts;}`;
    }
    if (source)
      return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const service =
  await import("../src/features/notifications/services/team-membership-notifications");
const requests =
  await import("../src/features/notifications/services/tournament-registration-request-notifications");
const comments =
  await import("../src/features/notifications/services/profile-comment-notifications");
const registration =
  await import("../src/features/notifications/services/tournament-registration-notifications");
const live = await import("../src/features/notifications/services/tournament-live-notifications");
const store = await import("../src/features/notifications/store");
hooks.deregister();
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
function team(id: string) {
  return {
    id,
    name: id,
    tag: "TAG",
    game: "Valorant",
    members: [{ status: "captain", displayName: "Captain" }],
  };
}
function reset() {
  storage.clear();
  fixture.rows = [];
  fixture.teams = [];
  fixture.missing = [];
  fixture.requests = [];
  fixture.alerts = [];
  fixture.requesterReads = 0;
  fixture.reads = { memberships: 0, cached: 0, individual: 0, batches: [] };
  store.setNotificationMemberId("member");
}

test("membership sync reuses hydrated invites and skips unchanged active teams", async () => {
  reset();
  fixture.rows = [
    { teamId: "invite", status: "invited" },
    { teamId: "active", status: "active" },
  ];
  fixture.teams = [team("invite"), team("active")];
  const notifications = await service.syncTeamMembershipNotifications("member");
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, "team_invite");
  assert.match(notifications[0].body, /Captain invited you/);
  assert.equal(notifications[0].read, false);
  assert.deepEqual(fixture.reads, { memberships: 1, cached: 1, individual: 0, batches: [] });
});

test("membership sync batches only fresh removals and missing invites, ignoring dead teams", async () => {
  reset();
  storage.set(
    "br_team_membership_snapshot:member",
    JSON.stringify({ removed: "active", dead: "captain" }),
  );
  fixture.rows = [
    { teamId: "removed", status: "removed" },
    { teamId: "dead", status: "removed" },
    { teamId: "historical", status: "removed" },
    { teamId: "invite", status: "invited" },
    { teamId: "active", status: "active" },
  ];
  fixture.missing = [team("removed"), team("invite")];
  const notifications = await service.syncTeamMembershipNotifications("member");
  assert.deepEqual(
    notifications.map((n) => n.type),
    ["team_invite", "team_removed"],
  );
  assert.equal(notifications[1].read, false);
  assert.deepEqual(fixture.reads, {
    memberships: 1,
    cached: 1,
    individual: 0,
    batches: [["removed", "dead", "invite"]],
  });
  store.markAsRead("team-removed-removed");
  store.markAsRead("team-invite-invite");
  const repeated = await service.syncTeamMembershipNotifications("member");
  assert.ok(repeated.every((n) => n.read));
  assert.deepEqual(
    repeated.map((n) => n.createdAt),
    notifications.map((n) => n.createdAt),
  );
  assert.deepEqual(fixture.reads.batches[1], ["removed", "invite"]);
});

test("two concurrent membership sync callers share one read sequence", async () => {
  reset();
  fixture.rows = [{ teamId: "invite", status: "invited" }];
  fixture.teams = [team("invite")];
  const [first, second] = await Promise.all([
    service.syncTeamMembershipNotifications("member"),
    service.syncTeamMembershipNotifications("member"),
  ]);
  assert.deepEqual(first, second);
  assert.equal(store.getNotifications().length, 1);
  assert.deepEqual(fixture.reads, { memberships: 1, cached: 1, individual: 0, batches: [] });
});

test("concurrent different-member syncs keep read state and persisted lists isolated", async () => {
  reset();
  fixture.rows = [{ teamId: "invite", status: "invited" }];
  fixture.teams = [team("invite")];
  storage.set("br_notification_reads:member", JSON.stringify(["team-invite-invite"]));
  const first = service.syncTeamMembershipNotifications("member");
  store.setNotificationMemberId("other-member");
  const second = service.syncTeamMembershipNotifications("other-member");
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a[0].read, true);
  assert.equal(b[0].read, false);
  assert.equal(JSON.parse(storage.get("br_notifications:member")!)[0].read, true);
  assert.equal(JSON.parse(storage.get("br_notifications:other-member")!)[0].read, false);
  assert.equal(fixture.reads.memberships, 2);
});

test("registration requests reuse supplied roster teams instead of hydrating every request", async () => {
  reset();
  fixture.requests = ["one", "two"].map((id) => ({
    id,
    tournamentId: "tournament",
    rosterTeamId: "team",
    requesterUserId: "requester",
    createdAt: "2026-01-01T00:00:00Z",
  }));
  const teams = [team("team")];
  fixture.teams = teams;
  const notifications = await requests.syncTournamentRegistrationRequestNotifications(
    "member",
    [{ id: "tournament", name: "Cup", status: "Upcoming" }],
    teams as unknown as Team[],
  );
  assert.equal(notifications.length, 2);
  assert.match(notifications[0].body, /Requester asked you to register \[TAG\] team for Cup/);
  assert.equal(fixture.reads.individual, 0);
  assert.equal(fixture.requesterReads, 1);
});

test("shared tournament context preserves approval/live alerts, comment read state and timestamps", async () => {
  reset();
  const context = {
    memberTeams: [team("team")],
    tournaments: [{ id: "cup", name: "Cup", status: "Live" }],
    registrationsByTeamId: new Map([
      [
        "team",
        [{ id: "registration", tournamentId: "cup", name: "Team", tag: "TAG", status: "Approved" }],
      ],
    ]),
  } as unknown as MemberTournamentNotificationContext;
  const approved = await registration.syncTournamentRegistrationNotifications("member", context);
  const started = await live.syncTournamentLiveNotifications("member", context);
  assert.equal(approved[0].type, "registration_approved");
  assert.equal(started[0].type, "tournament_live");
  assert.equal(started[0].read, false);
  fixture.alerts = [
    {
      commentId: "comment",
      authorDisplayName: "Author",
      bodyPreview: "Hello",
      createdAt: "2026-01-01T00:00:00Z",
      profileSlug: "member",
    },
  ];
  const comment = await comments.syncProfileCommentNotifications("member");
  assert.match(comment[0].body, /Author commented on your profile/);
  assert.equal(comment[0].href, "/br/member");
  store.markAllAsRead();
  const repeated = await Promise.all([
    registration.syncTournamentRegistrationNotifications("member", context),
    live.syncTournamentLiveNotifications("member", context),
    comments.syncProfileCommentNotifications("member"),
  ]);
  assert.ok(repeated.flat().every((notification) => notification.read));
  assert.deepEqual(
    store
      .getNotifications()
      .map((n) => n.createdAt)
      .sort(),
    [approved[0].createdAt, started[0].createdAt, comment[0].createdAt].sort(),
  );
  assert.deepEqual(fixture.reads, { memberships: 0, cached: 0, individual: 0, batches: [] });
});
