import type { BracketRound } from "../types";
import {
  buildSeedByTeam,
  computeSwissTiebreakRows,
  sortSwissTiebreakRows,
} from "./swiss-tiebreaks";

export const SWISS_WINS_TO_ADVANCE = 3;
export const SWISS_LOSSES_TO_ELIMINATE = 3;

export type SwissTeamStatus = "active" | "advanced" | "eliminated";

export interface SwissStandingEntry {
  team: string;
  record: { wins: number; losses: number };
  status: SwissTeamStatus;
}

export interface SwissStandingDetailed extends SwissStandingEntry {
  rank: number;
  matchPoints: number;
  buchholz: number;
  omw: number;
  seed: number;
}

export function isSwissPlayoffRound(round: BracketRound): boolean {
  return round.id?.startsWith("po-r") === true || /playoffs?/i.test(round.label);
}

export function filterSwissGroupRounds(bracket: BracketRound[]): BracketRound[] {
  return bracket.filter((round) => !isSwissPlayoffRound(round));
}

export function parseSwissRoundNumber(round: BracketRound): number {
  if (round.id?.startsWith("sw-r")) {
    const parsed = Number.parseInt(round.id.slice(4), 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  const fromLabel = round.label.match(/round\s*(\d+)/i);
  return fromLabel ? Number.parseInt(fromLabel[1], 10) : 0;
}

export function getCurrentSwissRoundFromBracket(swissRounds: BracketRound[]): number {
  const parsed = swissRounds.map(parseSwissRoundNumber).filter((value) => value > 0);
  return parsed.length > 0 ? Math.max(...parsed) : 1;
}

export function isPublicSwissRoundComplete(round: BracketRound): boolean {
  if (round.matches.length > 0) {
    return round.matches.every(
      (match) => !!match.winner && !!match.teamA && !!match.teamB,
    );
  }
  return (round.swissByes?.length ?? 0) > 0;
}

export function parseSwissPoolKey(matchRound: string): string {
  const poolPart = matchRound.includes(" · ") ? matchRound.split(" · ")[1] : null;
  if (!poolPart) return "0-0";
  const match = poolPart.match(/(\d+)W-(\d+)L/i);
  return match ? `${match[1]}-${match[2]}` : "0-0";
}

export function formatSwissPoolLabel(poolKey: string): string {
  const [w, l] = poolKey.split("-").map(Number);
  return `${w}W-${l}L`;
}

/** Include decided matches through the viewed round (partial current-round results count). */
export function swissStandingsThroughRound(activeRound: number): number {
  return activeRound;
}

export function swissStandingsLabel(options: {
  playoffsStarted: boolean;
  activeRound: number;
  activeRoundComplete: boolean;
  hasDecidedInActiveRound: boolean;
}): string {
  if (options.playoffsStarted) return "Final group stage";
  if (options.activeRoundComplete) return `After Round ${options.activeRound}`;
  if (options.hasDecidedInActiveRound) return `Through Round ${options.activeRound}`;
  if (options.activeRound === 1) return "Opening standings";
  return `After Round ${options.activeRound - 1}`;
}

function statusFromRecord(record: { wins: number; losses: number }): SwissTeamStatus {
  if (record.wins >= SWISS_WINS_TO_ADVANCE) return "advanced";
  if (record.losses >= SWISS_LOSSES_TO_ELIMINATE) return "eliminated";
  return "active";
}

function collectSwissParticipants(
  swissRounds: BracketRound[],
  teamNames?: string[],
): string[] {
  const teams = new Set<string>(teamNames ?? []);

  for (const round of swissRounds) {
    for (const match of round.matches) {
      if (match.teamA) teams.add(match.teamA);
      if (match.teamB) teams.add(match.teamB);
    }
    for (const team of round.swissByes ?? []) {
      teams.add(team);
    }
  }

  return [...teams];
}

function buildRecordsFromBracket(
  swissRounds: BracketRound[],
  throughRound?: number,
): Record<string, { wins: number; losses: number }> {
  const records: Record<string, { wins: number; losses: number }> = {};

  const ensure = (team: string) => {
    if (!records[team]) records[team] = { wins: 0, losses: 0 };
  };

  for (const round of swissRounds) {
    const roundNum = parseSwissRoundNumber(round);
    if (throughRound !== undefined && roundNum > throughRound) continue;

    for (const match of round.matches) {
      if (match.teamA) ensure(match.teamA);
      if (match.teamB) ensure(match.teamB);
      if (!match.winner || !match.teamA || !match.teamB) continue;
      if (match.winner !== match.teamA && match.winner !== match.teamB) continue;
      const loser = match.winner === match.teamA ? match.teamB : match.teamA;
      records[match.winner].wins += 1;
      records[loser].losses += 1;
    }

    for (const team of round.swissByes ?? []) {
      ensure(team);
      records[team].wins += 1;
    }
  }

  return records;
}

function buildOpponentsFromBracket(
  swissRounds: BracketRound[],
  throughRound?: number,
): Record<string, string[]> {
  const opponents: Record<string, string[]> = {};

  const addOpponent = (teamA: string, teamB: string) => {
    if (!opponents[teamA]) opponents[teamA] = [];
    opponents[teamA].push(teamB);
  };

  for (const round of swissRounds) {
    const roundNum = parseSwissRoundNumber(round);
    if (throughRound !== undefined && roundNum > throughRound) continue;

    for (const match of round.matches) {
      if (!match.winner || !match.teamA || !match.teamB) continue;
      addOpponent(match.teamA, match.teamB);
      addOpponent(match.teamB, match.teamA);
    }
  }

  return opponents;
}

/** Standings with MP, Median Buchholz, OMW%, and seed tiebreakers from published rounds. */
export function computeSwissStandingsDetailedFromBracket(
  swissRounds: BracketRound[],
  options?: {
    throughRound?: number;
    teamNames?: string[];
    seedByTeam?: Map<string, number>;
  },
): SwissStandingDetailed[] {
  const throughRound = options?.throughRound;
  const records = buildRecordsFromBracket(swissRounds, throughRound);
  const participants = collectSwissParticipants(swissRounds, options?.teamNames);

  for (const team of participants) {
    if (!records[team]) records[team] = { wins: 0, losses: 0 };
  }

  const opponentsMap = buildOpponentsFromBracket(swissRounds, throughRound);
  const seedByTeam =
    options?.seedByTeam ??
    buildSeedByTeam(
      participants,
      options?.teamNames?.map((name, index) => ({ name, seed: index + 1 })),
    );

  const tiebreakRows = computeSwissTiebreakRows({
    participants,
    records,
    opponents: opponentsMap,
    seedByTeam,
  });

  const rows = tiebreakRows.map((row) => ({
    ...row,
    status: statusFromRecord(row.record),
    rank: 0,
  }));

  return sortSwissTiebreakRows(rows).map((row, index) => ({ ...row, rank: index + 1 }));
}

/** Derive Swiss records and qualification status from published bracket rounds. */
export function computeSwissStandingsFromBracket(bracket: BracketRound[]): SwissStandingEntry[] {
  return computeSwissStandingsDetailedFromBracket(bracket).map(
    ({ team, record, status }) => ({ team, record, status }),
  );
}
