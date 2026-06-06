/**
 * Admin Console session — localStorage flag after successful Supabase credential check.
 */

import { verifyAdminCredentials } from "./admin-auth.service";

const SESSION_KEY = "br_admin_session";

export function isAdminConsoleAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(SESSION_KEY);
}

export async function loginAdminConsole(username: string, password: string): Promise<boolean> {
  const ok = await verifyAdminCredentials(username, password);
  if (!ok) return false;
  localStorage.setItem(SESSION_KEY, username.trim().toLowerCase());
  return true;
}

export function logoutAdminConsole(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getAdminConsoleUser(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}
