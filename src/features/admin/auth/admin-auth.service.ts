import { supabase } from "@/lib/supabase";

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
