/**
 * Client-side session store — frontend placeholder
 *
 * This simulates a session until a real backend + auth is implemented.
 * Replace this entire module with your actual session management
 * (e.g., a JWT cookie, a TanStack Query cache of /api/me, or a context provider)
 * when the backend is ready.
 *
 * The store uses sessionStorage so it clears when the tab closes,
 * matching the expected behaviour of a short-lived auth token.
 */

import type { AppUser } from "../types";

const SESSION_KEY = "br_session";

// ── Read / write ─────────────────────────────────────────────────────────────

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

// ── Convenience helpers ───────────────────────────────────────────────────────

export function isLoggedIn(): boolean {
  return getSession() !== null;
}

export function isVerified(): boolean {
  const s = getSession();
  return s?.role === "verified" || s?.role === "admin";
}

export function isAdmin(): boolean {
  return getSession()?.role === "admin";
}

// ── Frontend simulation ───────────────────────────────────────────────────────
// Remove these once real auth is wired up.

/**
 * Simulate a new Discord registration.
 * Creates a not_verified session so the waitlist page can display user info.
 *
 * TODO: Replace with real Discord OAuth2 callback handling.
 */
export function simulateDiscordRegister(): AppUser {
  const user: AppUser = {
    id: `mock_${Date.now()}`,
    username: "newplayer",
    displayName: "New Player",
    avatarUrl: null,
    email: null,
    role: "not_verified",
    registeredAt: new Date().toISOString(),
  };
  setSession(user);
  return user;
}

/**
 * Simulate an admin verifying a user.
 * Updates the current session role to "verified".
 *
 * TODO: Replace with a real API call (PATCH /api/users/:id/role).
 */
export function simulateAdminVerify(): void {
  const current = getSession();
  if (!current) return;
  setSession({ ...current, role: "verified" });
}
