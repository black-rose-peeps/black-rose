/**
 * Public tournament services — thin wrappers around the admin services.
 *
 * This keeps a single source of truth in Supabase. The public side never
 * maintains its own duplicate data.
 */

export {
  fetchTournaments,
  fetchTournamentById,
  fetchTournamentByIdForSsr,
} from "@/features/admin/features/tournaments/services/tournaments.service";

export { fetchTournamentRegistrations } from "@/features/admin/features/tournaments/services/tournament-registrations.service";

export {
  fetchCaptainTeams,
  fetchCaptainRegistrationStatusForTournament,
  fetchCaptainTournamentRegistrationMap,
  fetchOpenTeamTournaments,
  fetchRegistrationsForTeam,
  fetchTeamTournamentRegistration,
  requestCaptainTeamRegistration,
  isPendingCaptainRegistrationStatus,
  isRegisteredCaptainStatus,
  pendingRegistrations,
  approvedRegistration,
  type CaptainTournamentRegistrationStatus,
} from "./team-registration.service";
