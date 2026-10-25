import { fetchMyGameMembershipAcceptances } from "../functions/game-membership-notifications.functions";
import {
  getNotifications,
  isNotificationRead,
  mergeGameMembershipNotifications,
  notifyListeners,
} from "../store";
import type { AppNotification } from "../types";

interface GameMembershipNotificationSyncResult {
  notifications: AppNotification[];
  hasNewAcceptance: boolean;
}
const inFlight = new Map<string, Promise<GameMembershipNotificationSyncResult>>();

export function syncGameMembershipNotifications(
  memberId: string,
): Promise<GameMembershipNotificationSyncResult> {
  const pending = inFlight.get(memberId);
  if (pending) return pending;
  const request = sync(memberId).finally(() => {
    if (inFlight.get(memberId) === request) inFlight.delete(memberId);
  });
  inFlight.set(memberId, request);
  return request;
}

async function sync(memberId: string): Promise<GameMembershipNotificationSyncResult> {
  const feed = await fetchMyGameMembershipAcceptances();
  // A cookie/session switch during a request must not contaminate another account's local inbox.
  if (feed.memberId !== memberId)
    throw new Error("Game notification session changed; refresh your account.");
  const existing = new Map(getNotifications(memberId).map((item) => [item.id, item]));
  const notifications = [
    ...new Map(
      feed.events.map((event) => {
        const id = `game-membership-accepted-${event.eventId}`;
        const notification: AppNotification = {
          id,
          type: "game_membership_accepted",
          title: "Game membership accepted",
          body: `You’ve been accepted into Black Rose for ${event.gameName}.`,
          createdAt: event.createdAt,
          read: isNotificationRead(id, memberId) || existing.get(id)?.read === true,
          href: `/dashboard?view=games&focusGame=${encodeURIComponent(event.gameId)}`,
        };
        return [id, notification] as const;
      }),
    ).values(),
  ];
  const hasNewAcceptance = notifications.some((item) => !existing.has(item.id));
  mergeGameMembershipNotifications(notifications, memberId);
  notifyListeners();
  return { notifications, hasNewAcceptance };
}
