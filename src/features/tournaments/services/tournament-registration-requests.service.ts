import { supabase } from "@/lib/supabase";
import { fetchTeamById } from "@/features/admin/features/teams/services/teams.service";
import { fetchTeamTournamentRegistration } from "@/features/admin/features/tournaments/services/tournament-registrations.service";
import { isActiveMember } from "@/features/teams/utils/membership";
import {
  fetchActiveMemberTeams,
  fetchCaptainTeamsForTournament,
} from "@/features/tournaments/services/team-registration.service";

export interface TournamentRegistrationRequest {
  id: string;
  tournamentId: string;
  rosterTeamId: string;
  requesterUserId: string;
  captainUserId: string;
  status: "pending" | "dismissed";
  createdAt: string;
}

const REGISTRATION_REQUEST_COLUMNS =
  "id, tournament_id, roster_team_id, requester_user_id, captain_user_id, status, created_at";

function rowToRequest(row: Record<string, unknown>): TournamentRegistrationRequest {
  return {
    id: row.id as string,
    tournamentId: row.tournament_id as string,
    rosterTeamId: row.roster_team_id as string,
    requesterUserId: row.requester_user_id as string,
    captainUserId: row.captain_user_id as string,
    status: row.status as TournamentRegistrationRequest["status"],
    createdAt: row.created_at as string,
  };
}

export async function fetchMemberTeamsForTournamentRequest(
  memberId: string,
  tournamentId: string,
  tournamentGame: string,
) {
  const teams = await fetchActiveMemberTeams(memberId);
  const eligible = teams.filter(
    (team) =>
      team.captainUserId !== memberId &&
      (team.game === "Multi" || team.game === tournamentGame),
  );

  const results = await Promise.all(
    eligible.map(async (team) => {
      const [registration, request] = await Promise.all([
        fetchTeamTournamentRegistration(team.id, tournamentId),
        fetchPendingRegistrationRequest(tournamentId, team.id, memberId),
      ]);

      if (registration && registration.status !== "Rejected") {
        return null;
      }

      return { team, existingRequest: request };
    }),
  );

  return results.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

export async function fetchPendingRegistrationRequest(
  tournamentId: string,
  rosterTeamId: string,
  requesterUserId: string,
): Promise<TournamentRegistrationRequest | null> {
  const { data, error } = await supabase
    .from("tournament_registration_requests")
    .select(REGISTRATION_REQUEST_COLUMNS)
    .eq("tournament_id", tournamentId)
    .eq("roster_team_id", rosterTeamId)
    .eq("requester_user_id", requesterUserId)
    .eq("status", "pending")
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") {
      throw new Error(
        "Tournament registration requests are not set up yet. Run docs/sql/tournament_registration_requests.sql in Supabase.",
      );
    }
    throw new Error(error.message);
  }

  return data ? rowToRequest(data as Record<string, unknown>) : null;
}

export async function fetchPendingRegistrationRequestsForCaptain(
  captainUserId: string,
): Promise<TournamentRegistrationRequest[]> {
  const { data, error } = await supabase
    .from("tournament_registration_requests")
    .select(REGISTRATION_REQUEST_COLUMNS)
    .eq("captain_user_id", captainUserId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") {
      throw new Error(
        "Tournament registration requests are not set up yet. Run docs/sql/tournament_registration_requests.sql in Supabase.",
      );
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToRequest(row as Record<string, unknown>));
}

export async function createTournamentRegistrationRequest(input: {
  tournamentId: string;
  rosterTeamId: string;
  requesterUserId: string;
}): Promise<TournamentRegistrationRequest> {
  const team = await fetchTeamById(input.rosterTeamId);
  if (!team) throw new Error("Team not found.");
  if (!isActiveMember(team, input.requesterUserId)) {
    throw new Error("You must be an active member of this team to request registration.");
  }
  if (team.captainUserId === input.requesterUserId) {
    throw new Error("Captains can register the team directly.");
  }

  const existingRegistration = await fetchTeamTournamentRegistration(
    input.rosterTeamId,
    input.tournamentId,
  );
  if (existingRegistration && existingRegistration.status !== "Rejected") {
    throw new Error("This team is already registered or pending for this tournament.");
  }

  const existingRequest = await fetchPendingRegistrationRequest(
    input.tournamentId,
    input.rosterTeamId,
    input.requesterUserId,
  );
  if (existingRequest) return existingRequest;

  const { data, error } = await supabase
    .from("tournament_registration_requests")
    .insert({
      tournament_id: input.tournamentId,
      roster_team_id: input.rosterTeamId,
      requester_user_id: input.requesterUserId,
      captain_user_id: team.captainUserId,
      status: "pending",
    })
    .select(REGISTRATION_REQUEST_COLUMNS)
    .single();

  if (error) {
    if (error.code === "42P01") {
      throw new Error(
        "Tournament registration requests are not set up yet. Run docs/sql/tournament_registration_requests.sql in Supabase.",
      );
    }
    throw new Error(error.message);
  }

  return rowToRequest(data as Record<string, unknown>);
}

export async function memberCanUseCaptainRegistration(
  memberId: string,
  tournamentId: string,
): Promise<boolean> {
  const teams = await fetchCaptainTeamsForTournament(memberId, tournamentId);
  return teams.length > 0;
}

export async function memberCanRequestCaptainRegistration(
  memberId: string,
  tournamentId: string,
  tournamentGame: string,
): Promise<boolean> {
  const entries = await fetchMemberTeamsForTournamentRequest(
    memberId,
    tournamentId,
    tournamentGame,
  );
  return entries.length > 0;
}
