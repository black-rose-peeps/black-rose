import { fetchTournaments } from "@/features/admin/features/tournaments/services/tournaments.service";
import { fetchTeamById } from "@/features/admin/features/teams/services/teams.service";
import { fetchMemberById } from "@/features/admin/features/members/services/members.service";
import {
  fetchPendingRegistrationRequestsForCaptain,
  type TournamentRegistrationRequest,
} from "@/features/tournaments/services/tournament-registration-requests.service";
import { getNotifications, isNotificationRead, mergeRegistrationRequestNotifications, notifyListeners } from "../store";
import type { AppNotification } from "../types";

function notificationForRequest(
  request: TournamentRegistrationRequest,
  tournamentName: string,
  teamName: string,
  teamTag: string,
  requesterName: string,
  existingCreatedAt?: string,
): AppNotification {
  return {
    id: `registration-request-${request.id}`,
    type: "registration_request",
    title: "Registration Request",
    body: `${requesterName} asked you to register [${teamTag}] ${teamName} for ${tournamentName}.`,
    createdAt: existingCreatedAt ?? request.createdAt,
    read: false,
    href: `/tournaments/${request.tournamentId}`,
  };
}

/** Pull pending member registration requests addressed to this captain. */
export async function syncTournamentRegistrationRequestNotifications(
  captainUserId: string,
): Promise<AppNotification[]> {
  const requests = await fetchPendingRegistrationRequestsForCaptain(captainUserId);
  if (!requests.length) {
    mergeRegistrationRequestNotifications([]);
    notifyListeners();
    return [];
  }

  const tournaments = await fetchTournaments();
  const tournamentById = new Map(tournaments.map((t) => [t.id, t]));
  const existingNotifications = getNotifications().filter((n) => n.type === "registration_request");
  const readById = new Map(
    existingNotifications.filter((n) => n.read).map((n) => [n.id, true] as const),
  );
  const createdAtById = new Map(
    existingNotifications.map((n) => [n.id, n.createdAt] as const),
  );

  const notifications = await Promise.all(
    requests.map(async (request) => {
      const tournament = tournamentById.get(request.tournamentId);
      const team = await fetchTeamById(request.rosterTeamId);
      const requester = await fetchMemberById(request.requesterUserId);
      const notificationId = `registration-request-${request.id}`;
      const notification = notificationForRequest(
        request,
        tournament?.name ?? "a tournament",
        team?.name ?? "your team",
        team?.tag ?? "???",
        requester?.username ?? "A teammate",
        createdAtById.get(notificationId),
      );
      notification.read =
        isNotificationRead(notificationId) || readById.has(notificationId);
      return notification;
    }),
  );

  mergeRegistrationRequestNotifications(notifications);
  notifyListeners();
  return notifications;
}
