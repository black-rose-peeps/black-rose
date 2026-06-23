/**
 * Shared bracket types, formats, and runtime advancement (single + double elim).
 */

import { roundFlowRank } from "@/features/tournaments/utils/bracket-round-order";
import {
  DEFAULT_GRAND_FINAL_MODE,
  type GrandFinalMode,
} from "./grand-final";

export interface BuildBracketOptions {
  /** Opening play-in field (e.g. 24 teams) — play-in losers wait in LB R1 for UB R2 losers. */
  openingPlayIn?: boolean;
  playInMatchCount?: number;
  /** Semifinal losers play a dedicated 3rd-place match (single elim / play-in main bracket). */
  includeThirdPlaceMatch?: boolean;
  /** Double elimination grand final policy (default: bracket reset). */
  grandFinalMode?: GrandFinalMode;
}

export type BestOfFormat = "BO1" | "BO3" | "BO5";

export interface MatchSlotRef {
  matchId: string;
  slot: "teamA" | "teamB";
}

export interface ManagedMatch {
  id: string;
  roundId: string;
  roundLabel: string;
  label: string;
  bracketSide: "main" | "upper" | "lower" | "grand" | "swiss" | "playoff";
  /** Swiss pool key, e.g. "1-0" (wins-losses). */
  swissPool?: string;
  swissRound?: number;
  teamA: string | null;
  teamB: string | null;
  scoreA: number;
  scoreB: number;
  winner: string | null;
  confirmed: boolean;
  winnerNext: MatchSlotRef | null;
  loserNext: MatchSlotRef | null;
}

export interface BracketRoundMeta {
  id: string;
  label: string;
  side: ManagedMatch["bracketSide"];
  matchIds: string[];
}

export function winsRequired(format: BestOfFormat): number {
  switch (format) {
    case "BO1":
      return 1;
    case "BO3":
      return 2;
    case "BO5":
      return 3;
  }
}

const GRAND_FINAL_ROUND_IDS = new Set(["gf", "gf-reset"]);

/** Opening / first lower rounds — fast qualifiers (BO1). */
const EARLY_ELIM_ROUND_IDS = new Set(["pi-r1", "ub-r1", "lb-r1", "se-r0"]);

function recommendedFormatForRound(roundId: string, roundMetas: BracketRoundMeta[]): BestOfFormat {
  if (GRAND_FINAL_ROUND_IDS.has(roundId)) return "BO5";
  if (EARLY_ELIM_ROUND_IDS.has(roundId)) return "BO1";
  if (roundId.startsWith("lb-pd")) return "BO1";
  if (roundId === "po-3rd" || roundId === "se-3rd") return "BO3";

  if (roundId.startsWith("sw-r")) {
    const swRounds = roundMetas
      .filter((meta) => meta.id.startsWith("sw-r"))
      .map((meta) => meta.id)
      .sort((a, b) => {
        const ai = parseInt(a.replace("sw-r", ""), 10);
        const bi = parseInt(b.replace("sw-r", ""), 10);
        return ai - bi;
      });
    if (swRounds[0] === roundId) return "BO1";
    return "BO3";
  }

  if (roundId.startsWith("po-r")) {
    const poRounds = roundMetas
      .filter((meta) => meta.id.startsWith("po-r"))
      .map((meta) => meta.id)
      .sort((a, b) => {
        const ai = parseInt(a.replace("po-r", ""), 10);
        const bi = parseInt(b.replace("po-r", ""), 10);
        return ai - bi;
      });
    if (poRounds[0] === roundId) return "BO1";
    if (poRounds[poRounds.length - 1] === roundId) return "BO5";
    return "BO3";
  }

  if (roundId.startsWith("se-r")) {
    const seRounds = roundMetas
      .filter((meta) => meta.id.startsWith("se-r"))
      .map((meta) => meta.id)
      .sort((a, b) => {
        const ai = parseInt(a.replace("se-r", ""), 10);
        const bi = parseInt(b.replace("se-r", ""), 10);
        return ai - bi;
      });
    if (seRounds[0] === roundId) return "BO1";
    if (seRounds[seRounds.length - 1] === roundId) return "BO5";
    return "BO3";
  }

  return "BO3";
}

/** Recommended BO map: BO1 early rounds → BO3 mid/late → BO5 grand final(s). */
export function defaultRoundFormats(roundMetas: BracketRoundMeta[]): Record<string, BestOfFormat> {
  return Object.fromEntries(
    roundMetas.map((round) => [round.id, recommendedFormatForRound(round.id, roundMetas)]),
  );
}

