import { supabase } from "@/lib/supabase";

const SESSION_KEY = "br_admin_session";

/** Verify admin console credentials against `admin_accounts` via Supabase RPC. */
export async function verifyAdminCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("verify_admin_login", {
    p_username: username.trim(),
    p_password: password,
  });

  if (error) throw new Error(error.message);
  return data === true;
}

/** Confirm stored session username still exists in `admin_accounts`. */
export async function validateAdminSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const username = localStorage.getItem(SESSION_KEY);
  if (!username) return false;

  const { data, error } = await supabase.rpc("verify_admin_session", {
    p_username: username,
  });

  if (error) {
    console.error("Admin session validation failed:", error);
    return false;
  }

  return data === true;
}
