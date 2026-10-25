import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("request context must never authenticate the unsigned legacy cookie", () => {
  const source = read("start.ts");
  assert.doesNotMatch(source, /parseMemberSessionCookie/);
  assert.match(source, /getTrustedMemberSession/);
});

test("Discord login establishes server credentials, not browser flags", () => {
  const source = read("features/auth/functions/complete-discord-auth.ts");
  assert.match(source, /issueMemberSession\(member.id\)/);
  assert.match(source, /assertTrustedOrigin\(\)/);
  assert.ok(
    source.indexOf("fetchDiscordUser(accessToken)") <
      source.indexOf("issueMemberSession(member.id)"),
  );
  assert.doesNotMatch(read("features/auth/store/session.ts"), /syncMemberSessionCookie/);
});

test("profile function boundary replaces every caller-supplied identity", () => {
  const source = read("features/member/functions/member-profile.functions.ts");
  assert.match(source, /getTrustedMemberSession/);
  assert.match(source, /requireMemberSession/);
  assert.doesNotMatch(source, /fetchMemberProfileBySlug\(data.slug, data.viewerMemberId\)/);
  assert.doesNotMatch(source, /fetchMemberProfileByMemberId\(data.memberId\)/);
  assert.doesNotMatch(source, /return updateMemberProfile\(data\)/);
});

test("actual logout clears server cookies and UI callers await it", () => {
  assert.match(read("features/auth/store/session.ts"), /await logoutMemberSession/);
  assert.match(read("features/admin/auth/admin-session.ts"), /await logoutAdminSession/);
  assert.match(read("features/member/components/MemberNav.tsx"), /await clearSession\(/);
  assert.match(read("routes/waitlist.tsx"), /await clearSession\(/);
  assert.match(read("features/admin/components/AdminSidebar.tsx"), /await logoutAdminConsole\(/);
  assert.match(read("features/admin/components/AdminMobileNav.tsx"), /await logoutAdminConsole\(/);
  for (const path of [
    "features/member/components/MemberNav.tsx",
    "routes/waitlist.tsx",
    "features/admin/components/AdminSidebar.tsx",
    "features/admin/components/AdminMobileNav.tsx",
  ])
    assert.match(read(path), /toast.error\("Could not sign out/);
});

test("admin credential login must never run from the browser Supabase client", () => {
  const source = read("features/admin/auth/admin-auth.service.ts");
  assert.doesNotMatch(source, /supabase.rpc/);
  assert.match(source, /loginAdminSession/);
  assert.doesNotMatch(source, /localStorage|verify_admin_session/);
});

test("admin server handler keeps password verification and privileged identity lookup server-side", () => {
  const source = read("features/auth/server/session-auth.server.ts");
  assert.match(source, /getSupabaseAdmin\(\).rpc\("verify_admin_login"/);
  assert.match(source, /select\("id,username"\)/);
  assert.doesNotMatch(source, /select\("\*"\)|password_hash/);
  const boundary = read("features/auth/functions/session-auth.functions.ts");
  assert.match(boundary, /await import\("\.\.\/server\/session-auth.server"\)/);
});
