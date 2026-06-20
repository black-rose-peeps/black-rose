import type { BracketMatch, BracketRound } from "../types";
import { sortBracketRoundsByFlow } from "./bracket-round-order";

/** Legacy opening play-in round (pi-r1 only — not standard upper Round 1). */
export function isOpeningPlayInRound(label: string): boolean {
  return /opening.*play-in/i.test(label);
}

/** Bracket uses the legacy pi-r1 play-in column (pre–Challonge-style byes). */
export function hasLegacyOpeningPlayIn(rounds: Array<{ id?: string; label: string }>): boolean {
  return rounds.some((round) => round.id === "pi-r1" || isOpeningPlayInRound(round.label));
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

/** Partition published rounds — opening play-in is the first column of the upper bracket. */
export function partitionDoubleElimRounds(bracket: BracketRound[]): {
  upperRounds: BracketRound[];
  lowerRounds: BracketRound[];
  hasOpeningPlayIn: boolean;
} {
  const hasOpeningPlayIn = hasLegacyOpeningPlayIn(bracket);
  const upperRounds = sortBracketRoundsByFlow(
    bracket.filter(
      (round) =>
        round.id === "pi-r1" ||
        isOpeningPlayInRound(round.label) ||
        isUpperBracketRound(round.label) ||
        isGrandFinalRound(round.label),
    ),
  );
  const lowerRounds = sortBracketRoundsByFlow(
    bracket.filter((round) => isLowerBracketRound(round.label)),
  );

  return { upperRounds, lowerRounds, hasOpeningPlayIn };
}