export function reapplyFormatToRound(
  matches: ManagedMatch[],
  roundId: string,
  format: BestOfFormat,
): ManagedMatch[] {
  const required = winsRequired(format);
  const next = matches.map((match) => {
    if (match.roundId !== roundId || match.confirmed) return match;
    if (!match.teamA || !match.teamB) return match;

    let winner: string | null = null;
    if (match.scoreA >= required) winner = match.teamA;
    else if (match.scoreB >= required) winner = match.teamB;

    return { ...match, winner, confirmed: winner !== null };
  });

  return recomputeAdvancements(next);
}

const GRAND_FINAL_MATCH_ID = "gf-m0";
const GRAND_FINAL_RESET_MATCH_ID = "gf-reset-m0";

function grandFinalMatch(matches: ManagedMatch[]): ManagedMatch | undefined {
  return matches.find((match) => match.id === GRAND_FINAL_MATCH_ID);
}

/** Create or remove Grand Final Reset when the lower-bracket champion wins Grand Final 1. */
export function applyGrandFinalResetState(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
  grandFinalMode: GrandFinalMode = DEFAULT_GRAND_FINAL_MODE,
): { matches: ManagedMatch[]; roundMetas: BracketRoundMeta[] } {
  if (grandFinalMode !== "two_matches") {
    const hasResetMatch = matches.some((match) => match.roundId === "gf-reset");
    const hasResetMeta = roundMetas.some((meta) => meta.id === "gf-reset");
    if (!hasResetMatch && !hasResetMeta) {
      return { matches, roundMetas };
    }
    return {
      matches: matches.filter((match) => match.roundId !== "gf-reset"),
      roundMetas: roundMetas.filter((meta) => meta.id !== "gf-reset"),
    };
  }

  const gf = grandFinalMatch(matches);
  const resetMetaIndex = roundMetas.findIndex((meta) => meta.id === "gf-reset");
  const hasResetMeta = resetMetaIndex >= 0;
  const hasResetMatch = matches.some((match) => match.roundId === "gf-reset");

  const lowerWonFirstFinal =
    !!gf?.confirmed && !!gf.winner && !!gf.teamA && !!gf.teamB && gf.winner === gf.teamB;

  if (!lowerWonFirstFinal) {
    if (!hasResetMeta && !hasResetMatch) {
      return { matches, roundMetas };
    }
    return {
      matches: matches.filter((match) => match.roundId !== "gf-reset"),
      roundMetas: roundMetas.filter((meta) => meta.id !== "gf-reset"),
    };
  }

  if (hasResetMatch) {
    const reset = matches.find((match) => match.id === GRAND_FINAL_RESET_MATCH_ID);
    if (reset && gf.teamA && gf.teamB) {
      const synced = matches.map((match) =>
        match.id === GRAND_FINAL_RESET_MATCH_ID
          ? { ...match, teamA: gf.teamA, teamB: gf.teamB }
          : match,
      );
      return { matches: synced, roundMetas };
    }
    return { matches, roundMetas };
  }

  const resetMatch: ManagedMatch = {
    id: GRAND_FINAL_RESET_MATCH_ID,
    roundId: "gf-reset",
    roundLabel: "Grand Final — Reset",
    label: "Grand Final Reset",
    bracketSide: "grand",
    teamA: gf.teamA,
    teamB: gf.teamB,
    scoreA: 0,
    scoreB: 0,
    winner: null,
    confirmed: false,
    winnerNext: null,
    loserNext: null,
  };

  const resetMeta: BracketRoundMeta = {
    id: "gf-reset",
    label: "Grand Final — Reset",
    side: "grand",
    matchIds: [GRAND_FINAL_RESET_MATCH_ID],
  };

  return {
    matches: [...matches, resetMatch],
    roundMetas: [...roundMetas, resetMeta],
  };
}

export function applyBracketProgression(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
  grandFinalMode: GrandFinalMode = DEFAULT_GRAND_FINAL_MODE,
): { matches: ManagedMatch[]; roundMetas: BracketRoundMeta[] } {
  return applyGrandFinalResetState(recomputeAdvancements(matches), roundMetas, grandFinalMode);
}

function placeTeam(
  matches: ManagedMatch[],
  matchId: string,
  slot: "teamA" | "teamB",
  team: string | null,
): ManagedMatch[] {
  return matches.map((m) => {
    if (m.id !== matchId) return m;
    return { ...m, [slot]: team };
  });
}

function buildFedSlots(matches: ManagedMatch[]): Set<string> {
  const fed = new Set<string>();
  for (const m of matches) {
    if (m.winnerNext) fed.add(`${m.winnerNext.matchId}:${m.winnerNext.slot}`);
    if (m.loserNext) fed.add(`${m.loserNext.matchId}:${m.loserNext.slot}`);
  }
  return fed;
}

