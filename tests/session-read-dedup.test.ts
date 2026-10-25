import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import type { AppUser } from "../src/features/auth/types";

type Snapshot = {
  memberId: string;
  username: string;
  discordUsername: string;
  discordId: string;
  status: "Verified" | "Not Verified";
  registeredAt: string;
  displayName?: string;
  profileSlug?: string;
  avatarUrl?: string;
};
type Pending = {
  kind: "session" | "access";
  memberId: string;
  resolve: (value: Snapshot) => void;
  reject: (error: Error) => void;
};
let current: AppUser | null = null;
let writes = 0;
const pending: Pending[] = [];
const io = {
  getSession: () => current && { ...current },
  setSession(user: AppUser) {
    writes += 1;
    current = user;
  },
  read(kind: Pending["kind"], { data }: { data: { memberId: string } }) {
    return new Promise<Snapshot>((resolve, reject) => {
      pending.push({ kind, memberId: data.memberId, resolve, reject });
    });
  },
};
Object.assign(globalThis, { __sessionReadTestIO: io, window: { setTimeout } });
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    const mocks: Record<string, string> = {
      "../functions/refresh-member-session":
        'export const refreshMemberSession = (input) => globalThis.__sessionReadTestIO.read("session", input);',
      "../functions/refresh-member-access":
        'export const refreshMemberAccess = (input) => globalThis.__sessionReadTestIO.read("access", input);',
      "../store/session":
        "export const { getSession, setSession } = globalThis.__sessionReadTestIO;",
    };
    if (mocks[specifier]) {
      return {
        url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});
const service = await import("../src/features/auth/services/sync-session");
hooks.deregister();

function user(id = "member-a"): AppUser {
  return {
    id,
    discordId: "123456789012345678",
    username: "old-user",
    discordUsername: "old.discord",
    displayName: "Local display",
    avatarUrl: "local-avatar",
    profileSlug: "local-slug",
    email: "local@example.test",
    role: "not_verified",
    registeredAt: "2026-01-01",
  };
}
function snapshot(memberId = "member-a"): Snapshot {
  return {
    memberId,
    username: "server-user",
    discordUsername: "server.discord",
    discordId: "123456789012345678",
    status: "Verified",
    registeredAt: "2025-01-01",
    displayName: "Server display",
    profileSlug: "server-slug",
    avatarUrl: "server-avatar",
  };
}
function reset() {
  current = user();
  writes = 0;
  pending.length = 0;
}

const refreshers = [
  ["session", service.syncSessionFromDatabase],
  ["access", service.syncMemberAccessFromDatabase],
] as const;

for (const [kind, refresh] of refreshers) {
  for (const transition of ["signout", "switch"] as const) {
    test(`${kind} ignores a response after ${transition}`, async () => {
      reset();
      const read = refresh();
      current = transition === "signout" ? null : user("member-b");
      const expected = current;
      pending[0].resolve(snapshot());
      assert.equal(await read, null);
      assert.equal(current, expected);
      assert.equal(writes, 0);
    });
  }

  test(`${kind} merges into current same-member state without clobbering local edits`, async () => {
    reset();
    const first = refresh();
    current = {
      ...current!,
      displayName: "Just edited",
      avatarUrl: "new-local-avatar",
      profileSlug: "new-local-slug",
      email: "new@example.test",
    };
    const second = refresh();
    for (const request of pending) request.resolve(snapshot());
    const results = await Promise.all([first, second]);
    for (const result of results) {
      assert.equal(result?.displayName, "Just edited");
      assert.equal(result?.avatarUrl, "new-local-avatar");
      assert.equal(result?.profileSlug, "new-local-slug");
      assert.equal(result?.email, "new@example.test");
      assert.equal(result?.role, "verified");
    }
    assert.equal(current?.displayName, "Just edited");
  });

  test(`${kind} realtime invalidation queues one fresh read behind an older snapshot`, async () => {
    reset();
    const initial = refresh();
    const changed = refresh({ fresh: true });
    const repeated = refresh({ fresh: true });
    pending[0].resolve(snapshot());
    await new Promise<void>((resolve) => setImmediate(resolve));
    const reads = pending.length;
    if (pending[1]) pending[1].resolve({ ...snapshot(), status: "Not Verified" });
    const results = await Promise.all([initial, changed, repeated]);
    assert.equal(reads, 2, "an authoritative change must not reuse only the pre-change snapshot");
    assert.ok(results.every((result) => result?.role === "not_verified"));
    assert.equal(current?.role, "not_verified");
  });

  test(`${kind} coalesces concurrent reads and refetches after success`, async () => {
    reset();
    const reads = [refresh(), refresh()];
    const count = pending.length;
    for (const request of pending) request.resolve(snapshot());
    const results = await Promise.all(reads);
    assert.equal(count, 1);
    assert.ok(results.every((result) => result?.role === "verified"));

    const next = refresh();
    assert.equal(pending.length, 2);
    pending[1].resolve({ ...snapshot(), status: "Not Verified" });
    assert.equal((await next)?.role, "not_verified");
  });
}

test("session refresh works without Vite import.meta.env in Node", async () => {
  reset();
  const read = service.syncSessionFromDatabase();
  assert.equal(pending.length, 1);
  pending[0].resolve(snapshot());
  assert.equal((await read)?.role, "verified");
});
