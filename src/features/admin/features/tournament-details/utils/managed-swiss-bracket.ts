/**
 * Swiss-system bracket — teams play others with the same W-L record each round.
 * Standard (16 teams): 3 wins → playoffs, 3 losses → eliminated.
 */

import type { BestOfFormat, BracketRoundMeta, ManagedMatch } from "./managed-bracket";
import {
  buildPlayoffBracket,
  type PlayoffRound1Pairing,
  winsRequired,
} from "./managed-bracket";
import { isEvenBracketFieldSize } from "./bracket-field";

export const SWISS_WINS_TO_ADVANCE = 3;
export const SWISS_LOSSES_TO_ELIMINATE = 3;

export type SwissTeamStatus = "active" | "advanced" | "eliminated";
export type SwissPhase = "swiss" | "playoffs";

export interface SwissTeamRecord {
  wins: number;
  losses: number;
}

export interface SwissBracketState {
  winsToAdvance: number;
  lossesToEliminate: number;
  records: Record<string, SwissTeamRecord>;
  playedPairs: string[];
  /** Teams that received a bye (no match) in a given round number. */
  byesByRound?: Record<string, string[]>;
  /** Swiss group stage vs single-elimination playoff among qualifiers. */
  phase?: SwissPhase;
  /** Qualifier seed order when playoffs were generated. */
  playoffsSeededTeams?: string[];
  /** Frozen Swiss records for standings after playoffs begin. */
  groupStageRecords?: Record<string, SwissTeamRecord>;
  /** Whether a bronze match was generated for semifinal losers. */
  playoffThirdPlaceMatch?: boolean;
}

export function getSwissPhase(swiss: SwissBracketState): SwissPhase {
  return swiss.phase ?? "swiss";
}

export function formatSwissPoolLabel(poolKey: string): string {
  const [w, l] = poolKey.split("-").map(Number);
  return `${w}W-${l}L`;
}

export function pairKey(teamA: string, teamB: string): string {
  return [teamA, teamB].sort().join("|");
}

export function initSwissState(teamNames: string[]): SwissBracketState {
  return {
    winsToAdvance: SWISS_WINS_TO_ADVANCE,
    lossesToEliminate: SWISS_LOSSES_TO_ELIMINATE,
    records: Object.fromEntries(teamNames.map((name) => [name, { wins: 0, losses: 0 }])),
    playedPairs: [],
  };
}

export function getSwissTeamStatus(team: string, swiss: SwissBracketState): SwissTeamStatus {
  const record = swiss.records[team];
  if (!record) return "eliminated";
  if (record.wins >= swiss.winsToAdvance) return "advanced";
  if (record.losses >= swiss.lossesToEliminate) return "eliminated";
  return "active";
}

export function recomputeSwissStateFromMatches(
  matches: ManagedMatch[],
  teamNames: string[],
  winsToAdvance = SWISS_WINS_TO_ADVANCE,
  lossesToEliminate = SWISS_LOSSES_TO_ELIMINATE,
  preserve?: Pick<SwissBracketState, "phase" | "playoffsSeededTeams" | "byesByRound">,
): SwissBracketState {
  const records = Object.fromEntries(
    teamNames.map((name) => [name, { wins: 0, losses: 0 } satisfies SwissTeamRecord]),
  );
  const playedPairs: string[] = [];

  for (const match of matches) {
    if (match.bracketSide !== "swiss") continue;
    if (!match.confirmed || !match.winner || !match.teamA || !match.teamB) continue;
    if (match.winner !== match.teamA && match.winner !== match.teamB) continue;
    const loser = match.winner === match.teamA ? match.teamB : match.teamA;
    records[match.winner].wins += 1;
    records[loser].losses += 1;
    playedPairs.push(pairKey(match.teamA, match.teamB));
  }

  if (preserve?.byesByRound) {
    for (const byeTeams of Object.values(preserve.byesByRound)) {
      for (const team of byeTeams) {
        if (records[team]) records[team].wins += 1;
      }
    }
  }

  return {
    winsToAdvance,
    lossesToEliminate,
    records,
    playedPairs,
    byesByRound: preserve?.byesByRound,
    phase: preserve?.phase,
    playoffsSeededTeams: preserve?.playoffsSeededTeams,
  };
}

function sortTeamsByRecord(
  teamList: string[],
  records: Record<string, SwissTeamRecord>,
): string[] {
  return [...teamList].sort((a, b) => {
    const ra = records[a] ?? { wins: 0, losses: 0 };
    const rb = records[b] ?? { wins: 0, losses: 0 };
    if (rb.wins !== ra.wins) return rb.wins - ra.wins;
    return ra.losses - rb.losses;
  });
}

