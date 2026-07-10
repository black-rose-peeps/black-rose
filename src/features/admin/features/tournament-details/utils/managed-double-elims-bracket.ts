/**
 * Double-elimination bracket build — upper/lower wiring and schedules.
 */

import {
  bracketCapacity,
  isEvenBracketFieldSize,
  isPowerOfTwo,
  powerOfTwoElimRoundMatchCounts,
  usesCompressedPreliminaryField,
  usesFullFieldRoundOne,
} from "./bracket-field";
import {
  buildLowerBracketScheduleCompressedPreliminary,
  wireLowerBracketWinnersCompressedPreliminary,
  wireUpperLosersToLowerCompressedPreliminary,
} from "./compressed-preliminary-double-elim";
import { DEFAULT_GRAND_FINAL_MODE, type GrandFinalMode } from "./grand-final";
import {
  type BracketRoundMeta,
  type BuildBracketOptions,
  type ManagedMatch,
  recomputeAdvancements,
} from "./managed-bracket-core";
import { buildLowerBracketScheduleByeField, lowerRoundId } from "./lower-bracket-schedule";
import {
  applyOpeningRoundMatchLabels,
  assertUniqueFeederSlots,
  competitionUpperRoundIds,
  link,
  linkWinnerAdvancementPath,
  placeBracketRoundOne,
  placeStandardFirstRound,
  wireOpeningPlayableLosersToLowerRoundOne,
} from "./managed-bracket-build-helpers";
import { applyGlobalMatchLabels } from "@/features/tournaments/utils/bracket-global-match-labels";
import { sortBracketRoundsByFlow } from "@/features/tournaments/utils/bracket-round-order";

function upperRoundLabel(
  roundIndex: number,
  totalUpperRounds: number,
  hasOpeningPlayIn: boolean,
): string {
  const displayRound = roundIndex + (hasOpeningPlayIn ? 2 : 1);
  if (roundIndex === totalUpperRounds - 1) return "Upper — Semifinals";
  if (roundIndex === totalUpperRounds - 2) return "Upper — Quarterfinals";
  return `Upper — Round ${displayRound}`;
}

function upperRoundMeta(
  roundIndex: number,
  totalUpperRounds: number,
  _matchCount: number,
  hasOpeningPlayIn = false,
): { id: string; label: string } {
  if (roundIndex === totalUpperRounds - 1) {
    return { id: "ub-f", label: "Upper — Semifinals" };
  }
  if (roundIndex === 0) {
    return {
      id: "ub-r1",
      label: hasOpeningPlayIn ? "Upper — Round 2" : "Upper — Round 1",
    };
  }
  if (roundIndex === totalUpperRounds - 2) {
    return { id: "ub-sf", label: "Upper — Quarterfinals" };
  }
  if (roundIndex === totalUpperRounds - 3) {
    return {
      id: "ub-qf",
      label: hasOpeningPlayIn ? "Upper — Round 3" : `Upper — Round ${roundIndex + 1}`,
    };
  }
  return {
    id: `ub-r${roundIndex + 1}`,
    label: upperRoundLabel(roundIndex, totalUpperRounds, hasOpeningPlayIn),
  };
}

function lowerRoundMeta(
  roundIndex: number,
  totalLowerRounds: number,
): { id: string; label: string } {
  const id = lowerRoundId(roundIndex, totalLowerRounds);
  const roundNumber = roundIndex + 1;

  if (totalLowerRounds >= 2 && roundIndex >= totalLowerRounds - 2) {
    return { id, label: "Lower — Semifinals" };
  }
  if (
    totalLowerRounds >= 4 &&
    roundIndex >= totalLowerRounds - 4 &&
    roundIndex < totalLowerRounds - 2
  ) {
    return { id, label: "Lower — Quarterfinals" };
  }

  return { id, label: `Lower — Round ${roundNumber}` };
}

/** Recompute double-elim round column labels (new brackets + published payload normalize). */
export function applyDoubleElimRoundMetaLabels(roundMetas: BracketRoundMeta[]): void {
  const hasOpeningPlayIn = roundMetas.some((round) => round.id === "pi-r1");
  const upper = sortBracketRoundsByFlow(roundMetas.filter((round) => round.side === "upper"));
  const lower = sortBracketRoundsByFlow(roundMetas.filter((round) => round.side === "lower"));

  upper.forEach((meta, index) => {
    meta.label = upperRoundMeta(index, upper.length, meta.matchIds.length, hasOpeningPlayIn).label;
  });

  lower.forEach((meta, index) => {
    meta.label = lowerRoundMeta(index, lower.length).label;
  });
}

