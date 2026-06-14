export type TeamMemberStatus = "captain" | "active" | "invited" | "removed";

export type TeamMemberRole =
  | "IGL"
  | "Duelist"
  | "Controller"
  | "Initiator"
  | "Sentinel"
  | "Flex"
  | "AWPer"
  | "Rifler"
  | "Support"
  | "Lurker"
  | "Mid"
  | "Top"
  | "ADC"
  | "Jungle"
  | "Roam"
  | "EXP"
  | "Gold"
  | "DPS"
  | "Tank"
  | "Healer"
  | "Sub"
  | "TBD";

export interface TeamMember {
  userId: string;
  username: string;
  discordUsername: string;
  displayName: string;
  avatarInitials: string;
  avatarUrl: string | null;
  ign: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  joinedAt: string;
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  game: "Valorant" | "League of Legends" | "Teamfight Tactics" | "Where Winds Meet" | "Multi";
  captainUserId: string;
  members: TeamMember[];
  createdAt: string;
  /** Active tournament registration the team is currently in, if any */
  activeTournamentId: string | null;
  activeTournamentName: string | null;
}