function pairTeamsGreedy(
  teamList: string[],
  records: Record<string, SwissTeamRecord>,
  played: Set<string>,
): { pairs: Array<[string, string]>; unpaired: string[] } {
  const remaining = sortTeamsByRecord(teamList, records);
  const pairs: Array<[string, string]> = [];

  while (remaining.length >= 2) {
    const teamA = remaining.shift()!;
    let partnerIndex = remaining.findIndex((teamB) => !played.has(pairKey(teamA, teamB)));
    if (partnerIndex === -1) partnerIndex = 0;
    const teamB = remaining.splice(partnerIndex, 1)[0];
    pairs.push([teamA, teamB]);
    played.add(pairKey(teamA, teamB));
  }

  return { pairs, unpaired: remaining };
}

/** Pair active teams: same-record pools first, then cross-pool for leftovers, then byes. */
export function pairSwissRoundTeams(
  activeTeams: string[],
  records: Record<string, SwissTeamRecord>,
  playedPairs: string[],
): { pairs: Array<[string, string, string]>; byes: string[] } {
  const played = new Set(playedPairs);
  const pools = new Map<string, string[]>();

  for (const team of activeTeams) {
    const record = records[team] ?? { wins: 0, losses: 0 };
    const poolKey = `${record.wins}-${record.losses}`;
    if (!pools.has(poolKey)) pools.set(poolKey, []);
    pools.get(poolKey)!.push(team);
  }

  const allPairs: Array<[string, string, string]> = [];
  const unpaired: string[] = [];

  const sortedPools = [...pools.entries()].sort((a, b) => {
    const [aw, al] = a[0].split("-").map(Number);
    const [bw, bl] = b[0].split("-").map(Number);
    if (bw !== aw) return bw - aw;
    return al - bl;
  });

  for (const [poolKey, poolTeams] of sortedPools) {
    const { pairs, unpaired: poolLeftovers } = pairTeamsGreedy(poolTeams, records, played);
    for (const [teamA, teamB] of pairs) {
      allPairs.push([teamA, teamB, poolKey]);
    }
    unpaired.push(...poolLeftovers);
  }

  const crossPool = sortTeamsByRecord(unpaired, records);
  while (crossPool.length >= 2) {
    const teamA = crossPool.shift()!;
    let partnerIndex = crossPool.findIndex((teamB) => !played.has(pairKey(teamA, teamB)));
    if (partnerIndex === -1) partnerIndex = 0;
    const teamB = crossPool.splice(partnerIndex, 1)[0];
    const record = records[teamA] ?? { wins: 0, losses: 0 };
    const poolKey = `${record.wins}-${record.losses}`;
    allPairs.push([teamA, teamB, poolKey]);
    played.add(pairKey(teamA, teamB));
  }

  return { pairs: allPairs, byes: crossPool };
}

export function buildSwissRound1(teamNames: string[]): {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
  swiss: SwissBracketState;
} {
  const n = teamNames.length;
  if (n < 4 || !isEvenBracketFieldSize(n)) {
    throw new Error(`Swiss system requires an even team count ≥ 4; received ${n}.`);
  }

  const swiss = initSwissState(teamNames);
  const roundId = "sw-r1";
  const matches: ManagedMatch[] = [];
  const matchIds: string[] = [];

  for (let i = 0; i < n / 2; i++) {
    const id = `${roundId}-m${i}`;
    matchIds.push(id);
    matches.push({
      id,
      roundId,
      roundLabel: "Round 1",
      label: `Match ${i + 1}`,
      bracketSide: "swiss",
      swissPool: "0-0",
      swissRound: 1,
      teamA: teamNames[i * 2] ?? null,
      teamB: teamNames[i * 2 + 1] ?? null,
      scoreA: 0,
      scoreB: 0,
      winner: null,
      confirmed: false,
      winnerNext: null,
      loserNext: null,
    });
  }

  const roundMetas: BracketRoundMeta[] = [
    { id: roundId, label: "Round 1", side: "swiss", matchIds },
  ];

  return { matches, roundMetas, swiss };
}

export function getCurrentSwissRound(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[] = [],
): number {
  const matchRound = matches.reduce((max, match) => Math.max(max, match.swissRound ?? 0), 0);
  const metaRound = roundMetas
    .filter((meta) => meta.side === "swiss")
    .reduce((max, meta) => {
      const parsed = Number.parseInt(meta.id.replace("sw-r", ""), 10);
      return Number.isNaN(parsed) ? max : Math.max(max, parsed);
    }, 0);
  return Math.max(matchRound, metaRound, 1);
}

