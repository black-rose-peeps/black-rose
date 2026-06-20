import { isDoubleEliminationFormat, isSwissFormat } from "../constants/formats";
import type { BracketRound, PrizeTier } from "../types";
import {
  inferPublicBracketSide,
  inferRoundIdFromMatchId,
} from "./bracket-display";
import {
  resolveGrandFinalChampion,
  resolveGrandFinalRunnerUp,
} from "@/features/admin/features/tournament-details/utils/grand-final";
import type { ManagedMatch } from "@/features/admin/features/tournament-details/utils/managed-bracket";
import type { SwissBracketState } from "@/features/admin/features/tournament-details/utils/managed-swiss-bracket";
import { getSwissPhase } from "@/features/admin/features/tournament-details/utils/managed-swiss-bracket";

export interface TournamentPlacement {
  rank: number;
  label: string;
  team: string;
  prize?: string;
}

function loserOf(match: ManagedMatch): string | null {
  if (!match.winner || !match.teamA || !match.teamB) return null;
  return match.winner === match.teamA ? match.teamB : match.teamA;
}

function findMatch(
  matches: ManagedMatch[],
  predicate: (match: ManagedMatch) => boolean,
): ManagedMatch | undefined {
  return matches.find(predicate);
}

function findMatches(
  matches: ManagedMatch[],
  predicate: (match: ManagedMatch) => boolean,
): ManagedMatch[] {
  return matches.filter(predicate);
}

function normalizeRoundLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[\u2013\u2014-]/g, " ")
    .replace(/\s+/g, " ");
}

function isChampionshipFinal(match: ManagedMatch): boolean {
  const normalized = normalizeRoundLabel(match.roundLabel);
  return /\bfinals?\b/i.test(normalized) && !/\bsemifinals?\b/i.test(normalized);
}

function isSemifinalRound(match: ManagedMatch): boolean {
  return /\bsemifinals?\b/i.test(normalizeRoundLabel(match.roundLabel));
}

function isThirdPlaceRound(match: ManagedMatch): boolean {
  const normalized = normalizeRoundLabel(match.roundLabel);
  return (
    /\b(third|3rd)\s*place\b/i.test(normalized) ||
    /\bbro(nze)?\b/i.test(normalized)
  );
}

function isLowerFinalRoundId(match: ManagedMatch): boolean {
  return match.roundId === "lb-f" || /^lb-f-m\d+$/i.test(match.id);
}

/** Lower bracket elimination match before Grand Final (excludes Lower Semifinals). */
function isLowerFinalEliminationRound(match: ManagedMatch): boolean {
  if (isLowerFinalRoundId(match)) return true;
  const normalized = normalizeRoundLabel(match.roundLabel);
  if (/\breset\b/.test(normalized) && /\blower\b/.test(normalized)) return true;
  return (
    /\blower\b/.test(normalized) &&
    /\bfinals?\b/.test(normalized) &&
    !/\bsemifinals?\b/.test(normalized)
  );
}

function lowerFinalRoundRank(match: ManagedMatch): number {
  if (isLowerFinalRoundId(match)) return 1_000;
  const normalized = normalizeRoundLabel(match.roundLabel);
  if (/\breset\b/.test(normalized) && /\blower\b/.test(normalized)) return 900;
  if (isLowerFinalEliminationRound(match)) return 800;
  return 0;
}

function pickLatestLowerFinalCandidate(matches: ManagedMatch[]): ManagedMatch | undefined {
  if (matches.length === 0) return undefined;
  return matches.reduce((best, match) =>
    lowerFinalRoundRank(match) > lowerFinalRoundRank(best) ? match : best,
  );
}

