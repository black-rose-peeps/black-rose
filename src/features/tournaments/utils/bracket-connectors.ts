import { inferRoundIdFromMatchId } from "./bracket-display";
import type { BracketRound } from "../types";
import type { BracketRoundMeta, ManagedMatch } from "@/features/admin/features/tournament-details/utils/managed-bracket";
import { buildMatchSlotHints } from "./bracket-slot-hints";

export type ConnectorStatus = "upcoming" | "completed" | "live";

export interface LayoutInputMatch {
  id: string;
  roundIndex: number;
  roundId?: string;
  nextWinnerMatchId?: string | null;
  connectorStatus: ConnectorStatus;
  teamA?: string | null;
  teamB?: string | null;
  confirmed?: boolean;
  winner?: string | null;
}

/** Infer winner paths for published rounds missing explicit advancement ids. */
function inferWinnerLinks(rounds: BracketRound[]): Map<string, string> {
  const links = new Map<string, string>();

  for (let roundIndex = 0; roundIndex < rounds.length - 1; roundIndex++) {
    const currentRound = rounds[roundIndex];
    const nextRound = rounds[roundIndex + 1];

    currentRound.matches.forEach((match, matchIndex) => {
      const target = nextRound.matches[Math.floor(matchIndex / 2)];
      if (target) links.set(match.id, target.id);
    });
  }

  return links;
}

export function managedToLayoutMatches(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
): LayoutInputMatch[] {
  const roundIndex = new Map(roundMetas.map((round, index) => [round.id, index]));

  return matches.map((match) => ({
    id: match.id,
    roundId: match.roundId,
    roundIndex: roundIndex.get(match.roundId) ?? 0,
    nextWinnerMatchId: match.winnerNext?.matchId ?? null,
    connectorStatus: match.confirmed && match.winner ? "completed" : "upcoming",
    teamA: match.teamA,
    teamB: match.teamB,
    confirmed: match.confirmed,
    winner: match.winner,
  }));
}

export function publicToLayoutMatches(rounds: BracketRound[]): LayoutInputMatch[] {
  const inferredLinks = inferWinnerLinks(rounds);
  const layoutMatches: LayoutInputMatch[] = [];

  rounds.forEach((round, roundIndex) => {
    for (const match of round.matches) {
      layoutMatches.push({
        id: match.id,
        roundId: round.id ?? inferRoundIdFromMatchId(match.id) ?? undefined,
        roundIndex,
        nextWinnerMatchId:
          match.winnerAdvancesTo ?? inferredLinks.get(match.id) ?? null,
        connectorStatus: match.winner ? "completed" : "upcoming",
        teamA: match.teamA,
        teamB: match.teamB,
        confirmed: Boolean(match.winner),
        winner: match.winner ?? null,
      });
    }
  });

  return layoutMatches;
}

export function enrichPublicRounds(
  rounds: BracketRound[],
  managedMatches?: ManagedMatch[],
): BracketRound[] {
  if (!managedMatches?.length) return rounds;

  const links = new Map(
    managedMatches.map((match) => [
      match.id,
      {
        winnerAdvancesTo: match.winnerNext?.matchId,
        loserAdvancesTo: match.loserNext?.matchId,
      },
    ]),
  );
  const slotHints = buildMatchSlotHints(managedMatches);

  const withLinks = rounds.map((round) => ({
    ...round,
    matches: round.matches.map((match) => {
      const link = links.get(match.id);
      const hints = slotHints.get(match.id);
      if (!link && !hints) return match;

      return {
        ...match,
        winnerAdvancesTo: match.winnerAdvancesTo ?? link?.winnerAdvancesTo,
        loserAdvancesTo: match.loserAdvancesTo ?? link?.loserAdvancesTo,
        teamAHint: match.teamAHint ?? hints?.teamA,
        teamBHint: match.teamBHint ?? hints?.teamB,
      };
    }),
  }));

  return withLinks;
}

export function splitGrandFinalRounds<T extends { label: string }>(
  rounds: T[],
  isGrand: (round: T) => boolean,
): { bracketRounds: T[]; grandRounds: T[] } {
  const grandRounds = rounds.filter(isGrand);
  const bracketRounds = rounds.filter((round) => !isGrand(round));
  return { bracketRounds, grandRounds };
}
