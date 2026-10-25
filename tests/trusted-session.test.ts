import assert from "node:assert/strict";
import { test } from "node:test";
import {
  sealPrincipal,
  unsealPrincipal,
} from "../src/features/auth/server/session-token.server.ts";

import { createTrustedSessionApi } from "../src/features/auth/server/trusted-session.server.ts";

const secret = "test-only-secret-with-at-least-32-characters";

function fixture() {
  const cookies = new Map<string, string>();
  const writes: { name: string; value: string; options: Record<string, unknown> }[] = [];
  let memberExists = true;
  let adminExists = true;
  const api = createTrustedSessionApi({
    secret: () => secret,
    readCookie: (name) => cookies.get(name),
    writeCookie: (name, value, options) => {
      cookies.set(name, value);
      writes.push({ name, value, options });
    },
    isHttps: () => false,
    memberExists: async () => memberExists,
    memberIsVerified: async () => true,
    findAdmin: async (id) => (adminExists ? { adminId: id, username: "staff" } : null),
  });
  return {
    api,
    cookies,
    writes,
    deleteMember: () => {
      memberExists = false;
    },
    deleteAdmin: () => {
      adminExists = false;
    },
  };
}

test("guards ignore legacy browser identity and require signed existing principals", async () => {
  const f = fixture();
  f.cookies.set("br_member_id", "forged-member");
  f.cookies.set("br_admin_session", "staff");
  assert.equal(await f.api.getTrustedMemberSession(), null);
  await assert.rejects(f.api.requireMemberSession(), /sign in again/i);
  await assert.rejects(f.api.requireAdminSession(), /admin.*sign in/i);
  f.api.issueMemberSession("member-1");
  assert.deepEqual(await f.api.requireMemberSession(), { memberId: "member-1" });
  assert.equal(f.writes[0].options.httpOnly, true);
  assert.equal(f.writes[0].options.sameSite, "lax");
  assert.equal(f.writes[0].options.secure, false);
  f.deleteMember();
  assert.equal(await f.api.getTrustedMemberSession(), null);
  f.api.issueAdminSession({ adminId: "admin-1", username: "staff" });
  assert.deepEqual(await f.api.requireAdminSession(), { adminId: "admin-1", username: "staff" });
  f.deleteAdmin();
  await assert.rejects(f.api.requireAdminSession(), /admin.*sign in/i);
  f.api.clearMemberSession();
  f.api.clearAdminSession();
  assert.equal(f.writes.at(-1)?.options.maxAge, 0);
  assert.equal(f.writes.at(-2)?.options.maxAge, 0);
});
test("signed sessions roundtrip only for their intended audience", () => {
  const token = sealPrincipal({ kind: "member", memberId: "member-1" }, secret, 1000);
  assert.deepEqual(unsealPrincipal(token, "member", secret, 1001), {
    kind: "member",
    memberId: "member-1",
  });
  assert.equal(unsealPrincipal(token, "admin", secret, 1001), null);
});