function findLowerFinalMatch(
  matches: ManagedMatch[],
  grandFinal: ManagedMatch,
): ManagedMatch | undefined {
  const wiredFeeders = findMatches(
    matches,
    (match) =>
      match.bracketSide === "lower" &&
      match.confirmed &&
      !!match.winner &&
      match.winnerNext?.matchId === grandFinal.id &&
      match.winnerNext?.slot === "teamB",
  );
  const wiredFinal = pickLatestLowerFinalCandidate(wiredFeeders);
  if (wiredFinal) return wiredFinal;

  const lowerFinalist = grandFinal.teamB;
  if (lowerFinalist) {
    const winsByFinalist = findMatches(
      matches,
      (match) =>
        match.bracketSide === "lower" &&
        match.confirmed &&
        !!match.winner &&
        match.winner === lowerFinalist,
    );
    const winFinal = pickLatestLowerFinalCandidate(winsByFinalist);
    if (winFinal) return winFinal;
  }

  const labelMatches = findMatches(
    matches,
    (match) =>
      match.bracketSide === "lower" &&
      isLowerFinalEliminationRound(match) &&
      match.confirmed &&
      !!match.winner,
  );
  return pickLatestLowerFinalCandidate(labelMatches);
}

export function deriveSingleElimPlacements(matches: ManagedMatch[]): TournamentPlacement[] {
  const final = findMatch(
    matches,
    (match) => isChampionshipFinal(match) && match.confirmed && !!match.winner,
  );
  if (!final?.winner) return [];

  const placements: TournamentPlacement[] = [
    { rank: 1, label: "Champion", team: final.winner },
  ];

  const runnerUp = loserOf(final);
  if (runnerUp) placements.push({ rank: 2, label: "Runner-up", team: runnerUp });

  const semifinalLosers = findMatches(
    matches,
    (match) => isSemifinalRound(match) && match.confirmed && !!match.winner,
  )
    .map(loserOf)
    .filter((team): team is string => !!team);

  const thirdPlaceMatch = findMatch(
    matches,
    (match) =>
      isThirdPlaceRound(match) &&
      match.confirmed &&
      !!match.winner &&
      !!match.teamA &&
      !!match.teamB,
  );

  if (thirdPlaceMatch?.winner) {
    placements.push({ rank: 3, label: "3rd Place", team: thirdPlaceMatch.winner });
  } else {
    const loserSet = new Set(semifinalLosers);
    const decidingMatch = findMatch(
      matches,
      (match) =>
        match.confirmed &&
        !!match.winner &&
        !!match.teamA &&
        !!match.teamB &&
        loserSet.has(match.teamA) &&
        loserSet.has(match.teamB),
    );
    if (decidingMatch?.winner) {
      placements.push({ rank: 3, label: "3rd Place", team: decidingMatch.winner });
    }
  }

  return placements;
}

export function deriveDoubleElimPlacements(matches: ManagedMatch[]): TournamentPlacement[] {
  const champion = resolveGrandFinalChampion(matches);
  if (!champion) return [];

  const placements: TournamentPlacement[] = [
    { rank: 1, label: "Champion", team: champion },
  ];

  const runnerUp = resolveGrandFinalRunnerUp(matches);
  if (runnerUp) placements.push({ rank: 2, label: "Runner-up", team: runnerUp });

  const grandFinal = matches.find(
    (match) => match.id === "gf-m0" && match.confirmed && !!match.winner,
  );
  if (!grandFinal) return placements;

  const lowerFinal = findLowerFinalMatch(matches, grandFinal);
  const lowerFinalLoser = lowerFinal ? loserOf(lowerFinal) : null;
  if (lowerFinalLoser) {
    placements.push({ rank: 3, label: "3rd Place", team: lowerFinalLoser });
  }

  return placements;
}

export function deriveSwissPlacements(
  matches: ManagedMatch[],
  swiss: SwissBracketState,
): TournamentPlacement[] {
  if (getSwissPhase(swiss) !== "playoffs") return [];
  return deriveSingleElimPlacements(matches.filter((match) => match.bracketSide === "playoff"));
}

export function deriveManagedPlacements(
  format: string,
  matches: ManagedMatch[],
  swiss?: SwissBracketState | null,
  teamNames?: string[],
): TournamentPlacement[] {
  if (isSwissFormat(format) && swiss) {
    return deriveSwissPlacements(matches, swiss);
  }
  if (isDoubleEliminationFormat(format)) {
    return deriveDoubleElimPlacements(matches);
  }
  return deriveSingleElimPlacements(matches);
}

