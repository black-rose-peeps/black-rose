/**
 * Shared domain types for tournaments and registrations.
 * Data is loaded from Supabase services — no static mock records here.
 */

import type { PrizeTier } from "@/features/tournaments/types";
import type { ParticipationType, WwmMode } from "@/features/tournaments/types/participation";

export type TournamentStatus =
  | "Draft"
  | "Registration Open"
  | "Registration Closed"
  | "Live"
  | "Completed"
  | "Archived";

export interface MockTournament {
  id: string;
  name: string;
  game: "Valorant" | "League of Legends" | "Teamfight Tactics" | "Where Winds Meet";
  status: TournamentStatus;
  prizePool: string;
  prizeBreakdown?: PrizeTier[];
  startDate: string;
  registrationDeadline: string;
  teamsRegistered: number;
  teamCap: number;
  format: string;
  region: string;
  participationType: ParticipationType;
  wwmMode?: WwmMode | null;
}

export interface MockPlayer {
  ign: string;
  role: string;
  discord: string;
}

export interface MockTeam {
  id: string;
  /** Links to admin roster `Team.id` when registered from the Teams pipeline. */
  rosterTeamId?: string;
  /** Direct member registration for solo tournaments. */
  memberUserId?: string;
  name: string;
  tag: string;
  captain: string;
  members: MockPlayer[];
  registrationDate: string;
  /** When status last changed (approve/reject), when available from the database. */
  statusUpdatedAt?: string;
  status: "Pending" | "Approved" | "Rejected" | "Previously Competed";
  tournamentId: string;
  history: string[];
}

export interface MockUser {
  id: string;
  username: string;
  email: string;
  role: "User" | "Tournament Admin" | "Super Admin";
  registrationDate: string;
  status: "Active" | "Suspended" | "Banned";
}
