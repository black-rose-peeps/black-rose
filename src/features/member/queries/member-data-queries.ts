import { fetchTeamsForUser } from "@/features/admin/features/teams/services/teams.service";
import {
  fetchTournamentsForNotifications,
  fetchTournamentsLite,
} from "@/features/admin/features/tournaments/services/tournaments.service";
import {
  fetchRegistrationsForTeam,
  type FetchRegistrationsForTeamOptions,
} from "@/features/admin/features/tournaments/services/tournament-registrations.service";
import { isActiveMember } from "@/features/teams/utils/membership";
import type { Team } from "@/features/teams/types";
import type { MockTeam, MockTournament } from "@/lib/mock-data";
import { tryGetAppQueryClient } from "@/lib/app-query";
import { queryKeys } from "@/lib/query-keys";

async function fetchQuery<T>(key: readonly unknown[], queryFn: () => Promise<T>): Promise<T> {
  const client = tryGetAppQueryClient();
  if (!client) return queryFn();
  return client.fetchQuery({ queryKey: key, queryFn });
}

export function invalidateMemberDataQueries(userId: string): void {
  const client = tryGetAppQueryClient();
  if (!client) return;
  void client.invalidateQueries({ queryKey: queryKeys.memberTeams(userId) });
  void client.invalidateQueries({ queryKey: queryKeys.memberDashboard(userId) });
  void client.invalidateQueries({ queryKey: queryKeys.memberProfile(userId) });
  void client.invalidateQueries({ queryKey: queryKeys.memberChampionships(userId) });
  void client.invalidateQueries({ queryKey: queryKeys.tournamentsLite() });
  void client.invalidateQueries({ queryKey: queryKeys.tournamentsNotifications() });
  void client.invalidateQueries({ queryKey: ["team-registrations"] });
}

export async function fetchMemberTeamsCached(userId: string): Promise<Team[]> {
  return fetchQuery(queryKeys.memberTeams(userId), () => fetchTeamsForUser(userId));
}

export async function fetchActiveMemberTeamsCached(userId: string): Promise<Team[]> {
  const teams = await fetchMemberTeamsCached(userId);
  return teams.filter((team) => isActiveMember(team, userId));
}

export async function fetchTournamentsLiteCached(): Promise<MockTournament[]> {
  return fetchQuery(queryKeys.tournamentsLite(), () => fetchTournamentsLite());
}

export async function fetchTournamentsForNotificationsCached(): Promise<
  Pick<MockTournament, "id" | "name" | "status">[]
> {
  return fetchQuery(queryKeys.tournamentsNotifications(), () =>
    fetchTournamentsForNotifications(),
  );
}

export async function fetchTeamRegistrationsCached(
  teamId: string,
  options?: FetchRegistrationsForTeamOptions,
): Promise<MockTeam[]> {
  return fetchQuery(queryKeys.teamRegistrations(teamId), async () => {
    const tournaments = options?.tournaments ?? (await fetchTournamentsLiteCached());
    return fetchRegistrationsForTeam(teamId, {
      ...options,
      tournaments,
    });
  });
}

export interface MemberTournamentNotificationContext {
  memberTeams: Team[];
  tournaments: Pick<MockTournament, "id" | "name" | "status">[];
  registrationsByTeamId: Map<string, MockTeam[]>;
}

/** One shared load for registration + live tournament notifications. */
export async function loadMemberTournamentNotificationContext(
  userId: string,
): Promise<MemberTournamentNotificationContext> {
  const [memberTeams, tournaments, tournamentsLite] = await Promise.all([
    fetchActiveMemberTeamsCached(userId),
    fetchTournamentsForNotificationsCached(),
    fetchTournamentsLiteCached(),
  ]);

  const liveTeamsById = new Map(memberTeams.map((team) => [team.id, team]));
  const registrationsByTeamId = new Map<string, MockTeam[]>();

  if (memberTeams.length > 0) {
    await Promise.all(
      memberTeams.map(async (team) => {
        const registrations = await fetchTeamRegistrationsCached(team.id, {
          tournaments: tournamentsLite,
          liveTeamsById: liveTeamsById,
        });
        registrationsByTeamId.set(team.id, registrations);
      }),
    );
  }

  return { memberTeams, tournaments, registrationsByTeamId };
}
