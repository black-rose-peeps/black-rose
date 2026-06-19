import { registrationNeedsReview } from "@/features/admin/features/participants/constants/registration-status";
import { fetchMembers } from "@/features/admin/features/members/services/members.service";
import { fetchAllRegistrations } from "@/features/admin/features/tournaments/services/tournament-registrations.service";
import { fetchTournaments } from "@/features/admin/features/tournaments/services/tournaments.service";
import { fetchTeams } from "@/features/admin/features/teams/services/teams.service";

export interface AdminDashboardStats {
  totalMembers: number;
  totalTeams: number;
  activeTournaments: number;
  pendingRegistrations: number;
  verifiedMembers: number;
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
  const tournamentStatusById = new Map(tournaments.map((t) => [t.id, t.status]));
  const pendingRegistrations = registrations.filter((r) =>
    registrationNeedsReview(r.status, tournamentStatusById.get(r.tournamentId) ?? "Draft"),
  );
  const verifiedMembers = members.filter((m) => m.status === "Verified").length;

  return {
    stats: {
      totalMembers: members.length,
      totalTeams: teams.length,
      activeTournaments: activeTournaments.length,
      pendingRegistrations: pendingRegistrations.length,
      verifiedMembers,
    },
    activeTournaments,
    pendingRegistrations,
  };
}
