import { inferRoundIdFromMatchId } from "./bracket-display";
import type { BracketRound } from "../types";

/** Deterministic left-to-right order for bracket columns (matches advancement processing). */
export function roundFlowRank(roundId: string): number {
  if (roundId === "gf") return 1_000_000;
  if (roundId === "gf-reset") return 1_000_001;
  // Opening play-in must precede the main / upper opening round (e.g. se-r0, ub-r1).
  if (roundId === "pi-r1") return 5;

  const poMatch = roundId.match(/^po-r(\d+)$/);
  if (poMatch) return 10_000 + parseInt(poMatch[1], 10) * 10;

  const seMatch = roundId.match(/^se-r(\d+)$/);
  if (seMatch) return (parseInt(seMatch[1], 10) + 1) * 10;

  const ubSpecial: Record<string, number> = {
    "ub-r1": 100,
    "ub-qf": 300,
    "ub-sf": 500,
    "ub-f": 700,
  };
  if (roundId in ubSpecial) return ubSpecial[roundId];

  const ubMatch = roundId.match(/^ub-r(\d+)$/);
  if (ubMatch) return 100 + (parseInt(ubMatch[1], 10) - 1) * 100;

  const lbSpecial: Record<string, number> = {
    "lb-pi": 150,
    "lb-r1": 200,
    "lb-pc": 250,
    "lb-r2": 400,
    "lb-sf": 600,
    "lb-f": 800,
  };
  if (roundId in lbSpecial) return lbSpecial[roundId];

  const lbPdMatch = roundId.match(/^lb-pd(\d+)$/);
  if (lbPdMatch) return 150 + parseInt(lbPdMatch[1], 10) * 5;

  const lbMatch = roundId.match(/^lb-r(\d+)$/);
  if (lbMatch) return 200 + (parseInt(lbMatch[1], 10) - 1) * 100;

  return 99_999;
}

type RoundFlowSortable = {
  id?: string;
  label: string;
  matches?: { id: string }[];
  matchIds?: string[];
};

export function resolveRoundId(round: RoundFlowSortable): string {
  if (round.id) return round.id;
  const firstMatchId = round.matches?.[0]?.id ?? round.matchIds?.[0];
  const fromMatch = inferRoundIdFromMatchId(firstMatchId);
  return fromMatch ?? round.label;
}

export function sortBracketRoundsByFlow<T extends RoundFlowSortable>(rounds: T[]): T[] {
  return [...rounds].sort(
    (a, b) => roundFlowRank(resolveRoundId(a)) - roundFlowRank(resolveRoundId(b)),
  );
}

export function sortPublicBracketRounds(rounds: BracketRound[]): BracketRound[] {
  return sortBracketRoundsByFlow(rounds);
}
