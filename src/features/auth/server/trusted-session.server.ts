import {
  getCookie,
  setCookie,
  getRequestProtocol,
  getRequestUrl,
  getRequestHeader,
} from "@tanstack/react-start/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  sealPrincipal,
  unsealPrincipal,
  requireSessionSecret,
  SESSION_MAX_AGE,
} from "./session-token.server";

export const TRUSTED_MEMBER_COOKIE = "br_member_session";
export const TRUSTED_ADMIN_COOKIE = "br_admin_auth";
type AdminSession = { adminId: string; username: string };
type CookieOptions = {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
};
interface SessionDependencies {
  secret: () => string;
  readCookie: (name: string) => string | undefined;
  writeCookie: (name: string, value: string, options: CookieOptions) => void;
  isHttps: () => boolean;
  memberExists: (memberId: string) => Promise<boolean>;
  memberIsVerified: (memberId: string) => Promise<boolean>;
  findAdmin: (adminId: string) => Promise<AdminSession | null>;
}

/** Injectable transport/repository seam; never accepts a browser-supplied principal. */
export function createTrustedSessionApi(deps: SessionDependencies) {
  function options(maxAge: number): CookieOptions {
    return { httpOnly: true, sameSite: "lax", secure: deps.isHttps(), path: "/", maxAge };
  }
  async function getTrustedMemberSession(): Promise<{ memberId: string } | null> {
    const token = deps.readCookie(TRUSTED_MEMBER_COOKIE);
    if (!token) return null;
    const principal = unsealPrincipal(token, "member", deps.secret());
    if (!principal || principal.kind !== "member" || !(await deps.memberExists(principal.memberId)))
      return null;
    return { memberId: principal.memberId };
  }
  async function requireMemberSession(): Promise<{ memberId: string }> {
    const session = await getTrustedMemberSession();
    if (!session) throw new Error("Please sign in again.");
    return session;
  }
  async function requireAdminSession(): Promise<AdminSession> {
    const token = deps.readCookie(TRUSTED_ADMIN_COOKIE);
    const principal = token ? unsealPrincipal(token, "admin", deps.secret()) : null;
    if (!principal || principal.kind !== "admin")
      throw new Error("Admin access requires sign in again.");
    const admin = await deps.findAdmin(principal.adminId);
    if (!admin || admin.username !== principal.username)
      throw new Error("Admin access requires sign in again.");
    return admin;
  }
  async function requireVerifiedMemberSession(): Promise<{ memberId: string }> {
    const session = await requireMemberSession();
    if (!(await deps.memberIsVerified(session.memberId)))
      throw new Error("Member verification is required.");
    return session;
  }
  function issueMemberSession(memberId: string) {
    deps.writeCookie(
      TRUSTED_MEMBER_COOKIE,
      sealPrincipal({ kind: "member", memberId }, deps.secret()),
      options(SESSION_MAX_AGE.member),
    );
  }
  function issueAdminSession(admin: AdminSession) {
    deps.writeCookie(
      TRUSTED_ADMIN_COOKIE,
      sealPrincipal({ kind: "admin", ...admin }, deps.secret()),
      options(SESSION_MAX_AGE.admin),
    );
  }
  function clearMemberSession() {
    deps.writeCookie(TRUSTED_MEMBER_COOKIE, "", options(0));
  }
  function clearAdminSession() {
    deps.writeCookie(TRUSTED_ADMIN_COOKIE, "", options(0));
  }
  return {
    getTrustedMemberSession,
    requireMemberSession,
    requireVerifiedMemberSession,
    requireAdminSession,
    issueMemberSession,
    issueAdminSession,
    clearMemberSession,
    clearAdminSession,
  };
}

const sessions = createTrustedSessionApi({
  secret: requireSessionSecret,
  readCookie: getCookie,
  writeCookie: setCookie,
  isHttps: () => getRequestProtocol() === "https",
  memberExists: async (memberId) => {
    const { data, error } = await getSupabaseAdmin()
      .from("members")
      .select("id")
      .eq("id", memberId)
      .maybeSingle();
    if (error) throw new Error("Could not validate member session.");
    return !!data;
  },
  findAdmin: async (adminId) => {
    const { data, error } = await getSupabaseAdmin()
      .from("admin_accounts")
      .select("id,username")
      .eq("id", adminId)
      .maybeSingle();
    if (error) throw new Error("Could not validate admin session.");
    return data ? { adminId: data.id, username: data.username } : null;
  },
  memberIsVerified: async (memberId) => {
    const { data, error } = await getSupabaseAdmin()
      .from("members")
      .select("status")
      .eq("id", memberId)
      .maybeSingle();
    if (error) throw new Error("Could not validate member verification.");
    return data?.status === "Verified";
  },
});

export const {
  getTrustedMemberSession,
  requireMemberSession,
  requireVerifiedMemberSession,
  requireAdminSession,
  issueMemberSession,
  issueAdminSession,
  clearMemberSession,
  clearAdminSession,
} = sessions;

/** Defense in depth alongside Start's global serverFn CSRF middleware. Call before writes. */
export function assertTrustedOrigin(): void {
  const origin = getRequestHeader("origin");
  if (
    !origin ||
    origin !== getRequestUrl().origin ||
    getRequestHeader("sec-fetch-site") === "cross-site"
  ) {
    throw new Error("A same-origin request is required. Reload this app and try again.");
  }
}
