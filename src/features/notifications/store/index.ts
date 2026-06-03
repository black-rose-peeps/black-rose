/**
 * Client-side notification store — frontend placeholder.
 *
 * Persists to sessionStorage so notifications survive page navigation
 * but reset when the tab closes (matching the session lifetime).
 *
 * TODO: Replace with real API calls (/api/notifications) when backend is ready.
 */

import type { AppNotification } from "../types";
import { MOCK_NOTIFICATIONS } from "../constants";

const STORE_KEY = "br_notifications";

// ── Persistence ───────────────────────────────────────────────────────────────

function load(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : null!;
  } catch {
    return null!;
  }
}

function save(notifications: AppNotification[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(notifications));
}

// ── Initialise with mock data on first load ───────────────────────────────────

function getAll(): AppNotification[] {
  const stored = load();
  if (stored) return stored;
  // First visit — seed with mock data
  save(MOCK_NOTIFICATIONS);
  return MOCK_NOTIFICATIONS;
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
