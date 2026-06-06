/**
 * Admin Console session — localStorage flag after successful Supabase credential check.
 */

import { validateAdminSession, verifyAdminCredentials } from "./admin-auth.service";

export const SESSION_KEY = "br_admin_session";

/** Sync localStorage presence check only — call ensureAdminConsoleSession for server validation. */
export function isAdminConsoleAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(SESSION_KEY);
}

/** Validate session against Supabase; clears localStorage if the admin no longer exists. */
export async function ensureAdminConsoleSession(): Promise<boolean> {
  if (!isAdminConsoleAuthenticated()) return false;
  const valid = await validateAdminSession();
  if (!valid) logoutAdminConsole();
  return valid;
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
