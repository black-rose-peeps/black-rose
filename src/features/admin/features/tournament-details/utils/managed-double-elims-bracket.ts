/**
 * Double-elimination bracket build — upper/lower wiring and schedules.
 */

import {
  bracketCapacity,
  byeCount,
  isEvenBracketFieldSize,
  isPowerOfTwo,
  powerOfTwoElimRoundMatchCounts,
} from "./bracket-field";
import {
  type BracketRoundMeta,
  type BuildBracketOptions,
  type ManagedMatch,
  recomputeAdvancements,
} from "./managed-bracket-core";
import {
  applyOpeningRoundMatchLabels,
  applySequentialMatchLabels,
  assertUniqueFeederSlots,
  competitionUpperRoundIds,
  link,
  linkWinnerAdvancementPath,
  placeBracketRoundOne,
  placeStandardFirstRound,
  wireOpeningPlayableLosersToLowerRoundOne,
} from "./managed-bracket-build-helpers";

function upperRoundLabel(
  roundIndex: number,
  totalUpperRounds: number,
  hasOpeningPlayIn: boolean,
): string {
  const displayRound = roundIndex + (hasOpeningPlayIn ? 2 : 1);
  if (roundIndex === totalUpperRounds - 1) return "Upper — Final";
  if (roundIndex === totalUpperRounds - 2) return "Upper — Semifinals";
  if (!hasOpeningPlayIn && roundIndex === totalUpperRounds - 3) return "Upper — Quarterfinals";
  return `Upper — Round ${displayRound}`;
}

