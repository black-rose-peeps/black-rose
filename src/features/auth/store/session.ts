/**
 * Client-side session cache for the signed-in member.
 *
 * Populated after Discord OAuth (`/auth/callback`) and kept in sync via
 * `syncSessionFromDatabase`. Stored in localStorage so new tabs share the session.
 */

import type { AppUser } from "../types";
import { markDiscordLinked } from "../services/discord";

const SESSION_KEY = "br_session";
const SESSION_CHANGED = "br-session-changed";
const MEMBER_SESSION_COOKIE = "br_member_id";
const MEMBER_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function syncMemberSessionCookie(memberId: string): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${MEMBER_SESSION_COOKIE}=${encodeURIComponent(memberId)}; Path=/; Max-Age=${MEMBER_SESSION_MAX_AGE}; SameSite=Lax${secure}`;
}

function clearMemberSessionCookie(): void {
  document.cookie = `${MEMBER_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function notifySessionChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_CHANGED));
}

export function subscribeToSessionChanges(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  function onStorage(event: StorageEvent) {
    if (event.key === SESSION_KEY || event.key === null) {
      listener();
    }
  }

  window.addEventListener("storage", onStorage);
  window.addEventListener(SESSION_CHANGED, listener);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SESSION_CHANGED, listener);
  };
}

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
    syncMemberSessionCookie(user.id);
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
  try {
    const next = JSON.stringify(user);
    const current = localStorage.getItem(SESSION_KEY);
    if (current === next) return;

    localStorage.setItem(SESSION_KEY, next);
    sessionStorage.removeItem(SESSION_KEY);
    syncMemberSessionCookie(user.id);
    notifySessionChanged();

    if (user.discordId) {
      markDiscordLinked(user.discordId);
    }
  } catch {
    // Storage may be unavailable (private mode, quota, SSR edge cases).
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    clearMemberSessionCookie();
    notifySessionChanged();
  } catch {
    // Storage may be unavailable (private mode, quota, SSR edge cases).
  }
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
