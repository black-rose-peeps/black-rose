/**
 * Client-side notification store.
 *
 * Notifications are rebuilt from Supabase on sync; read state is persisted in
 * localStorage per member so it survives logout/login in the same browser.
 */

import type { AppNotification } from "../types";

const LEGACY_STORE_KEY = "br_notifications";
const READS_KEY_PREFIX = "br_notification_reads:";
const LIST_KEY_PREFIX = "br_notifications:";

let currentMemberId: string | null = null;

export function setNotificationMemberId(memberId: string | null): void {
  if (currentMemberId === memberId) return;
  currentMemberId = memberId;
}

function requireMemberId(): string | null {
  return currentMemberId;
}

function listKey(memberId: string): string {
  return `${LIST_KEY_PREFIX}${memberId}`;
}

function readsKey(memberId: string): string {
  return `${READS_KEY_PREFIX}${memberId}`;
}

function loadReadIds(memberId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(readsKey(memberId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(memberId: string, ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(readsKey(memberId), JSON.stringify([...ids]));
  } catch (err) {
    console.warn("[notifications] Failed to persist read state:", err);
  }
}

function persistReadId(memberId: string, id: string): void {
  const ids = loadReadIds(memberId);
  if (ids.has(id)) return;
  ids.add(id);
  saveReadIds(memberId, ids);
}

export function isNotificationRead(id: string, memberId = requireMemberId()): boolean {
  if (!memberId) return false;
  return loadReadIds(memberId).has(id);
}

function save(notifications: AppNotification[], memberId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(listKey(memberId), JSON.stringify(notifications));
  } catch (err) {
    console.warn("[notifications] Failed to persist notifications:", err);
  }
}

function load(memberId: string): AppNotification[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(listKey(memberId));
    return raw ? (JSON.parse(raw) as AppNotification[]) : null;
  } catch {
    return null;
  }
}

function migrateLegacyStore(memberId: string): void {
  if (typeof window === "undefined") return;
  try {
    const legacySession = sessionStorage.getItem(LEGACY_STORE_KEY);
    const legacyLocal = localStorage.getItem(LEGACY_STORE_KEY);
    const raw = legacySession ?? legacyLocal;
    if (!raw) return;

    const legacy = JSON.parse(raw) as AppNotification[];
    if (!Array.isArray(legacy) || legacy.length === 0) return;

    const readIds = loadReadIds(memberId);
    for (const notification of legacy) {
      if (notification.read) readIds.add(notification.id);
    }
    saveReadIds(memberId, readIds);
    save(legacy, memberId);

    sessionStorage.removeItem(LEGACY_STORE_KEY);
    localStorage.removeItem(LEGACY_STORE_KEY);
  } catch {
    // ignore corrupt legacy data
  }
}

function applyPersistedReadState(
  notifications: AppNotification[],
  memberId: string,
): AppNotification[] {
  const readIds = loadReadIds(memberId);
  return notifications.map((n) => ({
    ...n,
    read: n.read || readIds.has(n.id),
  }));
}

function getAll(): AppNotification[] {
  const memberId = requireMemberId();
  if (!memberId) return [];

  migrateLegacyStore(memberId);

  const stored = load(memberId);
  if (stored) return applyPersistedReadState(stored, memberId);

  save([], memberId);
  return [];
}

function mergeReadState(
  incoming: AppNotification[],
  existing: AppNotification[],
  memberId: string,
): AppNotification[] {
  const readIds = loadReadIds(memberId);
  const existingById = new Map(existing.map((n) => [n.id, n] as const));

  return incoming.map((n) => ({
    ...n,
    createdAt: existingById.get(n.id)?.createdAt ?? n.createdAt,
    read: readIds.has(n.id) || existingById.get(n.id)?.read === true || n.read,
  }));
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getNotifications(): AppNotification[] {
  return getAll();
}

export function getUnreadCount(): number {
  return getAll().filter((n) => !n.read).length;
}

export function markAsRead(id: string): void {
  const memberId = requireMemberId();
  if (!memberId) return;

  persistReadId(memberId, id);
  const updated = getAll().map((n) => (n.id === id ? { ...n, read: true } : n));
  save(updated, memberId);
  notifyListeners();
}

export function markAllAsRead(): void {
  const memberId = requireMemberId();
  if (!memberId) return;

  const current = getAll();
  const readIds = loadReadIds(memberId);
  for (const notification of current) {
    readIds.add(notification.id);
  }
  saveReadIds(memberId, readIds);

  const updated = current.map((n) => ({ ...n, read: true }));
  save(updated, memberId);
  notifyListeners();
}

export function clearAll(): void {
  const memberId = requireMemberId();
  if (!memberId) return;
  save([], memberId);
}

/** Replace team-invite notifications while preserving read state for still-pending invites. */
export function mergeTeamInviteNotifications(incoming: AppNotification[]): void {
  const memberId = requireMemberId();
  if (!memberId) return;

  const existing = getAll();
  const other = existing.filter((n) => n.type !== "team_invite");
  const mergedInvites = mergeReadState(incoming, existing, memberId);

  const combined = [...mergedInvites, ...other].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  save(combined, memberId);
}

export function markTeamInviteRead(teamId: string): void {
  markAsRead(`team-invite-${teamId}`);
}

const TEAM_EVENT_NOTIFICATION_TYPES = new Set<AppNotification["type"]>(["team_removed"]);

/** Replace team event notifications (e.g. removal) while preserving read state. */
export function mergeTeamEventNotifications(incoming: AppNotification[]): void {
  const memberId = requireMemberId();
  if (!memberId) return;

  const existing = getAll();
  const other = existing.filter((n) => !TEAM_EVENT_NOTIFICATION_TYPES.has(n.type));
  const merged = mergeReadState(incoming, existing, memberId);

  const combined = [...merged, ...other].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  save(combined, memberId);
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
  const memberId = requireMemberId();
  if (!memberId) return;

  const existing = getAll();
  const other = existing.filter((n) => !REGISTRATION_NOTIFICATION_TYPES.has(n.type));
  const merged = mergeReadState(incoming, existing, memberId);

  const combined = [...merged, ...other].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  save(combined, memberId);
}

export function markRegistrationNotificationRead(registrationId: string, approved: boolean): void {
  markAsRead(`registration-${approved ? "approved" : "rejected"}-${registrationId}`);
}

const PROFILE_COMMENT_NOTIFICATION_TYPES = new Set<AppNotification["type"]>(["profile_comment"]);

/** Replace profile comment notifications while preserving read state. */
export function mergeProfileCommentNotifications(incoming: AppNotification[]): void {
  const memberId = requireMemberId();
  if (!memberId) return;

  const existing = getAll();
  const other = existing.filter((n) => !PROFILE_COMMENT_NOTIFICATION_TYPES.has(n.type));
  const merged = mergeReadState(incoming, existing, memberId);

  const combined = [...merged, ...other].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  save(combined, memberId);
}

export function markProfileCommentRead(commentId: string): void {
  markAsRead(`profile-comment-${commentId}`);
}

const REGISTRATION_REQUEST_NOTIFICATION_TYPES = new Set<AppNotification["type"]>([
  "registration_request",
]);

export function mergeRegistrationRequestNotifications(incoming: AppNotification[]): void {
  const memberId = requireMemberId();
  if (!memberId) return;

  const existing = getAll();
  const other = existing.filter((n) => !REGISTRATION_REQUEST_NOTIFICATION_TYPES.has(n.type));
  const merged = mergeReadState(incoming, existing, memberId);

  const combined = [...merged, ...other].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  save(combined, memberId);
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
