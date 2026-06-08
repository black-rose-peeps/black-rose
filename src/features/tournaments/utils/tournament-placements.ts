import { isDoubleEliminationFormat, isSwissFormat } from "../constants/formats";
import type { BracketRound, PrizeTier } from "../types";
import type { ManagedMatch } from "@/features/admin/features/tournament-details/utils/managed-bracket";
import type { SwissBracketState } from "@/features/admin/features/tournament-details/utils/managed-swiss-bracket";
import {
  getSwissPhase,
  getSwissStandings,
} from "@/features/admin/features/tournament-details/utils/managed-swiss-bracket";

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
    placements.push({ rank: 3, label: "Bronze", team: thirdPlaceMatch.winner });
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
      placements.push({ rank: 3, label: "Bronze", team: decidingMatch.winner });
    }
  }

  return placements;
}

export function deriveDoubleElimPlacements(matches: ManagedMatch[]): TournamentPlacement[] {
  const grandFinal = findMatch(
    matches,
    (match) => match.bracketSide === "grand" && match.confirmed && !!match.winner,
  );
  if (!grandFinal?.winner) return [];

  const placements: TournamentPlacement[] = [
    { rank: 1, label: "Champion", team: grandFinal.winner },
  ];

  const runnerUp = loserOf(grandFinal);
  if (runnerUp) placements.push({ rank: 2, label: "Runner-up", team: runnerUp });

  const lowerFinal = findMatch(
    matches,
    (match) =>
      match.bracketSide === "lower" &&
      /lower.*final/i.test(match.roundLabel) &&
      match.confirmed &&
      !!match.winner,
  );
  const lowerFinalLoser = lowerFinal ? loserOf(lowerFinal) : null;
  if (lowerFinalLoser) {
    placements.push({ rank: 3, label: "Bronze", team: lowerFinalLoser });
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
  const matches = rounds.flatMap((round) =>
    round.matches
      .filter((match) => match.winner && match.teamA && match.teamB)
      .map((match) => ({
        roundLabel: round.label,
        bracketSide: /grand/i.test(round.label)
          ? ("grand" as const)
          : /lower/i.test(round.label)
            ? ("lower" as const)
            : ("main" as const),
        confirmed: true,
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
          roundLabel: round.label,
          bracketSide: "playoff" as const,
          confirmed: true,
          winner: match.winner!,
          teamA: match.teamA,
          teamB: match.teamB,
        })),
    );

    const pseudoMatches: ManagedMatch[] = playoffMatches.map((match, index) => ({
      id: `pub-po-${index}`,
      roundId: match.roundLabel,
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

  const pseudoMatches: ManagedMatch[] = matches.map((match, index) => ({
    id: `pub-${index}`,
    roundId: match.roundLabel,
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
    .map((tier, index) => {
      const team = sorted[index]?.team;
      if (!team) return null;
      return {
        rank: index + 1,
        label: tier.place.trim() || sorted[index]?.label || `Placement ${index + 1}`,
        prize: tier.prize,
        team,
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
  { place: "Bronze", prize: "" },
];

export function prizeTiersToBreakdown(tiers: PrizeTier[]): PrizeTier[] {
  return tiers.filter((tier) => tier.place.trim() && tier.prize.trim());
}