function upperRoundMeta(
  roundIndex: number,
  totalUpperRounds: number,
  matchCount: number,
  hasOpeningPlayIn = false,
): { id: string; label: string } {
  if (roundIndex === totalUpperRounds - 1) {
    return { id: "ub-f", label: "Upper — Final" };
  }
  if (roundIndex === 0) {
    return {
      id: "ub-r1",
      label: hasOpeningPlayIn ? "Upper — Round 2" : "Upper — Round 1",
    };
  }
  if (roundIndex === totalUpperRounds - 2) {
    return { id: "ub-sf", label: "Upper — Semifinals" };
  }
  if (roundIndex === totalUpperRounds - 3) {
    return {
      id: "ub-qf",
      label: hasOpeningPlayIn ? "Upper — Round 3" : "Upper — Quarterfinals",
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
  if (roundIndex === totalLowerRounds - 1) {
    return { id: "lb-f", label: "Lower — Final" };
  }
  if (roundIndex === totalLowerRounds - 2) {
    return { id: "lb-sf", label: "Lower — Semifinals" };
  }
  if (roundIndex === 0) {
    return { id: "lb-r1", label: "Lower — Round 1" };
  }
  return {
    id: `lb-r${roundIndex + 1}`,
    label: `Lower — Round ${roundIndex + 1}`,
  };
}

function lowerRoundId(lbRoundIndex: number, lbRoundCount: number): string {
  if (lbRoundIndex === lbRoundCount - 1) return "lb-f";
  if (lbRoundIndex === lbRoundCount - 2) return "lb-sf";
  if (lbRoundIndex === 0) return "lb-r1";
  return `lb-r${lbRoundIndex + 1}`;
}

/**
 * Challonge lower-bracket match counts for a Po2 tree (e.g. 24 teams / 32 cap):
 * [8, 4, 4, 2, 2, 1, 1] — LR1 merges UR1+UR2 losers, then alternate advance / drop.
 */
function buildLowerBracketSchedule(
  ubRounds: number,
  bracketSize: number,
): { lbRoundCount: number; lbRoundIds: string[]; lbMatchCounts: number[] } {
  const lbRoundCount = 2 * (ubRounds - 1) - 1;
  const lbRoundIds: string[] = [];
  const lbMatchCounts: number[] = [];

  let matchCount = bracketSize / 4;

  for (let r = 0; r < lbRoundCount; r++) {
    lbRoundIds.push(lowerRoundId(r, lbRoundCount));
    lbMatchCounts.push(matchCount);
    if (r % 2 === 0) {
      matchCount = Math.max(1, matchCount / 2);
    }
  }

  return { lbRoundCount, lbRoundIds, lbMatchCounts };
}

/** Wire LB winners forward — odd rounds advance (pair), even rounds incoming (→ teamA). */
function wireLowerBracketWinners(
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

function wireUpperLosersToLower(
  matches: ManagedMatch[],
  lbRoundIds: string[],
  ubRoundIds: string[],
  ubMatchCounts: number[],
  registeredCount: number,
  roundMetas: BracketRoundMeta[],
): void {
  const hasRoundOneByes = byeCount(registeredCount) > 0;
  const ubR1Meta = roundMetas.find((meta) => meta.id === ubRoundIds[0]);
  const lbR1Id = lbRoundIds[0];
  const lbR1Count = roundMetas.find((meta) => meta.id === lbR1Id)?.matchIds.length ?? 0;

  if (hasRoundOneByes && ubR1Meta) {
    wireOpeningPlayableLosersToLowerRoundOne(matches, ubR1Meta, registeredCount);

    if (ubRoundIds.length > 1 && lbR1Count > 0) {
      const ubR2Id = ubRoundIds[1];
      const ubR2Count = ubMatchCounts[1] ?? 0;
      for (let i = 0; i < ubR2Count && i < lbR1Count; i++) {
        link(matches, `${ubR2Id}-m${i}`, `${lbR1Id}-m${i}`, "teamA", true);
      }
    }
  } else {
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
    addRound(id, label, "upper", count, r === ubRounds - 1 ? () => "Upper Final" : undefined);
  }

  addRound("gf", "Grand Final", "grand", 1, () => "Grand Final");

  const { lbRoundCount, lbRoundIds, lbMatchCounts } = buildLowerBracketSchedule(ubRounds, capacity);

  for (let r = 0; r < lbRoundCount; r++) {
    const id = lbRoundIds[r];
    const count = lbMatchCounts[r];
    const { label } = lowerRoundMeta(r, lbRoundCount);
    addRound(id, label, "lower", count, id === "lb-f" ? () => "Lower Final" : undefined);
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

  link(matches, "ub-f-m0", "gf-m0", "teamA");
  link(matches, "ub-f-m0", `${lbRoundIds[lbRoundCount - 1]}-m0`, "teamB", true);

  wireUpperLosersToLower(matches, lbRoundIds, ubRoundIds, ubMatchCounts, n, roundMetas);

  wireLowerBracketWinners(matches, lbRoundIds, lbMatchCounts);

  link(matches, `${lbRoundIds[lbRoundCount - 1]}-m0`, "gf-m0", "teamB");

  const ubR1 = matches.filter((m) => m.roundId === "ub-r1");
  placeBracketRoundOne(ubR1, teamNames, n);
  applyOpeningRoundMatchLabels(matches, roundMetas, n);
  applySequentialMatchLabels(matches, roundMetas);

  assertUniqueFeederSlots(matches);
  return { matches: recomputeAdvancements(matches), roundMetas };
}

/** Minimal 4-team double elimination (upper R1 → upper F; lower R1 → lower F → GF). */
function buildFourTeamDoubleElim(
  teamNames: string[],
  options?: { hasPlayInLosersPool?: boolean; teamCount?: number },
): {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
} {
  const hasPlayInLosersPool = options?.hasPlayInLosersPool ?? false;
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

  addRound("ub-r1", "Upper — Semifinals", "upper", 2);
  addRound("ub-f", "Upper — Final", "upper", 1, () => "Upper Final");
  addRound("lb-r1", "Lower — Round 1", "lower", hasPlayInLosersPool ? 2 : 1);
  if (hasPlayInLosersPool) {
    addRound("lb-r2", "Lower — Final", "lower", 1, () => "Lower Final");
  }
  addRound("lb-f", hasPlayInLosersPool ? "Lower — Reset" : "Lower — Final", "lower", 1, () =>
    hasPlayInLosersPool ? "Lower Reset" : "Lower Final",
  );
  addRound("gf", "Grand Final", "grand", 1, () => "Grand Final");

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
  link(matches, "ub-f-m0", "gf-m0", "teamA");
  link(matches, "ub-f-m0", "lb-f-m0", "teamB", true);
  link(matches, "lb-f-m0", "gf-m0", "teamB");

  const ubR1 = matches.filter((m) => m.id.startsWith("ub-r1-"));
  const teamCount = options?.teamCount ?? teamNames.length;
  placeStandardFirstRound(ubR1, teamNames, teamCount, 4);

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
    return buildFourTeamDoubleElim(teamNames);
  }

  const capacity = bracketCapacity(n);
  if (capacity < 8) {
    throw new Error(`Double elimination requires at least 4 teams; received ${n}.`);
  }

  return buildDoubleElimPowerOfTwo(teamNames, options);
}
