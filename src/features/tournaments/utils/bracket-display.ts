import type { BracketMatch, BracketRound } from "../types";

/** Opening play-in round (e.g. "Opening — Play-in", id pi-r1 in admin). */
export function isOpeningPlayInRound(label: string): boolean {
  return /opening.*play-in/i.test(label);
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
  const playInRounds = bracket.filter((r) => isOpeningPlayInRound(r.label));
  const upperRounds = bracket.filter((r) => isUpperBracketRound(r.label) || isGrandFinalRound(r.label));
  const lowerRounds = bracket.filter((r) => isLowerBracketRound(r.label));

  return { playInRounds, upperRounds, lowerRounds };
}
