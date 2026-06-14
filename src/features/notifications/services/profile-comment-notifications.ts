import { fetchProfileCommentAlerts } from "@/features/member/services/profile-comments.service";
import {
  getNotifications,
  isNotificationRead,
  mergeProfileCommentNotifications,
  notifyListeners,
} from "../store";
import type { AppNotification } from "../types";

/** Sync profile comment alerts for the logged-in member's public profile. */
export async function syncProfileCommentNotifications(
  profileMemberId: string,
): Promise<AppNotification[]> {
  const alerts = await fetchProfileCommentAlerts({ memberId: profileMemberId });

  const existingNotifications = getNotifications();
  const readById = new Map(
    existingNotifications.filter((n) => n.read).map((n) => [n.id, true] as const),
  );
  const createdAtById = new Map(
    existingNotifications.map((n) => [n.id, n.createdAt] as const),
  );

  const notifications: AppNotification[] = alerts.map((alert) => {
    const notificationId = `profile-comment-${alert.commentId}`;
    return {
      id: notificationId,
      type: "profile_comment",
      title: "New Profile Comment",
      body: `${alert.authorDisplayName} commented on your profile: "${alert.bodyPreview}"`,
      createdAt: createdAtById.get(notificationId) ?? alert.createdAt,
      read: isNotificationRead(notificationId) || readById.has(notificationId),
      href: `/members/${alert.profileSlug}`,
    };
  });

  mergeProfileCommentNotifications(notifications);
  notifyListeners();

  return notifications;
}
