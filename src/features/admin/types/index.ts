/** Admin-side bracket state — extends the public BracketMatch with editable fields. */
export interface AdminBracketMatch {
  id: string;
  round: string;
  teamA: string | null;
  teamB: string | null;
  scoreA: number | "";
  scoreB: number | "";
  winner: string | null;
  /** Whether this match result has been confirmed by an admin */
  confirmed: boolean;
}

export interface AdminBracketRound {
  label: string;
  matches: AdminBracketMatch[];
}

export type BracketStatus = "not_generated" | "draft" | "published";

// Export new bracket engine types
export * from "../features/tournament/types/bracket-engine";
