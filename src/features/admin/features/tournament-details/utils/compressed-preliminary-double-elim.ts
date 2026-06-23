/**
 * Double-elim wiring for large-bye 64-slot fields (34–62 teams).
 * Play-in upper losers pair with their upper-R2 path in LR1; remaining upper-R2
 * losers split between LR2 singles (with LR1 winners) and direct pairs.
 */

import { bracketCapacity, openingPlayableMatchCount } from "./bracket-field";
import { bracketRoundOnePairings } from "@/features/tournaments/utils/tournament-seeding";
import { type BracketRoundMeta, type ManagedMatch } from "./managed-bracket-core";
import { link } from "./managed-bracket-build-helpers";

function isByeOnlyOpeningMatch(seedA: number, seedB: number, registeredCount: number): boolean {
  const aRegistered = seedA <= registeredCount;
  const bRegistered = seedB <= registeredCount;
  return aRegistered !== bRegistered;
}

function playableOpeningMatchIndices(registeredCount: number): number[] {
  const capacity = bracketCapacity(registeredCount);
  const pairings = bracketRoundOnePairings(capacity);
  const indices: number[] = [];
  for (let i = 0; i < pairings.length; i++) {
    const pairing = pairings[i];
    if (pairing.seedA <= registeredCount && pairing.seedB <= registeredCount) {
      indices.push(i);
    }
  }
  return indices;
}

function computeLr2DirectSlotIndices(singleCount: number, directCount: number): number[] {
  if (directCount <= 0) return [];
  const total = singleCount + directCount;
  const indices: number[] = [];
  for (let d = 0; d < directCount; d++) {
    indices.push(Math.round(((d + 1) * total) / (directCount + 1)));
  }
  return indices;
}

interface CompressedPreliminaryRouting {
  playableIndices: number[];
  openingPlayable: number;
  /** Upper-R2 slots fed by play-in paths — losers drop to the same LR1 match as the play-in. */
  playInUpperRoundTwoIndices: number[];
  lr2SingleUpperIndices: number[];
  lr2DirectPairs: Array<[number, number]>;
  lr2SingleSlotIndices: number[];
  lr2DirectSlotIndices: number[];
}

function buildCompressedPreliminaryRouting(registeredCount: number): CompressedPreliminaryRouting {
  const capacity = bracketCapacity(registeredCount);
  const openingPlayable = openingPlayableMatchCount(registeredCount);
  const pairings = bracketRoundOnePairings(capacity);
  const playableIndices = playableOpeningMatchIndices(registeredCount);
  const upperRoundTwoCount = capacity / 4;

  const lr1DropCandidates: number[] = [];

  for (let j = 0; j < upperRoundTwoCount; j++) {
    const left = pairings[j * 2];
    const right = pairings[j * 2 + 1];
    const bothByeOnly =
      isByeOnlyOpeningMatch(left.seedA, left.seedB, registeredCount) &&
      isByeOnlyOpeningMatch(right.seedA, right.seedB, registeredCount);
    if (bothByeOnly) {
      lr1DropCandidates.push(j);
    }
  }

  const playInUpperRoundTwoIndices = playableIndices.map((ubIndex) => Math.floor(ubIndex / 2));

  const lr2DirectPairs: Array<[number, number]> = [];
  const lr2DirectUpperUsed = new Set<number>();
  const sortedByeOnlyUpper = [...lr1DropCandidates].sort((a, b) => a - b);

  for (let i = 0; i < sortedByeOnlyUpper.length; ) {
    const current = sortedByeOnlyUpper[i];
    const next = sortedByeOnlyUpper[i + 1];
    if (next !== undefined && next === current + 1) {
      lr2DirectPairs.push([current, next]);
      lr2DirectUpperUsed.add(current);
      lr2DirectUpperUsed.add(next);
      i += 2;
    } else {
      i += 1;
    }
  }

  const lr2SingleUpperOrdered = sortedByeOnlyUpper
    .filter((index) => !lr2DirectUpperUsed.has(index))
    .sort((a, b) => b - a);

  const directCount = lr2DirectPairs.length;
  const directSlotIndices = computeLr2DirectSlotIndices(lr2SingleUpperOrdered.length, directCount);
  const directSlotSet = new Set(directSlotIndices);
  const lr2SingleSlotIndices: number[] = [];
  const totalLr2 = openingPlayable + directCount;
  for (let slot = 0; slot < totalLr2; slot++) {
    if (!directSlotSet.has(slot)) {
      lr2SingleSlotIndices.push(slot);
    }
  }

  return {
    playableIndices,
    openingPlayable,
    playInUpperRoundTwoIndices,
    lr2SingleUpperIndices: lr2SingleUpperOrdered,
    lr2DirectPairs,
    lr2SingleSlotIndices,
    lr2DirectSlotIndices: directSlotIndices,
  };
}

export function buildLowerBracketScheduleCompressedPreliminary(
  ubRounds: number,
  bracketSize: number,
  registeredCount: number,
): { lbRoundCount: number; lbRoundIds: string[]; lbMatchCounts: number[] } {
  const byeSchedule = buildLowerBracketScheduleByeFieldReference(ubRounds, bracketSize);
  const openingPlayable = openingPlayableMatchCount(registeredCount);
  const lbMatchCounts = [openingPlayable, ...byeSchedule.lbMatchCounts.slice(1)];
  return {
    lbRoundCount: byeSchedule.lbRoundCount,
    lbRoundIds: byeSchedule.lbRoundIds,
    lbMatchCounts,
  };
}