export function isSwissRoundComplete(matches: ManagedMatch[], roundNumber: number): boolean {
  const roundMatches = matches.filter((match) => match.swissRound === roundNumber);
  return roundMatches.length > 0 && roundMatches.every((match) => match.confirmed && match.winner);
}

export function generateSwissNextRound(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
  swiss: SwissBracketState,
  teamNames: string[],
): { matches: ManagedMatch[]; roundMetas: BracketRoundMeta[]; swiss: SwissBracketState } | null {
  const currentRound = getCurrentSwissRound(matches, roundMetas);
  if (!isSwissRoundCompleteWithByes(matches, currentRound, swiss)) return null;

  const activeTeams = teamNames.filter((team) => getSwissTeamStatus(team, swiss) === "active");
  if (activeTeams.length === 0) return null;

  const nextRound = currentRound + 1;
  const { pairs, byes } = pairSwissRoundTeams(activeTeams, swiss.records, swiss.playedPairs);

  if (pairs.length === 0 && byes.length === 0) return null;
  if (activeTeams.length === 1 && byes.length === 0) return null;

  const roundId = `sw-r${nextRound}`;
  const newMatches: ManagedMatch[] = [];
  const matchIds: string[] = [];

  pairs.forEach(([teamA, teamB, poolKey], index) => {
    const id = `${roundId}-m${index}`;
    matchIds.push(id);
    newMatches.push({
      id,
      roundId,
      roundLabel: `Round ${nextRound}`,
      label: `Match ${index + 1}`,
      bracketSide: "swiss",
      swissPool: poolKey,
      swissRound: nextRound,
      teamA,
      teamB,
      scoreA: 0,
      scoreB: 0,
      winner: null,
      confirmed: false,
      winnerNext: null,
      loserNext: null,
    });
  });

  const byesByRound = { ...(swiss.byesByRound ?? {}) };
  if (byes.length > 0) {
    byesByRound[String(nextRound)] = byes;
  }

  const nextSwiss: SwissBracketState = { ...swiss, byesByRound };

  const nextRoundMetas = [
    ...roundMetas,
    { id: roundId, label: `Round ${nextRound}`, side: "swiss" as const, matchIds },
  ];

  return {
    matches: pairs.length > 0 ? [...matches, ...newMatches] : matches,
    roundMetas: nextRoundMetas,
    swiss: nextSwiss,
  };
}

export function updateSwissMatchScores(
  matches: ManagedMatch[],
  swiss: SwissBracketState,
  teamNames: string[],
  matchId: string,
  scoreA: number,
  scoreB: number,
  format: BestOfFormat,
): { matches: ManagedMatch[]; swiss: SwissBracketState } {
  const source = matches.find((match) => match.id === matchId);
  if (!source?.teamA || !source.teamB) return { matches, swiss };

  const required = winsRequired(format);
  let winner: string | null = null;
  if (scoreA >= required) winner = source.teamA;
  else if (scoreB >= required) winner = source.teamB;

  const nextMatches = matches.map((match) =>
    match.id === matchId
      ? { ...match, scoreA, scoreB, winner, confirmed: winner !== null }
      : match,
  );

  const nextSwiss = recomputeSwissStateFromMatches(
    nextMatches,
    teamNames,
    swiss.winsToAdvance,
    swiss.lossesToEliminate,
    swiss,
  );

  return { matches: nextMatches, swiss: nextSwiss };
}

export function clearSwissMatchResult(
  matches: ManagedMatch[],
  swiss: SwissBracketState,
  teamNames: string[],
  matchId: string,
): { matches: ManagedMatch[]; swiss: SwissBracketState } {
  const nextMatches = matches.map((match) =>
    match.id === matchId
      ? { ...match, scoreA: 0, scoreB: 0, winner: null, confirmed: false }
      : match,
  );

  const nextSwiss = recomputeSwissStateFromMatches(
    nextMatches,
    teamNames,
    swiss.winsToAdvance,
    swiss.lossesToEliminate,
    swiss,
  );

  return { matches: nextMatches, swiss: nextSwiss };
}

