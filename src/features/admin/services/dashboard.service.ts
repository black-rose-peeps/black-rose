import {
  countMembers,
  countVerifiedMembers,
} from "@/features/admin/features/members/services/members.service";
import {
  countPendingRegistrationsNeedingReview,
  fetchPendingRegistrationsForDashboard,
} from "@/features/admin/features/tournaments/services/tournament-registrations.service";
import {
  fetchActiveTournamentsForDashboard,
} from "@/features/admin/features/tournaments/services/tournaments.service";
import { countTeams } from "@/features/admin/features/teams/services/teams.service";
import type { MockTournament } from "@/lib/mock-data";
import type { MockTeam } from "@/lib/mock-data";

export interface AdminDashboardStats {
  totalMembers: number;
  totalTeams: number;
  activeTournaments: number;
  pendingRegistrations: number;
  verifiedMembers: number;
}

export interface AdminDashboardData {
  stats: AdminDashboardStats;
  activeTournaments: MockTournament[];
  pendingRegistrations: MockTeam[];
}

export async function fetchAdminDashboard(): Promise<AdminDashboardData> {
  const [
    totalMembers,
    verifiedMembers,
    totalTeams,
    pendingRegistrations,
    activeTournamentRows,
    pendingRegistrationRows,
  ] = await Promise.all([
    countMembers(),
    countVerifiedMembers(),
    countTeams(),
    countPendingRegistrationsNeedingReview(),
    fetchActiveTournamentsForDashboard(),
    fetchPendingRegistrationsForDashboard(20),
  ]);

  return {
    stats: {
      totalMembers,
      totalTeams,
      activeTournaments: activeTournamentRows.length,
      pendingRegistrations,
      verifiedMembers,
    },
    activeTournaments: activeTournamentRows,
    pendingRegistrations: pendingRegistrationRows,
  };
}
