/**
 * Admin Console display cache only. The server's signed HttpOnly cookie is authoritative.
 */

import { validateAdminSession, verifyAdminCredentials } from "./admin-auth.service";
import { logoutAdminSession } from "@/features/auth/functions/session-auth.functions";

export const SESSION_KEY = "br_admin_session";

/** Sync localStorage presence check only — call ensureAdminConsoleSession for server validation. */
export function isAdminConsoleAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(SESSION_KEY);
}

/** Validate the signed server cookie, independently of localStorage availability. */
export async function ensureAdminConsoleSession(): Promise<boolean> {
  const valid = await validateAdminSession();
  if (!valid) clearAdminHint();
  return valid;
}

export async function loginAdminConsole(username: string, password: string): Promise<boolean> {
  const ok = await verifyAdminCredentials(username, password);
  if (!ok) return false;
  try {
    localStorage.setItem(SESSION_KEY, username.trim().toLowerCase());
  } catch {
    /* Display hint only. */
  }
  return true;
}

function clearAdminHint(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* Storage may be disabled. */
  }
}

export async function logoutAdminConsole(): Promise<void> {
  if (typeof window === "undefined") return;
  await logoutAdminSession();
  clearAdminHint();
}

export function getAdminConsoleUser(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}