/**
 * Challonge lower-bracket match counts for a full Po2 field (e.g. 16 teams):
 * [4, 4, 2, 2, 1, 1] — LR1 pairs UR1 losers; LR2 receives UR2 losers; alternate consolidate / drop.
 */
function buildLowerBracketScheduleFullField(
  ubRounds: number,
  bracketSize: number,
): { lbRoundCount: number; lbRoundIds: string[]; lbMatchCounts: number[] } {
  const lbRoundCount = 2 * (ubRounds - 1);
  const lbRoundIds: string[] = [];
  const lbMatchCounts: number[] = [];

  let matchCount = bracketSize / 4;

  for (let r = 0; r < lbRoundCount; r++) {
    lbRoundIds.push(lowerRoundId(r, lbRoundCount));
    lbMatchCounts.push(matchCount);
    if (r % 2 === 1) {
      matchCount = Math.max(1, matchCount / 2);
    }
  }

  return { lbRoundCount, lbRoundIds, lbMatchCounts };
}

/** Wire LB winners forward — full Po2 field (same-count rounds advance 1:1; halving rounds pair). */
function wireLowerBracketWinnersFullField(
  matches: ManagedMatch[],
  lbRoundIds: string[],
  lbMatchCounts: number[],
): void {
  for (let r = 1; r < lbRoundIds.length; r++) {
    const prevId = lbRoundIds[r - 1];
    const currId = lbRoundIds[r];
    const prevCount = lbMatchCounts[r - 1] ?? 0;
    const currCount = lbMatchCounts[r] ?? 0;

    if (prevCount === currCount) {
      for (let i = 0; i < prevCount; i++) {
        link(matches, `${prevId}-m${i}`, `${currId}-m${i}`, "teamA");
      }
      continue;
    }

    for (let i = 0; i < prevCount; i++) {
      link(
        matches,
        `${prevId}-m${i}`,
        `${currId}-m${Math.floor(i / 2)}`,
        i % 2 === 0 ? "teamA" : "teamB",
      );
    }
  }
}

