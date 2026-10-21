import {
  loginAdminSession,
  validateAdminSession as validateServerAdminSession,
} from "@/features/auth/functions/session-auth.functions";

/** Verify admin console credentials against `admin_accounts` via Supabase RPC. */
export async function verifyAdminCredentials(username: string, password: string): Promise<boolean> {
  return loginAdminSession({ data: { username: username.trim(), password } });
}

/** Confirm stored session username still exists in `admin_accounts`. */
export async function validateAdminSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    return await validateServerAdminSession();
  } catch {
    return false;
  }
}
