/**
 * Client-side session cache for the signed-in member.
 *
 * Populated after Discord OAuth (`/auth/callback`) and kept in sync via
 * `syncSessionFromDatabase`. Clears when the tab closes (sessionStorage).
 */

import type { AppUser } from "../types";

const SESSION_KEY = "br_session";

export function getSession(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}

export function setSession(user: AppUser): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}

export function isLoggedIn(): boolean {
  return getSession() !== null;
}

export function isVerified(): boolean {
  const s = getSession();
  if (!s) return false;
  return s.role === "verified" || s.role === "admin";
}

export function isAdmin(): boolean {
  return getSession()?.role === "admin";
}