export function derivePublicPlacements(
  format: string,
  rounds: BracketRound[],
): TournamentPlacement[] {
  const rows = rounds.flatMap((round) =>
    round.matches
      .filter((match) => match.winner && match.teamA && match.teamB)
      .map((match) => ({
        matchId: match.id,
        roundLabel: round.label,
        bracketSide: inferPublicBracketSide(round.label),
        confirmed: true as const,
        winner: match.winner!,
        teamA: match.teamA,
        teamB: match.teamB,
      })),
  );

  if (isSwissFormat(format)) {
    const playoffRounds = rounds.filter((round) => /playoffs?/i.test(round.label));
    if (playoffRounds.length === 0) return [];

    const playoffMatches = playoffRounds.flatMap((round) =>
      round.matches
        .filter((match) => match.winner && match.teamA && match.teamB)
        .map((match) => ({
          matchId: match.id,
          roundLabel: round.label,
          bracketSide: "playoff" as const,
          confirmed: true as const,
          winner: match.winner!,
          teamA: match.teamA,
          teamB: match.teamB,
        })),
    );

    const pseudoMatches: ManagedMatch[] = playoffMatches.map((match, index) => ({
      id: match.matchId || `pub-po-${index}`,
      roundId: inferRoundIdFromMatchId(match.matchId) ?? match.roundLabel,
      roundLabel: match.roundLabel,
      label: match.roundLabel,
      bracketSide: match.bracketSide,
      teamA: match.teamA,
      teamB: match.teamB,
      scoreA: 0,
      scoreB: 0,
      winner: match.winner,
      confirmed: true,
      winnerNext: null,
      loserNext: null,
    }));

    return deriveSingleElimPlacements(pseudoMatches);
  }

  const pseudoMatches: ManagedMatch[] = rows.map((match, index) => ({
    id: match.matchId || `pub-${index}`,
    roundId: inferRoundIdFromMatchId(match.matchId) ?? match.roundLabel,
    roundLabel: match.roundLabel,
    label: match.roundLabel,
    bracketSide: match.bracketSide,
    teamA: match.teamA,
    teamB: match.teamB,
    scoreA: 0,
    scoreB: 0,
    winner: match.winner,
    confirmed: true,
    winnerNext: null,
    loserNext: null,
  }));

  if (isDoubleEliminationFormat(format)) {
    return deriveDoubleElimPlacements(pseudoMatches);
  }
  return deriveSingleElimPlacements(pseudoMatches);
}

/** Map bracket finish order onto admin-configured prize tiers (podium slots). */
export function buildPodiumPlacements(
  prizeTiers: PrizeTier[],
  rawPlacements: TournamentPlacement[],
): TournamentPlacement[] {
  if (prizeTiers.length === 0) return [];

  const sorted = [...rawPlacements].sort((a, b) => a.rank - b.rank);

  return prizeTiers
    .map((tier, index): TournamentPlacement | null => {
      const team = sorted[index]?.team;
      if (!team) return null;
      const prize = tier.prize.trim();
      return {
        rank: index + 1,
        label: tier.place.trim() || sorted[index]?.label || `Placement ${index + 1}`,
        team,
        ...(prize ? { prize } : {}),
      };
    })
    .filter((placement): placement is TournamentPlacement => placement !== null);
}

export function mergePlacementsWithPrizes(
  placements: TournamentPlacement[],
  prizeTiers: PrizeTier[],
): TournamentPlacement[] {
  return buildPodiumPlacements(prizeTiers, placements);
}

export const DEFAULT_PRIZE_TIERS: PrizeTier[] = [
  { place: "Champion", prize: "" },
  { place: "Runner-up", prize: "" },
  { place: "3rd Place", prize: "" },
];

export function prizeTiersToBreakdown(tiers: PrizeTier[]): PrizeTier[] {
  return tiers.filter((tier) => tier.place.trim() && tier.prize.trim());
}
