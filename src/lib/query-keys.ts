export const queryKeys = {
  memberTeams: (userId: string) => ["member-teams", userId] as const,
  tournamentsLite: () => ["tournaments-lite"] as const,
  tournamentsNotifications: () => ["tournaments-notifications"] as const,
  teamRegistrations: (teamId: string) => ["team-registrations", teamId] as const,
  memberDashboard: (userId: string) => ["member-dashboard", userId] as const,
  memberProfile: (userId: string) => ["member-profile", userId] as const,
  memberChampionships: (userId: string) => ["member-championships", userId] as const,
};
