import type { BracketMatch, BracketRound } from "../types";
import { sortBracketRoundsByFlow } from "./bracket-round-order";

/** Opening play-in round (e.g. "Opening — Play-in", id pi-r1 in admin). */
export function isOpeningPlayInRound(label: string): boolean {
  return /opening.*play-in/i.test(label);
}

/** Extract managed round id from a match id (e.g. `lb-f-m0` → `lb-f`). */
export function inferRoundIdFromMatchId(matchId: string | undefined): string | null {
  if (!matchId) return null;
  const match = matchId.match(/^(.+)-m\d+$/);
  return match?.[1] ?? null;
}

/** Map published round labels to managed bracket sides. */
export function inferPublicBracketSide(
  roundLabel: string,
): "main" | "upper" | "lower" | "grand" | "playoff" {
  if (/grand/i.test(roundLabel)) return "grand";
  if (isOpeningPlayInRound(roundLabel)) return "playoff";
  if (/upper/i.test(roundLabel)) return "upper";
  if (/lower/i.test(roundLabel)) return "lower";
  return "main";
}

export function isLowerBracketRound(label: string): boolean {
  return /lower/i.test(label);
}

export function isUpperBracketRound(label: string): boolean {
  return /upper/i.test(label);
}

export function isGrandFinalRound(label: string): boolean {
  return /grand/i.test(label);
}

/** True for the tournament-deciding match (Grand Final, single-elim Final, Swiss playoff final). */
export function isChampionshipRoundLabel(label: string): boolean {
  const trimmed = label.trim();
  if (/grand/i.test(trimmed)) return true;
  if (/^final$/i.test(trimmed)) return true;
  if (/playoffs?\s*[—-]\s*final/i.test(trimmed)) return true;
  return false;
}

export function isChampionshipMatch(match: BracketMatch, roundLabel?: string): boolean {
  if (isChampionshipRoundLabel(roundLabel ?? "")) return true;
  return isChampionshipRoundLabel(match.round);
}

/** Partition published rounds the same way as admin ManagedBracketView. */
export function partitionDoubleElimRounds(bracket: BracketRound[]): {
  playInRounds: BracketRound[];
  upperRounds: BracketRound[];
  lowerRounds: BracketRound[];
} {
  const playInRounds = sortBracketRoundsByFlow(
    bracket.filter((round) => isOpeningPlayInRound(round.label)),
  );
  const upperRounds = sortBracketRoundsByFlow(
    bracket.filter((round) => isUpperBracketRound(round.label) || isGrandFinalRound(round.label)),
  );
  const lowerRounds = sortBracketRoundsByFlow(
    bracket.filter((round) => isLowerBracketRound(round.label)),
  );

  return { playInRounds, upperRounds, lowerRounds };
}