export function isSwissRoundCompleteWithByes(
  matches: ManagedMatch[],
  roundNumber: number,
  swiss: SwissBracketState,
): boolean {
  const roundMatches = matches.filter((match) => match.swissRound === roundNumber);
  if (roundMatches.length > 0) {
    return roundMatches.every((match) => match.confirmed && match.winner);
  }
  return (swiss.byesByRound?.[String(roundNumber)]?.length ?? 0) > 0;
}

/** Catch up missing rounds when active teams remain but pairing previously failed. */
export function catchUpSwissRounds(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
  swiss: SwissBracketState,
  teamNames: string[],
): { matches: ManagedMatch[]; roundMetas: BracketRoundMeta[]; swiss: SwissBracketState } {
  if (getSwissPhase(swiss) === "playoffs") {
    return { matches, roundMetas, swiss };
  }

  let nextMatches = matches;
  let nextRoundMetas = roundMetas;
  let nextSwiss = swiss;

  for (let guard = 0; guard < 12; guard += 1) {
    const currentRound = getCurrentSwissRound(nextMatches, nextRoundMetas);
    if (!isSwissRoundCompleteWithByes(nextMatches, currentRound, nextSwiss)) break;

    const activeTeams = teamNames.filter((team) => getSwissTeamStatus(team, nextSwiss) === "active");
    if (activeTeams.length === 0) break;

    const next = generateSwissNextRound(nextMatches, nextRoundMetas, nextSwiss, teamNames);
    if (!next) break;

    nextMatches = next.matches;
    nextRoundMetas = next.roundMetas;
    nextSwiss = next.swiss;

    const generatedRound = getCurrentSwissRound(nextMatches, nextRoundMetas);
    if (!isSwissRoundCompleteWithByes(nextMatches, generatedRound, nextSwiss)) break;
  }

  return { matches: nextMatches, roundMetas: nextRoundMetas, swiss: nextSwiss };
}

