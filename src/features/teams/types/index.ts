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
  | "ADC"
  | "Jungle"
  | "Roam"
  | "EXP"
  | "Gold"
  | "Sub"
  | "TBD";

export interface TeamMember {
  userId: string;
  username: string;
  displayName: string;
  avatarInitials: string;
  ign: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  joinedAt: string;
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  game: "Valorant" | "League of Legends" | "Teamfight Tactics" | "Multi";
  captainUserId: string;
  members: TeamMember[];
  createdAt: string;
  /** Active tournament registration the team is currently in, if any */
  activeTournamentId: string | null;
  activeTournamentName: string | null;
}
