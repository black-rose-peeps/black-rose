import {
  fetchTeamsByIds,
  fetchUserTeamMembershipRows,
} from "@/features/admin/features/teams/services/teams.service";
import type { Team } from "@/features/teams/types";
import { fetchMemberTeamsCached } from "@/features/member/queries/member-data-queries";
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
const inFlightByMember = new Map<string, Promise<AppNotification[]>>();

export function syncTeamMembershipNotifications(userId: string): Promise<AppNotification[]> {
  const existing = inFlightByMember.get(userId);
  if (existing) return existing;
  const sync = syncMembershipNotifications(userId).finally(() => {
    if (inFlightByMember.get(userId) === sync) inFlightByMember.delete(userId);
  });
  inFlightByMember.set(userId, sync);
  return sync;
}

async function syncMembershipNotifications(userId: string): Promise<AppNotification[]> {
  const memberships = await fetchUserTeamMembershipRows(userId);
  const previousSnapshot = loadStatusSnapshot(userId);
  const nextSnapshot: Record<string, TeamMemberStatus> = {};

  const existingNotifications = getNotifications(userId);
  const existingById = new Map(existingNotifications.map((n) => [n.id, n] as const));
  const readById = new Map(
    existingNotifications.filter((n) => n.read).map((n) => [n.id, true] as const),
  );
  const createdAtById = new Map(existingNotifications.map((n) => [n.id, n.createdAt] as const));

  const teams = await fetchMemberTeamsCached(userId);
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const missingTeamIds = [
    ...new Set(
      memberships
        .filter(
          (membership) =>
            !teamById.has(membership.teamId) &&
            (membership.status === "invited" ||
              (membership.status === "removed" &&
                (shouldNotifyRemoval(previousSnapshot[membership.teamId], membership.status) ||
                  existingById.has(`team-removed-${membership.teamId}`)))),
        )
        .map((membership) => membership.teamId),
    ),
  ];
  if (missingTeamIds.length) {
    for (const team of await fetchTeamsByIds(missingTeamIds)) teamById.set(team.id, team);
  }

  const pendingInvites: AppNotification[] = [];
  const removalEvents: AppNotification[] = [];

  for (const membership of memberships) {
    const previousStatus = previousSnapshot[membership.teamId];
    nextSnapshot[membership.teamId] = membership.status;

    const team = teamById.get(membership.teamId);
    if (!team) continue;

    if (membership.status === "invited") {
      const notificationId = `team-invite-${team.id}`;
      const alreadyRead = isNotificationRead(notificationId, userId);
      const unread = !alreadyRead && shouldMarkInviteUnread(previousStatus, membership.status);
      const read = unread
        ? false
        : readById.has(notificationId) || isNotificationRead(notificationId, userId);
      pendingInvites.push({
        id: notificationId,
        type: "team_invite",
        title: "Team Invitation",
        body: `${captainName(team)} invited you to join ${team.name} [${team.tag}] · ${team.game}`,
        createdAt: resolveNotificationTime(
          unread,
          membership.joinedAt,
          createdAtById.get(notificationId),
        ),
        read,
        href: `/teams/${team.id}`,
      });
      continue;
    }

    if (membership.status === "removed") {
      const notificationId = `team-removed-${team.id}`;
      const alreadyRead = isNotificationRead(notificationId, userId);
      const freshRemoval = shouldNotifyRemoval(previousStatus, membership.status);
      const alreadyNotified = existingById.has(notificationId);
      if (!freshRemoval && !alreadyNotified) continue;

      const unread = !alreadyRead && freshRemoval;
      const read = unread
        ? false
        : readById.has(notificationId) || isNotificationRead(notificationId, userId);
      removalEvents.push({
        id: notificationId,
        type: "team_removed",
        title: "Removed From Team",
        body: `You were removed from ${team.name} [${team.tag}] · ${team.game}.`,
        createdAt: resolveNotificationTime(
          unread,
          membership.joinedAt,
          createdAtById.get(notificationId),
        ),
        read,
        href: "/dashboard?view=teams",
      });
    }
  }

  saveStatusSnapshot(userId, nextSnapshot);
  mergeTeamInviteNotifications(pendingInvites, userId);
  mergeTeamEventNotifications(removalEvents, userId);
  notifyListeners();

  return [...pendingInvites, ...removalEvents];
}

/** @deprecated Use syncTeamMembershipNotifications */
export async function syncTeamInviteNotifications(userId: string): Promise<AppNotification[]> {
  return syncTeamMembershipNotifications(userId);
}