function buildLowerBracketScheduleByeFieldReference(
  ubRounds: number,
  bracketSize: number,
): { lbRoundCount: number; lbRoundIds: string[]; lbMatchCounts: number[] } {
  const lbRoundCount = 2 * (ubRounds - 1) - 1;
  const lbRoundIds: string[] = [];
  const lbMatchCounts: number[] = [];
  let matchCount = bracketSize / 4;

  for (let r = 0; r < lbRoundCount; r++) {
    lbRoundIds.push(lowerRoundIdReference(r, lbRoundCount));
    lbMatchCounts.push(matchCount);
    if (r % 2 === 0) {
      matchCount = Math.max(1, matchCount / 2);
    }
  }

  return { lbRoundCount, lbRoundIds, lbMatchCounts };
}

function lowerRoundIdReference(lbRoundIndex: number, lbRoundCount: number): string {
  if (lbRoundIndex === lbRoundCount - 1) return "lb-f";
  if (lbRoundIndex === lbRoundCount - 2) return "lb-sf";
  if (lbRoundIndex === 0) return "lb-r1";
  return `lb-r${lbRoundIndex + 1}`;
}

export function wireUpperLosersToLowerCompressedPreliminary(
  matches: ManagedMatch[],
  lbRoundIds: string[],
  ubRoundIds: string[],
  ubMatchCounts: number[],
  registeredCount: number,
  roundMetas: BracketRoundMeta[],
): void {
  const routing = buildCompressedPreliminaryRouting(registeredCount);
  const ubR1Id = ubRoundIds[0];
  const ubR2Id = ubRoundIds[1];
  const lbR1Id = lbRoundIds[0];
  const lbR2Id = lbRoundIds[1];

  for (let p = 0; p < routing.playableIndices.length; p++) {
    const ubIndex = routing.playableIndices[p];
    const lbIndex = routing.openingPlayable - 1 - p;
    const ubR2Index = routing.playInUpperRoundTwoIndices[p];
    link(matches, `${ubR1Id}-m${ubIndex}`, `${lbR1Id}-m${lbIndex}`, "teamB", true);
    if (ubR2Index !== undefined) {
      link(matches, `${ubR2Id}-m${ubR2Index}`, `${lbR1Id}-m${lbIndex}`, "teamA", true);
    }
  }

  routing.lr2DirectPairs.forEach(([upperA, upperB], pairIndex) => {
    const slot = routing.lr2DirectSlotIndices[pairIndex];
    if (slot === undefined) return;
    link(matches, `${ubR2Id}-m${upperA}`, `${lbR2Id}-m${slot}`, "teamA", true);
    link(matches, `${ubR2Id}-m${upperB}`, `${lbR2Id}-m${slot}`, "teamB", true);
  });

  for (let i = 0; i < routing.lr2SingleUpperIndices.length; i++) {
    const upperIndex = routing.lr2SingleUpperIndices[i];
    const slot = routing.lr2SingleSlotIndices[i];
    if (slot === undefined) continue;
    link(matches, `${ubR2Id}-m${upperIndex}`, `${lbR2Id}-m${slot}`, "teamA", true);
  }

  for (let lbRoundIndex = 2; lbRoundIndex < lbRoundIds.length; lbRoundIndex += 2) {
    const ubRoundIndex = (lbRoundIndex + 2) / 2;
    if (ubRoundIndex >= ubRoundIds.length - 1) continue;

    const ubCount = ubMatchCounts[ubRoundIndex] ?? 0;
    const lbId = lbRoundIds[lbRoundIndex];
    for (let i = 0; i < ubCount; i++) {
      const lbMatchIndex = ubCount - 1 - i;
      link(matches, `${ubRoundIds[ubRoundIndex]}-m${i}`, `${lbId}-m${lbMatchIndex}`, "teamB", true);
    }
  }
}

export function wireLowerBracketWinnersCompressedPreliminary(
  matches: ManagedMatch[],
  lbRoundIds: string[],
  lbMatchCounts: number[],
  registeredCount: number,
): void {
  const routing = buildCompressedPreliminaryRouting(registeredCount);
  const lbR2Id = lbRoundIds[1];

  for (let i = 0; i < routing.openingPlayable; i++) {
    const lr1WinnerSlot = routing.openingPlayable - 1 - i;
    const lr2Slot = routing.lr2SingleSlotIndices[i];
    if (lr2Slot === undefined) continue;
    link(matches, `${lbRoundIds[0]}-m${lr1WinnerSlot}`, `${lbR2Id}-m${lr2Slot}`, "teamB");
  }

  for (let r = 2; r < lbRoundIds.length; r++) {
    const prevId = lbRoundIds[r - 1];
    const currId = lbRoundIds[r];
    const prevCount = lbMatchCounts[r - 1] ?? 0;

    if (r % 2 === 1) {
      for (let i = 0; i < prevCount; i++) {
        link(
          matches,
          `${prevId}-m${i}`,
          `${currId}-m${Math.floor(i / 2)}`,
          i % 2 === 0 ? "teamA" : "teamB",
        );
      }
    } else {
      const currCount = lbMatchCounts[r] ?? 0;
      for (let i = 0; i < prevCount && i < currCount; i++) {
        link(matches, `${prevId}-m${i}`, `${currId}-m${i}`, "teamA");
      }
    }
  }
}
