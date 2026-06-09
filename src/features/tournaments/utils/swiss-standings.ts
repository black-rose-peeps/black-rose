import type { BracketRound } from "../types";

export const SWISS_WINS_TO_ADVANCE = 3;
export const SWISS_LOSSES_TO_ELIMINATE = 3;

export type SwissTeamStatus = "active" | "advanced" | "eliminated";

export interface SwissStandingEntry {
  team: string;
  record: { wins: number; losses: number };
  status: SwissTeamStatus;
}

/** Derive Swiss records and qualification status from published bracket rounds. */
export function computeSwissStandingsFromBracket(bracket: BracketRound[]): SwissStandingEntry[] {
  const records: Record<string, { wins: number; losses: number }> = {};

  const ensure = (team: string) => {
    if (!records[team]) records[team] = { wins: 0, losses: 0 };
  };

  for (const round of bracket) {
    for (const match of round.matches) {
      if (match.teamA) ensure(match.teamA);
      if (match.teamB) ensure(match.teamB);
      if (!match.winner || !match.teamA || !match.teamB) continue;
      if (match.winner !== match.teamA && match.winner !== match.teamB) continue;
      const loser = match.winner === match.teamA ? match.teamB : match.teamA;
      records[match.winner].wins++;
      records[loser].losses++;
    }
  }

  return Object.entries(records)
    .map(([team, record]) => {
      let status: SwissTeamStatus = "active";
      if (record.wins >= SWISS_WINS_TO_ADVANCE) status = "advanced";
      else if (record.losses >= SWISS_LOSSES_TO_ELIMINATE) status = "eliminated";
      return { team, record, status };
    })
    .sort((a, b) => {
      if (b.record.wins !== a.record.wins) return b.record.wins - a.record.wins;
      return a.record.losses - b.record.losses;
    });
}
