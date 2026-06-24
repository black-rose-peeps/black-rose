import type { MockTeam } from "@/lib/mock-data";
import type { MemberTournamentNotificationContext } from "@/features/member/queries/member-data-queries";
import {
  getNotifications,
  isNotificationRead,
  mergeRegistrationStatusNotifications,
  notifyListeners,
} from "../store";
import type { AppNotification } from "../types";

const SNAPSHOT_KEY_PREFIX = "br_registration_status_snapshot:";

function snapshotKey(userId: string): string {
  return `${SNAPSHOT_KEY_PREFIX}${userId}`;
}

function loadStatusSnapshot(userId: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(snapshotKey(userId));
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveStatusSnapshot(userId: string, snapshot: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(snapshotKey(userId), JSON.stringify(snapshot));
  } catch {
    // Ignore quota errors
  }
}

function isTerminalStatus(status: MockTeam["status"]): boolean {
  return status === "Approved" || status === "Rejected";
}

function shouldMarkUnread(
  previousStatus: string | undefined,
  currentStatus: MockTeam["status"],
): boolean {
  if (!isTerminalStatus(currentStatus)) return false;
  if (previousStatus === undefined) return true;
  return previousStatus !== currentStatus;
}

function resolveRegistrationNotificationTime(
  registration: MockTeam,
  unread: boolean,
  existingCreatedAt?: string,
): string {
  if (unread) return new Date().toISOString();
  if (existingCreatedAt) return existingCreatedAt;
  if (registration.statusUpdatedAt) return registration.statusUpdatedAt;
  return new Date().toISOString();
}

function notificationForRegistration(
  registration: MockTeam,
  tournamentName: string,
  unread: boolean,
  existingCreatedAt?: string,
): AppNotification {
  const approved = registration.status === "Approved";
  return {
    id: `registration-${approved ? "approved" : "rejected"}-${registration.id}`,
    type: approved ? "registration_approved" : "registration_rejected",
    title: approved ? "Registration Approved" : "Registration Declined",
    body: approved
      ? `Your team ${registration.name} [${registration.tag}] is registered for ${tournamentName}.`
      : `Your team ${registration.name} [${registration.tag}] was not approved for ${tournamentName}.`,
    createdAt: resolveRegistrationNotificationTime(registration, unread, existingCreatedAt),
    read: !unread,
    href: `/tournaments/${registration.tournamentId}`,
  };
}

/** Pull approved/declined tournament registrations for the member's teams into notifications. */
export async function syncTournamentRegistrationNotifications(
  userId: string,
  context?: MemberTournamentNotificationContext,
): Promise<AppNotification[]> {
  if (!context) {
    const { loadMemberTournamentNotificationContext } = await import(
      "@/features/member/queries/member-data-queries"
    );
    return syncTournamentRegistrationNotifications(
      userId,
      await loadMemberTournamentNotificationContext(userId),
    );
  }

  const { memberTeams, tournaments, registrationsByTeamId } = context;
  if (!memberTeams.length) {
    mergeRegistrationStatusNotifications([]);
    saveStatusSnapshot(userId, {});
    notifyListeners();
    return [];
  }

  const tournamentById = new Map(tournaments.map((t) => [t.id, t]));
  const previousSnapshot = loadStatusSnapshot(userId);
  const nextSnapshot: Record<string, string> = {};
  const existingNotifications = getNotifications().filter(
    (n) => n.type === "registration_approved" || n.type === "registration_rejected",
  );
  const readById = new Map(
    existingNotifications.filter((n) => n.read).map((n) => [n.id, true] as const),
  );
  const createdAtById = new Map(existingNotifications.map((n) => [n.id, n.createdAt] as const));

  const notifications: AppNotification[] = [];

  for (const team of memberTeams) {
    const registrations = registrationsByTeamId.get(team.id) ?? [];
    for (const registration of registrations) {
      nextSnapshot[registration.id] = registration.status;

      if (!isTerminalStatus(registration.status)) continue;

      const tournament = tournamentById.get(registration.tournamentId);
      if (!tournament) continue;
      if (tournament.status === "Completed" || tournament.status === "Archived") continue;

      const notificationId = `registration-${
        registration.status === "Approved" ? "approved" : "rejected"
      }-${registration.id}`;
      const alreadyRead = isNotificationRead(notificationId);
      const unread =
        !alreadyRead && shouldMarkUnread(previousSnapshot[registration.id], registration.status);
      const read = unread
        ? false
        : readById.has(notificationId) || isNotificationRead(notificationId);
      notifications.push({
        ...notificationForRegistration(
          registration,
          tournament.name,
          unread,
          createdAtById.get(notificationId),
        ),
        read,
      });
    }
  }

  saveStatusSnapshot(userId, nextSnapshot);
  mergeRegistrationStatusNotifications(notifications);
  notifyListeners();
  return notifications;
}