function parseSwissRoundNum(roundId: string): number {
  const parsed = Number.parseInt(roundId.replace("sw-r", ""), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Drop Swiss rounds after `throughRound`, recompute records from kept matches,
 * then regenerate forward pairings when that round is complete.
 */
export function reconcileSwissFromRound(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
  swiss: SwissBracketState,
  teamNames: string[],
  throughRound: number,
): { matches: ManagedMatch[]; roundMetas: BracketRoundMeta[]; swiss: SwissBracketState } {
  const keptMatches = matches.filter(
    (match) => match.bracketSide !== "swiss" || (match.swissRound ?? 0) <= throughRound,
  );

  const keptMetas = roundMetas.filter((meta) => {
    if (meta.side !== "swiss") return true;
    return parseSwissRoundNum(meta.id) <= throughRound;
  });

  const byesByRound = { ...(swiss.byesByRound ?? {}) };
  for (const key of Object.keys(byesByRound)) {
    if (Number(key) > throughRound) {
      delete byesByRound[key];
    }
  }

  const recomputedSwiss = recomputeSwissStateFromMatches(
    keptMatches,
    teamNames,
    swiss.winsToAdvance,
    swiss.lossesToEliminate,
    {
      phase: "swiss",
      byesByRound,
      playoffsSeededTeams: undefined,
      groupStageRecords: undefined,
    },
  );

  if (!isSwissRoundCompleteWithByes(keptMatches, throughRound, recomputedSwiss)) {
    return { matches: keptMatches, roundMetas: keptMetas, swiss: recomputedSwiss };
  }

  return catchUpSwissRounds(keptMatches, keptMetas, recomputedSwiss, teamNames);
}

export function applySwissMatchUpdates(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
  swiss: SwissBracketState,
  teamNames: string[],
  editedRound?: number,
): { matches: ManagedMatch[]; roundMetas: BracketRoundMeta[]; swiss: SwissBracketState } {
  if (getSwissPhase(swiss) === "playoffs") {
    return { matches, roundMetas, swiss };
  }

  const maxRound = getCurrentSwissRound(matches, roundMetas);
  const pivotRound = editedRound ?? maxRound;

  if (pivotRound < maxRound) {
    return reconcileSwissFromRound(matches, roundMetas, swiss, teamNames, pivotRound);
  }

  const currentRound = getCurrentSwissRound(matches, roundMetas);
  if (!isSwissRoundCompleteWithByes(matches, currentRound, swiss)) {
    return { matches, roundMetas, swiss };
  }

  return catchUpSwissRounds(matches, roundMetas, swiss, teamNames);
}

export function isSwissGroupStageComplete(
  teamNames: string[],
  swiss: SwissBracketState,
): boolean {
  return (
    teamNames.length > 0 &&
    teamNames.every((team) => getSwissTeamStatus(team, swiss) !== "active")
  );
}

export function getQualifiedTeams(teamNames: string[], swiss: SwissBracketState): string[] {
  return getSwissStandings(teamNames, swiss)
    .filter((entry) => entry.status === "advanced")
    .map((entry) => entry.team);
}

export function canStartSwissPlayoffs(
  teamNames: string[],
  swiss: SwissBracketState,
): boolean {
  if (getSwissPhase(swiss) === "playoffs") return false;
  if (!isSwissGroupStageComplete(teamNames, swiss)) return false;
  return getQualifiedTeams(teamNames, swiss).length >= 2;
}

export function validatePlayoffRound1Pairings(
  qualifiedTeams: string[],
  pairings: PlayoffRound1Pairing[],
): string | null {
  const usage = new Map<string, number>();

  for (const pairing of pairings) {
    if (!pairing.teamA && !pairing.teamB) {
      return "Each playoff match needs at least one team (the other slot can be a bye).";
    }
    if (pairing.teamA && pairing.teamB && pairing.teamA === pairing.teamB) {
      return "A team cannot be paired against itself.";
    }

    for (const team of [pairing.teamA, pairing.teamB]) {
      if (!team) continue;
      usage.set(team, (usage.get(team) ?? 0) + 1);
    }
  }

  for (const [team, count] of usage) {
    if (count > 1) return `${team} is assigned to more than one match.`;
  }

  for (const team of qualifiedTeams) {
    if (!usage.has(team)) return `${team} must be placed in a round-1 playoff match.`;
  }

  for (const team of usage.keys()) {
    if (!qualifiedTeams.includes(team)) {
      return `${team} is not a qualified team.`;
    }
  }

  return null;
}

export interface StartSwissPlayoffsOptions {
  includeThirdPlaceMatch?: boolean;
}

export function startSwissPlayoffs(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
  swiss: SwissBracketState,
  teamNames: string[],
  round1Pairings: PlayoffRound1Pairing[],
  options?: StartSwissPlayoffsOptions,
): { matches: ManagedMatch[]; roundMetas: BracketRoundMeta[]; swiss: SwissBracketState } {
  if (
    getSwissPhase(swiss) === "playoffs" ||
    swiss.playoffsSeededTeams ||
    roundMetas.some((meta) => meta.side === "playoff" || meta.id.startsWith("po-r"))
  ) {
    throw new Error("Playoffs have already been started.");
  }

  const qualified = getQualifiedTeams(teamNames, swiss);
  if (qualified.length < 2) {
    throw new Error("At least 2 teams must qualify before starting playoffs.");
  }

  const validationError = validatePlayoffRound1Pairings(qualified, round1Pairings);
  if (validationError) {
    throw new Error(validationError);
  }

  const includeThirdPlaceMatch = options?.includeThirdPlaceMatch ?? false;
  const playoff = buildPlayoffBracket(round1Pairings, { includeThirdPlaceMatch });

  return {
    matches: [...matches, ...playoff.matches],
    roundMetas: [...roundMetas, ...playoff.roundMetas],
    swiss: {
      ...swiss,
      phase: "playoffs",
      playoffsSeededTeams: qualified,
      groupStageRecords: { ...swiss.records },
      playoffThirdPlaceMatch: includeThirdPlaceMatch,
    },
  };
}

function standingsRecords(swiss: SwissBracketState): Record<string, SwissTeamRecord> {
  if (getSwissPhase(swiss) === "playoffs" && swiss.groupStageRecords) {
    return swiss.groupStageRecords;
  }
  return swiss.records;
}

function standingsStatus(team: string, swiss: SwissBracketState): SwissTeamStatus {
  const record = standingsRecords(swiss)[team] ?? { wins: 0, losses: 0 };
  if (record.wins >= swiss.winsToAdvance) return "advanced";
  if (record.losses >= swiss.lossesToEliminate) return "eliminated";
  return "active";
}

export function getSwissStandings(
  teamNames: string[],
  swiss: SwissBracketState,
): Array<{ team: string; record: SwissTeamRecord; status: SwissTeamStatus }> {
  const records = standingsRecords(swiss);

  return teamNames
    .map((team) => ({
      team,
      record: records[team] ?? { wins: 0, losses: 0 },
      status: standingsStatus(team, swiss),
    }))
    .sort((a, b) => {
      if (b.record.wins !== a.record.wins) return b.record.wins - a.record.wins;
      return a.record.losses - b.record.losses;
    });
}
