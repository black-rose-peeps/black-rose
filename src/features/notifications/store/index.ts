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
  notifyListeners();
}

export function markAllAsRead(): void {
  const updated = getAll().map((n) => ({ ...n, read: true }));
  save(updated);
  notifyListeners();
}

export function clearAll(): void {
  save([]);
}

/** Replace team-invite notifications while preserving read state for still-pending invites. */
export function mergeTeamInviteNotifications(incoming: AppNotification[]): void {
  const existing = getAll();
  const readById = new Map(
    existing.filter((n) => n.read).map((n) => [n.id, true] as const),
  );
  const existingById = new Map(existing.map((n) => [n.id, n] as const));
  const other = existing.filter((n) => n.type !== "team_invite");
  const mergedInvites = incoming.map((n) => ({
    ...n,
    createdAt: existingById.get(n.id)?.createdAt ?? n.createdAt,
    read: n.read ? (readById.get(n.id) ?? true) : false,
  }));

  const combined = [...mergedInvites, ...other].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  save(combined);
}

export function markTeamInviteRead(teamId: string): void {
  markAsRead(`team-invite-${teamId}`);
}

const TEAM_EVENT_NOTIFICATION_TYPES = new Set<AppNotification["type"]>(["team_removed"]);

/** Replace team event notifications (e.g. removal) while preserving read state. */
export function mergeTeamEventNotifications(incoming: AppNotification[]): void {
  const existing = getAll();
  const readById = new Map(
    existing.filter((n) => n.read).map((n) => [n.id, true] as const),
  );
  const existingById = new Map(existing.map((n) => [n.id, n] as const));
  const other = existing.filter((n) => !TEAM_EVENT_NOTIFICATION_TYPES.has(n.type));
  const merged = incoming.map((n) => ({
    ...n,
    createdAt: existingById.get(n.id)?.createdAt ?? n.createdAt,
    read: n.read ? (readById.get(n.id) ?? true) : false,
  }));

  const combined = [...merged, ...other].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  save(combined);
}

export function markTeamRemovalRead(teamId: string): void {
  markAsRead(`team-removed-${teamId}`);
}

const REGISTRATION_NOTIFICATION_TYPES = new Set<AppNotification["type"]>([
  "registration_approved",
  "registration_rejected",
]);

/** Replace registration outcome notifications while preserving read state. */
export function mergeRegistrationStatusNotifications(incoming: AppNotification[]): void {
  const existing = getAll();
  const readById = new Map(
    existing.filter((n) => n.read).map((n) => [n.id, true] as const),
  );
  const existingById = new Map(existing.map((n) => [n.id, n] as const));
  const other = existing.filter((n) => !REGISTRATION_NOTIFICATION_TYPES.has(n.type));
  const merged = incoming.map((n) => ({
    ...n,
    createdAt: existingById.get(n.id)?.createdAt ?? n.createdAt,
    read: n.read ? (readById.get(n.id) ?? true) : false,
  }));

  const combined = [...merged, ...other].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  save(combined);
}

export function markRegistrationNotificationRead(registrationId: string, approved: boolean): void {
  markAsRead(`registration-${approved ? "approved" : "rejected"}-${registrationId}`);
}

const NOTIFICATIONS_UPDATED = "br-notifications-updated";

export function notifyListeners(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED));
}

export function subscribeToNotifications(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(NOTIFICATIONS_UPDATED, listener);
  return () => window.removeEventListener(NOTIFICATIONS_UPDATED, listener);
}
