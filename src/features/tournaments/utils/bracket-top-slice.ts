import {
  bracketCapacity,
  isEvenBracketFieldSize,
} from "@/features/admin/features/tournament-details/utils/bracket-field";
import {
  isGrandFinalRound,
  isLowerBracketRound,
  isUpperBracketRound,
} from "./bracket-display";
import { sortBracketRoundsByFlow } from "./bracket-round-order";

export type BracketFocusSize = "all" | number;

type SliceableRound = {
  id?: string;
  label: string;
  side?: string;
  matches?: { id: string }[];
  matchIds?: string[];
};

function isGrandRound(round: SliceableRound): boolean {
  if (round.side === "grand") return true;
  return isGrandFinalRound(round.label);
}

function isCompetitionUpperRound(round: SliceableRound): boolean {
  if (round.side === "upper") return true;
  if (round.side === "grand" || round.side === "lower") return false;
  return isUpperBracketRound(round.label);
}

function isCompetitionLowerRound(round: SliceableRound): boolean {
  if (round.side === "lower") return true;
  if (round.side) return false;
  return isLowerBracketRound(round.label);
}

/** Powers of two below bracket capacity (e.g. 64 cap → [32, 16, 8]). */
export function getAvailableTopBracketSizes(teamCount: number): number[] {
  if (!isEvenBracketFieldSize(teamCount)) return [];
  const capacity = bracketCapacity(teamCount);
  const sizes: number[] = [];
  for (let size = 8; size < capacity; size *= 2) {
    sizes.push(size);
  }
  return sizes.reverse();
}

export function computeBracketSliceStartIndices(
  teamCount: number,
  topN: number,
): { upperStartIndex: number; lowerStartIndex: number } {
  const capacity = bracketCapacity(teamCount);
  if (topN >= capacity) {
    return { upperStartIndex: 0, lowerStartIndex: 0 };
  }

  const ratio = capacity / topN;
  const upperStartIndex = Math.log2(ratio);
  const lowerStartIndex = Math.max(0, 2 * upperStartIndex - 3);

  return { upperStartIndex, lowerStartIndex };
}

export function sliceUpperRoundsForTopN<T extends SliceableRound>(
  rounds: T[],
  teamCount: number,
  topN: number,
): T[] {
  if (topN >= bracketCapacity(teamCount)) return rounds;

  const sorted = sortBracketRoundsByFlow(rounds);
  const competition = sorted.filter(isCompetitionUpperRound);
  const grand = sorted.filter(isGrandRound);
  const { upperStartIndex } = computeBracketSliceStartIndices(teamCount, topN);

  return [...competition.slice(upperStartIndex), ...grand];
}

export function sliceLowerRoundsForTopN<T extends SliceableRound>(
  rounds: T[],
  teamCount: number,
  topN: number,
): T[] {
  if (topN >= bracketCapacity(teamCount)) return rounds;

  const sorted = sortBracketRoundsByFlow(rounds.filter(isCompetitionLowerRound));
  const { lowerStartIndex } = computeBracketSliceStartIndices(teamCount, topN);
  return sorted.slice(lowerStartIndex);
}

export function sliceEliminationRoundsForTopN<T extends SliceableRound>(
  rounds: T[],
  teamCount: number,
  topN: number,
): T[] {
  if (topN >= bracketCapacity(teamCount)) return rounds;

  const sorted = sortBracketRoundsByFlow(rounds);
  const competition = sorted.filter((round) => !isGrandRound(round));
  const grand = sorted.filter(isGrandRound);
  const { upperStartIndex } = computeBracketSliceStartIndices(teamCount, topN);

  return [...competition.slice(upperStartIndex), ...grand];
}

export function applyBracketFocusToDoubleElim<T extends SliceableRound>(
  upperRounds: T[],
  lowerRounds: T[],
  teamCount: number,
  focus: BracketFocusSize,
): { upperRounds: T[]; lowerRounds: T[] } {
  if (focus === "all") {
    return { upperRounds, lowerRounds };
  }

  return {
    upperRounds: sliceUpperRoundsForTopN(upperRounds, teamCount, focus),
    lowerRounds: sliceLowerRoundsForTopN(lowerRounds, teamCount, focus),
  };
}
