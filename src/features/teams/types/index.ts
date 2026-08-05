import type { Game } from "../constants";

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
  | "Vanguard"
  | "Strategist"
  | "Sub"
  | "TBD";

export interface TeamMember {
  userId: string;
  username: string;
  discordUsername: string;
  displayName: string;
  avatarInitials: string;
  avatarUrl: string | null;
  profileSlug: string;
  ign: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  joinedAt: string;
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  game: Game;
  gameId?: string; // Foreign key to games table for dynamic games
  captainUserId: string;
  members: TeamMember[];
  createdAt: string;
  /** Active tournament registration the team is currently in, if any */
  activeTournamentId: string | null;
  activeTournamentName: string | null;
}
