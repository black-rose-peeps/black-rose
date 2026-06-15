import { fetchTournaments } from "@/features/admin/features/tournaments/services/tournaments.service";
import {
  fetchActiveMemberTeams,
  fetchRegistrationsForTeam,
} from "@/features/tournaments/services/team-registration.service";
import type { MockTeam } from "@/lib/mock-data";
import {
  getNotifications,
  isNotificationRead,
  mergeTournamentLiveNotifications,
  notifyListeners,
} from "../store";
import type { AppNotification } from "../types";

const SNAPSHOT_KEY_PREFIX = "br_tournament_live_snapshot:";

function snapshotKey(userId: string): string {
  return `${SNAPSHOT_KEY_PREFIX}${userId}`;
}

function loadSnapshot(userId: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(snapshotKey(userId));
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveSnapshot(userId: string, snapshot: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(snapshotKey(userId), JSON.stringify(snapshot));
  } catch {
    // Ignore quota errors
  }
}

function isRegisteredForLive(registration: MockTeam): boolean {
  return registration.status === "Approved" || registration.status === "Previously Competed";
}

function notificationForLiveTournament(
  tournamentId: string,
  tournamentName: string,
  registration: MockTeam,
  unread: boolean,
  existingCreatedAt?: string,
): AppNotification {
  return {
    id: `tournament-live-${tournamentId}`,
    type: "tournament_live",
    title: "Tournament Is Live",
    body: `${tournamentName} is now live. Your team ${registration.name} [${registration.tag}] can view the bracket.`,
    createdAt: unread ? new Date().toISOString() : (existingCreatedAt ?? new Date().toISOString()),
    read: !unread,
    href: `/tournaments/${tournamentId}`,
  };
}

/** Notify roster members when a registered tournament goes live. */
export async function syncTournamentLiveNotifications(userId: string): Promise<AppNotification[]> {
  const memberTeams = await fetchActiveMemberTeams(userId);
  const tournaments = await fetchTournaments();
  const liveById = new Map(
    tournaments.filter((t) => t.status === "Live").map((t) => [t.id, t] as const),
  );

  const previousSnapshot = loadSnapshot(userId);
  const nextSnapshot: Record<string, string> = { ...previousSnapshot };
  const existingNotifications = getNotifications().filter((n) => n.type === "tournament_live");
  const createdAtById = new Map(
    existingNotifications.map((n) => [n.id, n.createdAt] as const),
  );

  const notifications: AppNotification[] = [];
  const seenTournamentIds = new Set<string>();

  if (memberTeams.length > 0 && liveById.size > 0) {
    await Promise.all(
      memberTeams.map(async (team) => {
        const registrations = await fetchRegistrationsForTeam(team.id);
        for (const registration of registrations) {
          if (!isRegisteredForLive(registration)) continue;

          const tournament = liveById.get(registration.tournamentId);
          if (!tournament || seenTournamentIds.has(tournament.id)) continue;

          seenTournamentIds.add(tournament.id);
          const notificationId = `tournament-live-${tournament.id}`;
          const wasLive = previousSnapshot[tournament.id] === "Live";
          const alreadyRead = isNotificationRead(notificationId);
          const unread = !wasLive && !alreadyRead;

          notifications.push({
            ...notificationForLiveTournament(
              tournament.id,
              tournament.name,
              registration,
              unread,
              createdAtById.get(notificationId),
            ),
            read: unread ? false : alreadyRead,
          });

          nextSnapshot[tournament.id] = "Live";
        }
      }),
    );
  }

  for (const tournament of tournaments) {
    if (tournament.status === "Live") {
      nextSnapshot[tournament.id] = "Live";
    }
  }

  saveSnapshot(userId, nextSnapshot);
  mergeTournamentLiveNotifications(notifications);
  notifyListeners();
  return notifications;
}
