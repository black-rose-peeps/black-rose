import {
  fetchTeamById,
  fetchUserTeamMembershipRows,
} from "@/features/admin/features/teams/services/teams.service";
import type { Team } from "@/features/teams/types";
import type { TeamMemberStatus } from "@/features/teams/types";
import {
  getNotifications,
  isNotificationRead,
  mergeTeamEventNotifications,
  mergeTeamInviteNotifications,
  notifyListeners,
} from "../store";
import type { AppNotification } from "../types";

const SNAPSHOT_KEY_PREFIX = "br_team_membership_snapshot:";

function snapshotKey(userId: string): string {
  return `${SNAPSHOT_KEY_PREFIX}${userId}`;
}

function loadStatusSnapshot(userId: string): Record<string, TeamMemberStatus> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(snapshotKey(userId));
    return raw ? (JSON.parse(raw) as Record<string, TeamMemberStatus>) : {};
  } catch {
    return {};
  }
}

function saveStatusSnapshot(userId: string, snapshot: Record<string, TeamMemberStatus>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(snapshotKey(userId), JSON.stringify(snapshot));
  } catch {
    // Ignore quota errors
  }
}

function captainName(team: Team): string {
  return team.members.find((m) => m.status === "captain")?.displayName ?? "A captain";
}

function shouldMarkInviteUnread(
  previousStatus: TeamMemberStatus | undefined,
  currentStatus: TeamMemberStatus,
): boolean {
  if (currentStatus !== "invited") return false;
  if (previousStatus === undefined) return true;
  return previousStatus !== "invited";
}

function shouldNotifyRemoval(
  previousStatus: TeamMemberStatus | undefined,
  currentStatus: TeamMemberStatus,
): boolean {
  if (currentStatus !== "removed") return false;
  return previousStatus === "active" || previousStatus === "captain";
}

function resolveNotificationTime(
  unread: boolean,
  joinedAt: string | undefined,
  existingCreatedAt?: string,
): string {
  if (unread) return new Date().toISOString();
  if (existingCreatedAt) return existingCreatedAt;
  if (joinedAt) return joinedAt;
  return new Date().toISOString();
}

/** Sync pending invites and roster-removal alerts for the logged-in member. */
export async function syncTeamMembershipNotifications(userId: string): Promise<AppNotification[]> {
  const memberships = await fetchUserTeamMembershipRows(userId);
  const previousSnapshot = loadStatusSnapshot(userId);
  const nextSnapshot: Record<string, TeamMemberStatus> = {};

  const existingNotifications = getNotifications();
  const existingById = new Map(existingNotifications.map((n) => [n.id, n] as const));
  const readById = new Map(
    existingNotifications.filter((n) => n.read).map((n) => [n.id, true] as const),
  );
  const createdAtById = new Map(
    existingNotifications.map((n) => [n.id, n.createdAt] as const),
  );

  const teamIds = [...new Set(memberships.map((m) => m.teamId))];
  const teams = await Promise.all(teamIds.map((teamId) => fetchTeamById(teamId)));
  const teamById = new Map(
    teams.filter((team): team is Team => team !== null).map((team) => [team.id, team]),
  );

  const pendingInvites: AppNotification[] = [];
  const removalEvents: AppNotification[] = [];

  for (const membership of memberships) {
    const previousStatus = previousSnapshot[membership.teamId];
    nextSnapshot[membership.teamId] = membership.status;

    const team = teamById.get(membership.teamId);
    if (!team) continue;

    if (membership.status === "invited") {
      const notificationId = `team-invite-${team.id}`;
      const alreadyRead = isNotificationRead(notificationId);
      const unread =
        !alreadyRead && shouldMarkInviteUnread(previousStatus, membership.status);
      const notification: AppNotification = {
        id: notificationId,
        type: "team_invite",
        title: "Team Invitation",
        body: `${captainName(team)} invited you to join ${team.name} [${team.tag}] · ${team.game}`,
        createdAt: resolveNotificationTime(
          unread,
          membership.joinedAt,
          createdAtById.get(notificationId),
        ),
        read: false,
        href: `/teams/${team.id}`,
      };
      notification.read = unread
        ? false
        : readById.has(notificationId) || isNotificationRead(notificationId);
      pendingInvites.push(notification);
      continue;
    }

    if (membership.status === "removed") {
      const notificationId = `team-removed-${team.id}`;
      const alreadyRead = isNotificationRead(notificationId);
      const freshRemoval = shouldNotifyRemoval(previousStatus, membership.status);
      const alreadyNotified = existingById.has(notificationId);
      if (!freshRemoval && !alreadyNotified) continue;

      const unread = !alreadyRead && freshRemoval;
      const notification: AppNotification = {
        id: notificationId,
        type: "team_removed",
        title: "Removed From Team",
        body: `You were removed from ${team.name} [${team.tag}] · ${team.game}.`,
        createdAt: resolveNotificationTime(
          unread,
          membership.joinedAt,
          createdAtById.get(notificationId),
        ),
        read: false,
        href: "/teams",
      };
      notification.read = unread
        ? false
        : readById.has(notificationId) || isNotificationRead(notificationId);
      removalEvents.push(notification);
    }
  }

  saveStatusSnapshot(userId, nextSnapshot);
  mergeTeamInviteNotifications(pendingInvites);
  mergeTeamEventNotifications(removalEvents);
  notifyListeners();

  return [...pendingInvites, ...removalEvents];
}

/** @deprecated Use syncTeamMembershipNotifications */
export async function syncTeamInviteNotifications(userId: string): Promise<AppNotification[]> {
  return syncTeamMembershipNotifications(userId);
}
