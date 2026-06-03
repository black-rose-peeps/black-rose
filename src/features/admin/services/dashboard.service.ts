import { fetchMembers } from "@/features/admin/features/members/services/members.service";
import { fetchAllRegistrations } from "@/features/admin/features/tournaments/services/tournament-registrations.service";
import { fetchTournaments } from "@/features/admin/features/tournaments/services/tournaments.service";
import { fetchTeams } from "@/features/admin/features/teams/services/teams.service";

export interface AdminDashboardStats {
  totalMembers: number;
  totalTeams: number;
  activeTournaments: number;
  pendingRegistrations: number;
  completedTournaments: number;
}

export interface AdminDashboardData {
  stats: AdminDashboardStats;
  activeTournaments: Awaited<ReturnType<typeof fetchTournaments>>;
  pendingRegistrations: Awaited<ReturnType<typeof fetchAllRegistrations>>;
}

export async function fetchAdminDashboard(): Promise<AdminDashboardData> {
  const [members, teams, tournaments, registrations] = await Promise.all([
    fetchMembers(),
    fetchTeams(),
    fetchTournaments(),
    fetchAllRegistrations(),
  ]);

  const activeTournaments = tournaments.filter(
    (t) => t.status === "Live" || t.status === "Registration Open",
  );
  const pendingRegistrations = registrations.filter((r) => r.status === "Pending");
  const completedTournaments = tournaments.filter(
    (t) => t.status === "Completed" || t.status === "Archived",
  );

  return {
    stats: {
      totalMembers: members.length,
      totalTeams: teams.length,
      activeTournaments: activeTournaments.length,
      pendingRegistrations: pendingRegistrations.length,
      completedTournaments: completedTournaments.length,
    },
    activeTournaments,
    pendingRegistrations,
  };
}
