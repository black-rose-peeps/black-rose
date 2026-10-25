import assert from "node:assert/strict";
import { test } from "node:test";
import { createSessionAuthApi } from "../src/features/auth/server/session-auth.server.ts";
import { createTrustedSessionApi } from "../src/features/auth/server/trusted-session.server.ts";

function fixture() {
  const cookies = new Map<string, string>();
  const writes: {
    name: string;
    options: { httpOnly: boolean; secure: boolean; maxAge: number };
  }[] = [];
  let accepted = true;
  let trustedOrigin = true;
  let checks = 0;
  const sessions = createTrustedSessionApi({
    secret: () => "test-only-session-secret-at-least-32-characters",
    readCookie: (name) => cookies.get(name),
    writeCookie: (name, value, options) => {
      cookies.set(name, value);
      writes.push({ name, options });
    },
    isHttps: () => true,
    memberExists: async () => true,
    memberIsVerified: async () => false,
    findAdmin: async (adminId) => ({ adminId, username: "staff" }),
  });
  const auth = createSessionAuthApi({
    ...sessions,
    assertTrustedOrigin: () => {
      if (!trustedOrigin) throw new Error("same-origin required");
    },
    verifyCredentials: async (username, password) => {
      checks++;
      assert.equal(username, "staff");
      assert.equal(password, "password");
      return accepted;
    },
    findAdminByUsername: async () => ({ adminId: "admin-1", username: "staff" }),
  });
  return {
    auth,
    sessions,
    cookies,
    writes,
    rejectCredentials: () => {
      accepted = false;
    },
    crossSite: () => {
      trustedOrigin = false;
    },
    checks: () => checks,
  };
}

test("forged browser flags cannot validate admin; credential proof issues an HttpOnly HTTPS cookie and logout invalidates it", async () => {
  const f = fixture();
  f.cookies.set("br_admin_session", "staff");
  assert.equal(await f.auth.validateAdminSession(), false);
  assert.equal(await f.auth.loginAdminSession({ username: " staff ", password: "password" }), true);
  assert.equal(f.checks(), 1);
  assert.equal(await f.auth.validateAdminSession(), true);
  assert.equal(f.writes.at(-1)?.options.httpOnly, true);
  assert.equal(f.writes.at(-1)?.options.secure, true);
  await f.auth.logoutAdminSession();
  assert.equal(f.writes.at(-1)?.options.maxAge, 0);
  assert.equal(await f.auth.validateAdminSession(), false);
});

test("failed credentials never issue a session", async () => {
  const f = fixture();
  f.rejectCredentials();
  assert.equal(await f.auth.loginAdminSession({ username: "staff", password: "password" }), false);
  assert.equal(f.writes.length, 0);
  assert.equal(await f.auth.validateAdminSession(), false);
});

test("cross-origin login and logout are rejected before credentials or cookies change", async () => {
  const f = fixture();
  f.crossSite();
  await assert.rejects(
    f.auth.loginAdminSession({ username: "staff", password: "password" }),
    /same-origin/,
  );
  await assert.rejects(f.auth.logoutAdminSession(), /same-origin/);
  await assert.rejects(f.auth.logoutMemberSession(), /same-origin/);
  assert.equal(f.checks(), 0);
  assert.equal(f.writes.length, 0);
});

test("unverified signed member may read own profile but cannot enter verified write boundary; logout clears cookie", async () => {
  const f = fixture();
  f.sessions.issueMemberSession("member-1");
  assert.deepEqual(await f.sessions.requireMemberSession(), { memberId: "member-1" });
  await assert.rejects(f.sessions.requireVerifiedMemberSession(), /verification/i);
  await f.auth.logoutMemberSession();
  await assert.rejects(f.sessions.requireMemberSession(), /sign in/i);
  assert.equal(f.writes.at(-1)?.options.maxAge, 0);
});