/** Wire LB winners forward — bye field (odd rounds pair, even rounds incoming → teamA). */
function wireLowerBracketWinnersByeField(
  matches: ManagedMatch[],
  lbRoundIds: string[],
  lbMatchCounts: number[],
): void {
  for (let r = 1; r < lbRoundIds.length; r++) {
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

/** Upper losers → lower — full Po2 field (8 / 16 / 32 registered teams). */
function wireUpperLosersToLowerFullField(
  matches: ManagedMatch[],
  lbRoundIds: string[],
  ubRoundIds: string[],
  ubMatchCounts: number[],
): void {
  const lbR1Id = lbRoundIds[0];
  const ubR1Count = ubMatchCounts[0] ?? 0;

  for (let i = 0; i < ubR1Count; i++) {
    link(
      matches,
      `${ubRoundIds[0]}-m${i}`,
      `${lbR1Id}-m${Math.floor(i / 2)}`,
      i % 2 === 0 ? "teamA" : "teamB",
      true,
    );
  }

  for (let ubRoundIndex = 1; ubRoundIndex <= ubRoundIds.length - 2; ubRoundIndex++) {
    const lbRoundIndex = 2 * ubRoundIndex - 1;
    if (lbRoundIndex >= lbRoundIds.length) continue;

    const ubCount = ubMatchCounts[ubRoundIndex] ?? 0;
    const lbId = lbRoundIds[lbRoundIndex];
    for (let i = 0; i < ubCount; i++) {
      const lbMatchIndex = ubCount - 1 - i;
      link(matches, `${ubRoundIds[ubRoundIndex]}-m${i}`, `${lbId}-m${lbMatchIndex}`, "teamB", true);
    }
  }
}

/** Upper losers → lower — bye field (18 / 20 / 22 / 24 / … registered teams). */
function wireUpperLosersToLowerByeField(
  matches: ManagedMatch[],
  lbRoundIds: string[],
  ubRoundIds: string[],
  ubMatchCounts: number[],
  registeredCount: number,
  roundMetas: BracketRoundMeta[],
): void {
  const ubR1Meta = roundMetas.find((meta) => meta.id === ubRoundIds[0]);
  const lbR1Id = lbRoundIds[0];
  const lbR1Count = roundMetas.find((meta) => meta.id === lbR1Id)?.matchIds.length ?? 0;

  if (ubR1Meta) {
    wireOpeningPlayableLosersToLowerRoundOne(matches, ubR1Meta, registeredCount);
  }

  if (ubRoundIds.length > 1 && lbR1Count > 0) {
    const ubR2Id = ubRoundIds[1];
    const ubR2Count = ubMatchCounts[1] ?? 0;
    for (let i = 0; i < ubR2Count && i < lbR1Count; i++) {
      link(matches, `${ubR2Id}-m${i}`, `${lbR1Id}-m${i}`, "teamA", true);
    }
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

interface DoubleElimWiring {
  buildLowerBracketSchedule: (
    ubRounds: number,
    bracketSize: number,
    registeredCount: number,
  ) => { lbRoundCount: number; lbRoundIds: string[]; lbMatchCounts: number[] };
  wireLowerBracketWinners: (
    matches: ManagedMatch[],
    lbRoundIds: string[],
    lbMatchCounts: number[],
    registeredCount: number,
  ) => void;
  wireUpperLosersToLower: (
    matches: ManagedMatch[],
    lbRoundIds: string[],
    ubRoundIds: string[],
    ubMatchCounts: number[],
    registeredCount: number,
    roundMetas: BracketRoundMeta[],
  ) => void;
}

const FULL_FIELD_DOUBLE_ELIM_WIRING: DoubleElimWiring = {
  buildLowerBracketSchedule: (ubRounds, bracketSize) =>
    buildLowerBracketScheduleFullField(ubRounds, bracketSize),
  wireLowerBracketWinners: (matches, lbRoundIds, lbMatchCounts) =>
    wireLowerBracketWinnersFullField(matches, lbRoundIds, lbMatchCounts),
  wireUpperLosersToLower: (matches, lbRoundIds, ubRoundIds, ubMatchCounts) =>
    wireUpperLosersToLowerFullField(matches, lbRoundIds, ubRoundIds, ubMatchCounts),
};

const BYE_FIELD_DOUBLE_ELIM_WIRING: DoubleElimWiring = {
  buildLowerBracketSchedule: buildLowerBracketScheduleByeField,
  wireLowerBracketWinners: (matches, lbRoundIds, lbMatchCounts) =>
    wireLowerBracketWinnersByeField(matches, lbRoundIds, lbMatchCounts),
  wireUpperLosersToLower: wireUpperLosersToLowerByeField,
};

const COMPRESSED_PRELIMINARY_DOUBLE_ELIM_WIRING: DoubleElimWiring = {
  buildLowerBracketSchedule: (ubRounds, bracketSize, registeredCount) =>
    buildLowerBracketScheduleCompressedPreliminary(ubRounds, bracketSize, registeredCount),
  wireLowerBracketWinners: (matches, lbRoundIds, lbMatchCounts, registeredCount) =>
    wireLowerBracketWinnersCompressedPreliminary(
      matches,
      lbRoundIds,
      lbMatchCounts,
      registeredCount,
    ),
  wireUpperLosersToLower: wireUpperLosersToLowerCompressedPreliminary,
};

function doubleElimWiringForTeamCount(teamCount: number): DoubleElimWiring {
  if (usesFullFieldRoundOne(teamCount)) {
    return FULL_FIELD_DOUBLE_ELIM_WIRING;
  }
  if (usesCompressedPreliminaryField(teamCount)) {
    return COMPRESSED_PRELIMINARY_DOUBLE_ELIM_WIRING;
  }
  return BYE_FIELD_DOUBLE_ELIM_WIRING;
}

function buildDoubleElimPowerOfTwo(
  teamNames: string[],
  options?: BuildBracketOptions,
): {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
} {
  const n = teamNames.length;
  const capacity = bracketCapacity(n);
  if (!isPowerOfTwo(capacity) || capacity < 8) {
    throw new Error(
      `buildDoubleElimPowerOfTwo requires bracket capacity ≥ 8; received ${n} (capacity ${capacity}).`,
    );
  }

  const matches: ManagedMatch[] = [];
  const roundMetas: BracketRoundMeta[] = [];

  const addRound = (
    id: string,
    label: string,
    side: ManagedMatch["bracketSide"],
    count: number,
    labelFn?: (i: number) => string,
  ): void => {
    for (let i = 0; i < count; i++) {
      const mid = `${id}-m${i}`;
      matches.push({
        id: mid,
        roundId: id,
        roundLabel: label,
        label: labelFn ? labelFn(i) : count > 1 ? `Match ${i + 1}` : label,
        bracketSide: side,
        teamA: null,
        teamB: null,
        scoreA: 0,
        scoreB: 0,
        winner: null,
        confirmed: false,
        winnerNext: null,
        loserNext: null,
      });
    }
    roundMetas.push({
      id,
      label,
      side,
      matchIds: Array.from({ length: count }, (_, i) => `${id}-m${i}`),
    });
  };

  const ubMatchCounts = powerOfTwoElimRoundMatchCounts(capacity);
  const ubRounds = ubMatchCounts.length;
  const grandFinalMode: GrandFinalMode = options?.grandFinalMode ?? DEFAULT_GRAND_FINAL_MODE;
  const includeGrandFinal = grandFinalMode !== "none";

  const hasOpeningPlayIn = options?.openingPlayIn ?? false;

  for (let r = 0; r < ubRounds; r++) {
    const count = ubMatchCounts[r];
    const id =
      r === 0
        ? "ub-r1"
        : r === ubRounds - 1
          ? "ub-f"
          : r === ubRounds - 2
            ? "ub-sf"
            : r === ubRounds - 3
              ? "ub-qf"
              : `ub-r${r + 1}`;
    const { label } = upperRoundMeta(r, ubRounds, count, hasOpeningPlayIn);
    addRound(id, label, "upper", count);
  }

  if (includeGrandFinal) {
    addRound("gf", "Grand Final", "grand", 1, () => "Grand Final");
  }

  const wiring = doubleElimWiringForTeamCount(n);
  const { lbRoundCount, lbRoundIds, lbMatchCounts } = wiring.buildLowerBracketSchedule(
    ubRounds,
    capacity,
    n,
  );

  for (let r = 0; r < lbRoundCount; r++) {
    const id = lbRoundIds[r];
    const count = lbMatchCounts[r];
    const { label } = lowerRoundMeta(r, lbRoundCount);
    addRound(id, label, "lower", count);
  }

  const ubRoundIds = competitionUpperRoundIds(roundMetas);
  for (let r = 0; r < ubRoundIds.length - 1; r++) {
    const fromId = ubRoundIds[r];
    const toId = ubRoundIds[r + 1];
    const fromCount = ubMatchCounts[r];
    for (let i = 0; i < fromCount; i++) {
      link(
        matches,
        `${fromId}-m${i}`,
        `${toId}-m${Math.floor(i / 2)}`,
        i % 2 === 0 ? "teamA" : "teamB",
      );
    }
  }

  const lbFinalId = `${lbRoundIds[lbRoundCount - 1]}-m0`;

  if (includeGrandFinal) {
    link(matches, "ub-f-m0", "gf-m0", "teamA");
    link(matches, "ub-f-m0", lbFinalId, "teamB", true);
  } else {
    link(matches, "ub-f-m0", lbFinalId, "teamB", true);
  }

  wiring.wireUpperLosersToLower(matches, lbRoundIds, ubRoundIds, ubMatchCounts, n, roundMetas);

  wiring.wireLowerBracketWinners(matches, lbRoundIds, lbMatchCounts, n);

  if (includeGrandFinal) {
    link(matches, lbFinalId, "gf-m0", "teamB");
  }

  const ubR1 = matches.filter((m) => m.roundId === "ub-r1");
  placeBracketRoundOne(ubR1, teamNames, n);
  applyOpeningRoundMatchLabels(matches, roundMetas, n);
  applyGlobalMatchLabels(matches, roundMetas, "double");

  assertUniqueFeederSlots(matches);
  return { matches: recomputeAdvancements(matches), roundMetas };
}

/** Minimal 4-team double elimination (upper R1 → upper F; lower R1 → lower F → GF). */
function buildFourTeamDoubleElim(
  teamNames: string[],
  options?: { hasPlayInLosersPool?: boolean; teamCount?: number; grandFinalMode?: GrandFinalMode },
): {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
} {
  const hasPlayInLosersPool = options?.hasPlayInLosersPool ?? false;
  const grandFinalMode = options?.grandFinalMode ?? DEFAULT_GRAND_FINAL_MODE;
  const includeGrandFinal = grandFinalMode !== "none";
  const matches: ManagedMatch[] = [];
  const roundMetas: BracketRoundMeta[] = [];

  const addRound = (
    id: string,
    label: string,
    side: ManagedMatch["bracketSide"],
    count: number,
    labelFn?: (i: number) => string,
  ): void => {
    for (let i = 0; i < count; i++) {
      matches.push({
        id: `${id}-m${i}`,
        roundId: id,
        roundLabel: label,
        label: labelFn ? labelFn(i) : count > 1 ? `Match ${i + 1}` : label,
        bracketSide: side,
        teamA: null,
        teamB: null,
        scoreA: 0,
        scoreB: 0,
        winner: null,
        confirmed: false,
        winnerNext: null,
        loserNext: null,
      });
    }
    roundMetas.push({
      id,
      label,
      side,
      matchIds: Array.from({ length: count }, (_, i) => `${id}-m${i}`),
    });
  };

  addRound("ub-r1", "Upper — Quarterfinals", "upper", 2);
  addRound("ub-f", "Upper — Semifinals", "upper", 1);

  const lowerRoundPlan = hasPlayInLosersPool
    ? [
        { id: "lb-r1", count: 2 },
        { id: "lb-r2", count: 1 },
        { id: "lb-f", count: 1 },
      ]
    : [
        { id: "lb-r1", count: 1 },
        { id: "lb-f", count: 1 },
      ];

  for (let r = 0; r < lowerRoundPlan.length; r++) {
    const plan = lowerRoundPlan[r];
    const { label } = lowerRoundMeta(r, lowerRoundPlan.length);
    addRound(plan.id, label, "lower", plan.count);
  }

  if (includeGrandFinal) {
    addRound("gf", "Grand Final", "grand", 1, () => "Grand Final");
  }

  link(matches, "ub-r1-m0", "ub-f-m0", "teamA");
  link(matches, "ub-r1-m1", "ub-f-m0", "teamB");
  if (hasPlayInLosersPool) {
    // lb-r1-m0: play-in losers (wired by wirePlayInToMainBracket)
    // lb-r1-m1: upper semifinal losers
    link(matches, "ub-r1-m0", "lb-r1-m1", "teamA", true);
    link(matches, "ub-r1-m1", "lb-r1-m1", "teamB", true);
    link(matches, "lb-r1-m0", "lb-r2-m0", "teamA");
    link(matches, "lb-r1-m1", "lb-r2-m0", "teamB");
    link(matches, "lb-r2-m0", "lb-f-m0", "teamA");
  } else {
    link(matches, "ub-r1-m0", "lb-r1-m0", "teamA", true);
    link(matches, "ub-r1-m1", "lb-r1-m0", "teamB", true);
    link(matches, "lb-r1-m0", "lb-f-m0", "teamA");
  }
  if (includeGrandFinal) {
    link(matches, "ub-f-m0", "gf-m0", "teamA");
    link(matches, "ub-f-m0", "lb-f-m0", "teamB", true);
    link(matches, "lb-f-m0", "gf-m0", "teamB");
  } else {
    link(matches, "ub-f-m0", "lb-f-m0", "teamB", true);
  }

  const ubR1 = matches.filter((m) => m.id.startsWith("ub-r1-"));
  const teamCount = options?.teamCount ?? teamNames.length;
  placeStandardFirstRound(ubR1, teamNames, teamCount, 4);
  applyOpeningRoundMatchLabels(matches, roundMetas, teamCount);
  applyGlobalMatchLabels(matches, roundMetas, "double");

  return { matches, roundMetas };
}

export function buildDoubleElimMatches(
  teamNames: string[],
  options?: BuildBracketOptions,
): {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
} {
  const n = teamNames.length;
  if (!isEvenBracketFieldSize(n)) {
    throw new Error(`buildDoubleElimMatches requires an even team count ≥ 2; received ${n}.`);
  }

  if (n === 2) {
    throw new Error(
      "Double elimination requires at least 4 teams. Use single elimination for 2-team events.",
    );
  }

  if (n === 4) {
    return buildFourTeamDoubleElim(teamNames, {
      grandFinalMode: options?.grandFinalMode,
    });
  }

  const capacity = bracketCapacity(n);
  if (capacity < 8) {
    throw new Error(`Double elimination requires at least 4 teams; received ${n}.`);
  }

  return buildDoubleElimPowerOfTwo(teamNames, options);
}
