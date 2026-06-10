import { fetchTournaments } from "@/features/admin/features/tournaments/services/tournaments.service";
import {
  fetchActiveMemberTeams,
  fetchRegistrationsForTeam,
} from "@/features/tournaments/services/team-registration.service";
import type { MockTeam } from "@/lib/mock-data";
import { getNotifications, mergeRegistrationStatusNotifications, notifyListeners } from "../store";
import type { AppNotification } from "../types";

const SNAPSHOT_KEY = "br_registration_status_snapshot";

function loadStatusSnapshot(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveStatusSnapshot(snapshot: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
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
): Promise<AppNotification[]> {
  const memberTeams = await fetchActiveMemberTeams(userId);
  if (!memberTeams.length) {
    mergeRegistrationStatusNotifications([]);
    saveStatusSnapshot({});
    notifyListeners();
    return [];
  }

  const tournaments = await fetchTournaments();
  const tournamentById = new Map(tournaments.map((t) => [t.id, t]));
  const previousSnapshot = loadStatusSnapshot();
  const nextSnapshot: Record<string, string> = {};
  const existingNotifications = getNotifications().filter(
    (n) => n.type === "registration_approved" || n.type === "registration_rejected",
  );
  const readById = new Map(
    existingNotifications.filter((n) => n.read).map((n) => [n.id, true] as const),
  );
  const createdAtById = new Map(
    existingNotifications.map((n) => [n.id, n.createdAt] as const),
  );

  const notifications: AppNotification[] = [];

  await Promise.all(
    memberTeams.map(async (team) => {
      const registrations = await fetchRegistrationsForTeam(team.id);
      for (const registration of registrations) {
        nextSnapshot[registration.id] = registration.status;

        if (!isTerminalStatus(registration.status)) continue;

        const tournament = tournamentById.get(registration.tournamentId);
        if (!tournament) continue;
        if (tournament.status === "Completed" || tournament.status === "Archived") continue;

        const unread = shouldMarkUnread(
          previousSnapshot[registration.id],
          registration.status,
        );
        const notificationId = `registration-${
          registration.status === "Approved" ? "approved" : "rejected"
        }-${registration.id}`;
        const notification = notificationForRegistration(
          registration,
          tournament.name,
          unread,
          createdAtById.get(notificationId),
        );
        notification.read = unread ? false : (readById.get(notification.id) ?? false);
        notifications.push(notification);
      }
    }),
  );

  saveStatusSnapshot(nextSnapshot);
  mergeRegistrationStatusNotifications(notifications);
  notifyListeners();
  return notifications;
}
