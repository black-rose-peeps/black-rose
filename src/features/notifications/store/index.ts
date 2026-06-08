/**
 * Client-side notification store.
 *
 * Persists to sessionStorage so notifications survive page navigation
 * but reset when the tab closes (matching the session lifetime).
 * Starts empty until a notifications API is wired up.
 */

import type { AppNotification } from "../types";

const STORE_KEY = "br_notifications";

// ── Persistence ───────────────────────────────────────────────────────────────

function save(notifications: AppNotification[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(notifications));
  } catch (err) {
    console.warn("[notifications] Failed to persist to sessionStorage:", err);
  }
}

function load(): AppNotification[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : null;
  } catch {
    return null;
  }
}

function getAll(): AppNotification[] {
  const stored = load();
  if (stored) return stored;
  save([]);
  return [];
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getNotifications(): AppNotification[] {
  return getAll();
}

export function getUnreadCount(): number {
  return getAll().filter((n) => !n.read).length;
}

export function markAsRead(id: string): void {
  const updated = getAll().map((n) => (n.id === id ? { ...n, read: true } : n));
  save(updated);
}

export function markAllAsRead(): void {
  const updated = getAll().map((n) => ({ ...n, read: true }));
  save(updated);
}

export function clearAll(): void {
  save([]);
}
