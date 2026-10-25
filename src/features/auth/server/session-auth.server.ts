import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  assertTrustedOrigin,
  requireAdminSession,
  issueAdminSession,
  clearAdminSession,
  clearMemberSession,
} from "./trusted-session.server";

type Admin = { adminId: string; username: string };
interface AuthDependencies {
  assertTrustedOrigin: () => void;
  verifyCredentials: (username: string, password: string) => Promise<boolean>;
  findAdminByUsername: (username: string) => Promise<Admin | null>;
  requireAdminSession: () => Promise<Admin>;
  issueAdminSession: (admin: Admin) => void;
  clearAdminSession: () => void;
  clearMemberSession: () => void;
}

/** Password proof and cookie transport are server-only; browser flags are never inputs. */
export function createSessionAuthApi(deps: AuthDependencies) {
  return {
    async loginAdminSession(input: { username: string; password: string }): Promise<boolean> {
      deps.assertTrustedOrigin();
      const username = input.username.trim();
      if (!username || username.length > 256 || !input.password || input.password.length > 4096)
        return false;
      if (!(await deps.verifyCredentials(username, input.password))) return false;
      const admin = await deps.findAdminByUsername(username);
      if (!admin) return false;
      deps.issueAdminSession(admin);
      return true;
    },
    async validateAdminSession(): Promise<boolean> {
      try {
        await deps.requireAdminSession();
        return true;
      } catch {
        return false;
      }
    },
    async logoutAdminSession(): Promise<void> {
      deps.assertTrustedOrigin();
      deps.clearAdminSession();
    },
    async logoutMemberSession(): Promise<void> {
      deps.assertTrustedOrigin();
      deps.clearMemberSession();
    },
  };
}

export const sessionAuth = createSessionAuthApi({
  assertTrustedOrigin,
  requireAdminSession,
  issueAdminSession,
  clearAdminSession,
  clearMemberSession,
  verifyCredentials: async (username, password) => {
    const { data, error } = await getSupabaseAdmin().rpc("verify_admin_login", {
      p_username: username,
      p_password: password,
    });
    if (error) throw new Error("Admin sign in is unavailable. Please try again.");
    return data === true;
  },
  findAdminByUsername: async (username) => {
    // Match the RPC's case-insensitive semantics without treating SQL wildcards as identity.
    const pattern = username.replace(/[\\%_]/g, "\\$&");
    const { data, error } = await getSupabaseAdmin()
      .from("admin_accounts")
      .select("id,username")
      .ilike("username", pattern)
      .maybeSingle();
    if (error) throw new Error("Admin sign in is unavailable. Please try again.");
    return data ? { adminId: data.id, username: data.username } : null;
  },
});
