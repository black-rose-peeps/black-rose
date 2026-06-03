export type TournamentStatus =
  | "Registration Open"
  | "Registration Closed"
  | "Live"
  | "Completed"
  | "Archived";

export type TournamentGame = "Valorant" | "League of Legends" | "Teamfight Tactics";

export interface Tournament {
  id: string;
  name: string;
  game: TournamentGame;
  status: TournamentStatus;
  prizePool: string;
  startDate: string;
  registrationDeadline: string;
  teamsRegistered: number;
  teamCap: number;
  format: string;
  region: string;
}

// ── Detail-only types ────────────────────────────────────

export interface PrizeTier {
  place: string;
  prize: string;
}

export interface ScheduleEntry {
  phase: string;
  date: string;
  note?: string;
}

export interface RuleSection {
  title: string;
  items: string[];
}

export interface BracketMatch {
  id: string;
  round: string;
  teamA: string | null; // null = TBD
  teamB: string | null;
  scoreA?: number;
  scoreB?: number;
  winner?: string; // team name of winner
}

export interface BracketRound {
  label: string;
  matches: BracketMatch[];
}

export interface TournamentPlayer {
  ign: string;
  role: string;
}

export interface TournamentTeam {
  id: string;
  name: string;
  tag: string;
  captain: string;
  seed?: number;
  players: TournamentPlayer[];
}

export interface TournamentDetail extends Tournament {
  description: string;
  organizer: string;
  contact: string;
  prizeBreakdown: PrizeTier[];
  schedule: ScheduleEntry[];
  rules: RuleSection[];
  bracket: BracketRound[];
  teams: TournamentTeam[];
}