function resetTeamsForRecompute(match: ManagedMatch, fedSlots: Set<string>): ManagedMatch {
  const slotTeam = (slot: "teamA" | "teamB") =>
    fedSlots.has(`${match.id}:${slot}`) ? null : match[slot];

  return {
    ...match,
    teamA: slotTeam("teamA"),
    teamB: slotTeam("teamB"),
  };
}

function processingOrder(matches: ManagedMatch[]): ManagedMatch[] {
  return [...matches].sort((a, b) => roundFlowRank(a.roundId) - roundFlowRank(b.roundId));
}

function isEliminationMatch(match: ManagedMatch): boolean {
  return match.bracketSide !== "swiss";
}

function autoConfirmSoloLowerRoundOne(match: ManagedMatch): void {
  if (match.roundId !== "lb-r1" || match.confirmed) return;
  const teamA = match.teamA?.trim() || null;
  const teamB = match.teamB?.trim() || null;
  if (teamA && !teamB) {
    match.winner = teamA;
    match.scoreA = 1;
    match.scoreB = 0;
    match.confirmed = true;
  } else if (!teamA && teamB) {
    match.winner = teamB;
    match.scoreA = 0;
    match.scoreB = 1;
    match.confirmed = true;
  }
}

/** Re-apply elimination advancement without touching Swiss group-stage matches. */
export function recomputeAdvancements(matches: ManagedMatch[]): ManagedMatch[] {
  const elimMatches = matches.filter(isEliminationMatch);
  const swissMatches = matches.filter((match) => match.bracketSide === "swiss");

  const fedSlots = buildFedSlots(elimMatches);
  let nextElim = elimMatches.map((match) => resetTeamsForRecompute(match, fedSlots));

  for (const match of nextElim) {
    autoConfirmSoloLowerRoundOne(match);
  }

  for (const match of processingOrder(nextElim)) {
    if (match.confirmed && match.winner) {
      nextElim = advanceWinner(nextElim, match.id, match.winner);
    }
  }

  const elimById = new Map(nextElim.map((match) => [match.id, match]));
  return matches.map((match) => {
    if (match.bracketSide === "swiss") return match;
    return elimById.get(match.id) ?? match;
  });
}

export function updateMatchScores(
  matches: ManagedMatch[],
  matchId: string,
  scoreA: number,
  scoreB: number,
  format: BestOfFormat,
): ManagedMatch[] {
  const source = matches.find((x) => x.id === matchId);
  if (!source || !source.teamA || !source.teamB) return matches;

  const required = winsRequired(format);
  let winner: string | null = null;
  if (scoreA >= required) winner = source.teamA;
  else if (scoreB >= required) winner = source.teamB;

  const next = matches.map((x) =>
    x.id === matchId ? { ...x, scoreA, scoreB, winner, confirmed: winner !== null } : x,
  );

  return recomputeAdvancements(next);
}

export function setMatchWinner(
  matches: ManagedMatch[],
  matchId: string,
  winner: string,
  format: BestOfFormat,
): ManagedMatch[] {
  const m = matches.find((x) => x.id === matchId);
  if (!m || !m.teamA || !m.teamB) return matches;
  if (winner !== m.teamA && winner !== m.teamB) return matches;

  const required = winsRequired(format);
  const scoreA = winner === m.teamA ? required : 0;
  const scoreB = winner === m.teamB ? required : 0;
  return updateMatchScores(matches, matchId, scoreA, scoreB, format);
}

/** Clear a decided match so admins can fix misclicks. */
export function clearMatchResult(matches: ManagedMatch[], matchId: string): ManagedMatch[] {
  const next = matches.map((x) =>
    x.id === matchId ? { ...x, scoreA: 0, scoreB: 0, winner: null, confirmed: false } : x,
  );
  return recomputeAdvancements(next);
}

function advanceWinner(matches: ManagedMatch[], matchId: string, winner: string): ManagedMatch[] {
  const m = matches.find((x) => x.id === matchId);
  if (!m) return matches;

  const loser = m.teamA === winner ? m.teamB : m.teamA;
  let next = matches;

  if (m.winnerNext) {
    next = placeTeam(next, m.winnerNext.matchId, m.winnerNext.slot, winner);
  }
  if (m.loserNext && loser) {
    next = placeTeam(next, m.loserNext.matchId, m.loserNext.slot, loser);
  }

  return next;
}

export function getMatchesByRound(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
): Map<string, ManagedMatch[]> {
  const map = new Map<string, ManagedMatch[]>();
  for (const meta of roundMetas) {
    const roundMatches: ManagedMatch[] = [];
    for (const id of meta.matchIds) {
      const match = matches.find((m) => m.id === id);
      if (!match) {
        console.warn(`[getMatchesByRound] Missing match "${id}" in round "${meta.id}"`);
        continue;
      }
      roundMatches.push(match);
    }
    map.set(meta.id, roundMatches);
  }
  return map;
}
