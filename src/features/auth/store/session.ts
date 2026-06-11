/**
 * Client-side session cache for the signed-in member.
 *
 * Populated after Discord OAuth (`/auth/callback`) and kept in sync via
 * `syncSessionFromDatabase`. Stored in localStorage so new tabs share the session.
 */

import type { AppUser } from "../types";

const SESSION_KEY = "br_session";

function readStoredSession(): string | null {
  const fromLocal = localStorage.getItem(SESSION_KEY);
  if (fromLocal) return fromLocal;

  const legacy = sessionStorage.getItem(SESSION_KEY);
  if (!legacy) return null;

  localStorage.setItem(SESSION_KEY, legacy);
  sessionStorage.removeItem(SESSION_KEY);
  return legacy;
}

export function getSession(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = readStoredSession();
    if (!raw) return null;
    const user = JSON.parse(raw) as AppUser;
    return {
      ...user,
      discordUsername: user.discordUsername ?? user.username,
    };
  } catch {
    return null;
  }
}

export function setSession(user: AppUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  sessionStorage.removeItem(SESSION_KEY);
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
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
