/**
 * Managed bracket state — seeding, match results, BO formats, and advancement.
 */

import {
  isEvenBracketFieldSize,
  isPowerOfTwo,
  mainBracketSize,
  playInMatchCount,
  powerOfTwoElimRoundMatchCounts,
} from "./bracket-field";
import { roundFlowRank } from "@/features/tournaments/utils/bracket-round-order";

export type BestOfFormat = "BO1" | "BO3" | "BO5";

export interface MatchSlotRef {
  matchId: string;
  slot: "teamA" | "teamB";
}

export interface ManagedMatch {
  id: string;
  roundId: string;
  roundLabel: string;
  label: string;
  bracketSide: "main" | "upper" | "lower" | "grand" | "swiss" | "playoff";
  /** Swiss pool key, e.g. "1-0" (wins-losses). */
  swissPool?: string;
  swissRound?: number;
  teamA: string | null;
  teamB: string | null;
  scoreA: number;
  scoreB: number;
  winner: string | null;
  confirmed: boolean;
  winnerNext: MatchSlotRef | null;
  loserNext: MatchSlotRef | null;
}

export interface BracketRoundMeta {
  id: string;
  label: string;
  side: ManagedMatch["bracketSide"];
  matchIds: string[];
}

export function winsRequired(format: BestOfFormat): number {
  switch (format) {
    case "BO1":
      return 1;
    case "BO3":
      return 2;
    case "BO5":
      return 3;
  }
}

export function defaultRoundFormats(roundMetas: BracketRoundMeta[]): Record<string, BestOfFormat> {
  return Object.fromEntries(roundMetas.map((r) => [r.id, "BO3" as BestOfFormat]));
}

function link(
  matches: ManagedMatch[],
  fromId: string,
  toId: string,
  slot: "teamA" | "teamB",
  asLoser = false,
): void {
  const from = matches.find((m) => m.id === fromId);
  if (!from) return;
  const ref: MatchSlotRef = { matchId: toId, slot };
  if (asLoser) from.loserNext = ref;
  else from.winnerNext = ref;
}

/**
 * Link winners forward through elimination rounds, carrying byes when a round
 * produces more teams than the next round can host (e.g. 20 teams → 5 UB R2 winners
 * feeding 4 quarterfinal slots, with one bye carried forward).
 */
function linkWinnerAdvancementPath(
  matches: ManagedMatch[],
  roundIds: string[],
  roundCounts: number[],
): void {
  let pendingByeFeeders: string[] = [];

  for (let r = 0; r < roundCounts.length - 1; r++) {
    const fromRoundId = roundIds[r];
    const toRoundId = roundIds[r + 1];
    const fromCount = roundCounts[r];
    const slotsNext = roundCounts[r + 1] * 2;

    const roundWinners = Array.from({ length: fromCount }, (_, i) => `${fromRoundId}-m${i}`);
    const entrants = [...pendingByeFeeders, ...roundWinners];
    pendingByeFeeders = [];

    for (let i = 0; i < entrants.length; i++) {
      if (i < slotsNext) {
        link(
          matches,
          entrants[i],
          `${toRoundId}-m${Math.floor(i / 2)}`,
          i % 2 === 0 ? "teamA" : "teamB",
        );
      } else {
        pendingByeFeeders.push(entrants[i]);
      }
    }
  }
}

const PLAY_IN_ROUND_ID = "pi-r1";

function buildPlayInRound(
  playInTeams: string[],
  playInMatches: number,
): {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
} {
  const matches: ManagedMatch[] = [];
  const matchIds: string[] = [];

  for (let i = 0; i < playInMatches; i++) {
    const id = `${PLAY_IN_ROUND_ID}-m${i}`;
    matchIds.push(id);
    matches.push({
      id,
      roundId: PLAY_IN_ROUND_ID,
      roundLabel: "Opening — Play-in",
      label: `Play-in ${i + 1}`,
      bracketSide: "playoff",
      teamA: playInTeams[i * 2] ?? null,
      teamB: playInTeams[i * 2 + 1] ?? null,
      scoreA: 0,
      scoreB: 0,
      winner: null,
      confirmed: false,
      winnerNext: null,
      loserNext: null,
    });
  }

  return {
    matches,
    roundMetas: [
      {
        id: PLAY_IN_ROUND_ID,
        label: "Opening — Play-in",
        side: "playoff",
        matchIds,
      },
    ],
  };
}

function playInLoserDropTarget(
  playInIndex: number,
  playInLoserMatchId: string,
): { matchId: string; slot: "teamA" | "teamB" } {
  if (playInLoserMatchId.startsWith("lb-r1-")) {
    return {
      matchId: playInLoserMatchId,
      slot: playInIndex % 2 === 0 ? "teamA" : "teamB",
    };
  }
  const poolIdx = Math.floor(playInIndex / 2);
  return {
    matchId: `lb-pi-m${poolIdx}`,
    slot: playInIndex % 2 === 0 ? "teamA" : "teamB",
  };
}

function wirePlayInToMainBracket(
  playInMatches: ManagedMatch[],
  mainMatches: ManagedMatch[],
  directTeamCount: number,
  playInMatchCount: number,
  mainFirstRoundId: string,
  mirrorLoserDrop = false,
  playInLoserMatchId: string | null = null,
): void {
  for (let i = 0; i < playInMatchCount; i++) {
    const slotIndex = directTeamCount + i;
    const mainMatchIdx = Math.floor(slotIndex / 2);
    const mainSlot: "teamA" | "teamB" = slotIndex % 2 === 0 ? "teamA" : "teamB";
    const mainMatchId = `${mainFirstRoundId}-m${mainMatchIdx}`;
    const mainMatch = mainMatches.find((match) => match.id === mainMatchId);
    const playInId = `${PLAY_IN_ROUND_ID}-m${i}`;

    if (mainMatch) {
      mainMatch[mainSlot] = null;
    }

    link(playInMatches, playInId, mainMatchId, mainSlot);

    if (mirrorLoserDrop && playInLoserMatchId) {
      const { matchId, slot } = playInLoserDropTarget(i, playInLoserMatchId);
      link(playInMatches, playInId, matchId, slot, true);
    }
  }
}

function rewireWinnerNext(
  matches: ManagedMatch[],
  fromId: string,
  toId: string,
  slot: "teamA" | "teamB",
): void {
  const from = matches.find((match) => match.id === fromId);
  if (!from) return;
  from.winnerNext = { matchId: toId, slot };
}

function insertRoundMetaBefore(
  roundMetas: BracketRoundMeta[],
  beforeId: string,
  meta: BracketRoundMeta,
): void {
  const idx = roundMetas.findIndex((round) => round.id === beforeId);
  roundMetas.splice(idx >= 0 ? idx : roundMetas.length, 0, meta);
}

/**
 * When opening play-in creates more lower-pool winners than lower-round-1 slots,
 * add reduction rounds (lb-pd*) until the pool count matches lb-r1 capacity.
 */
function reduceLowerPoolWinners(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
  poolMatchIds: string[],
  targetCount: number,
): string[] {
  let currentIds = [...poolMatchIds];
  let stage = 0;

  while (currentIds.length > targetCount) {
    stage++;
    const roundId = `lb-pd${stage}`;
    const roundLabel =
      stage === 1 && currentIds.length === targetCount + 1
        ? "Lower — Play-in Final"
        : `Lower — Play-in Stage ${stage + 1}`;
    const nextIds: string[] = [];
    const reductionMatchIds: string[] = [];
    const pairCount = Math.floor(currentIds.length / 2);

    for (let i = 0; i < pairCount; i++) {
      const id = `${roundId}-m${i}`;
      reductionMatchIds.push(id);
      matches.push({
        id,
        roundId,
        roundLabel,
        label: pairCount > 1 ? `Play-in LB ${i + 1}` : roundLabel,
        bracketSide: "lower",
        teamA: null,
        teamB: null,
        scoreA: 0,
        scoreB: 0,
        winner: null,
        confirmed: false,
        winnerNext: null,
        loserNext: null,
      });
      link(matches, currentIds[i * 2], id, "teamA");
      link(matches, currentIds[i * 2 + 1], id, "teamB");
      nextIds.push(id);
    }

    if (currentIds.length % 2 === 1) {
      nextIds.push(currentIds[currentIds.length - 1]);
    }

    insertRoundMetaBefore(roundMetas, "lb-r1", {
      id: roundId,
      label: roundLabel,
      side: "lower",
      matchIds: reductionMatchIds,
    });

    currentIds = nextIds;
  }

  return currentIds;
}

/**
 * Opening play-in losers enter a dedicated lower pool (lb-pi), optionally reduced
 * through lb-pd* rounds, then face lower-round-1 survivors in crossover (lb-pc)
 * before meeting upper-bracket drop-ins at lower round 2.
 */
function addPlayInLowerPool(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
  playInMatches: number,
): string {
  const poolMatchCount = Math.ceil(playInMatches / 2);
  const piMatchIds: string[] = [];

  const lbR1Meta = roundMetas.find((meta) => meta.id === "lb-r1");
  const lbR2Meta = roundMetas.find((meta) => meta.id === "lb-r2");
  const lbR1Count = lbR1Meta?.matchIds.length ?? 0;
  const lbR2Count = lbR2Meta?.matchIds.length ?? 0;

  for (let i = 0; i < poolMatchCount; i++) {
    const id = `lb-pi-m${i}`;
    piMatchIds.push(id);
    matches.push({
      id,
      roundId: "lb-pi",
      roundLabel: "Lower — Play-in",
      label: poolMatchCount > 1 ? `Play-in LB ${i + 1}` : "Lower — Play-in",
      bracketSide: "lower",
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

  insertRoundMetaBefore(roundMetas, "lb-r1", {
    id: "lb-pi",
    label: "Lower — Play-in",
    side: "lower",
    matchIds: piMatchIds,
  });

  const poolFeederIds =
    lbR1Count > 0
      ? reduceLowerPoolWinners(matches, roundMetas, piMatchIds, lbR1Count)
      : piMatchIds;

  const crossoverCount = Math.min(poolFeederIds.length, lbR1Count, lbR2Count);
  const crossoverIds: string[] = [];

  for (let i = 0; i < crossoverCount; i++) {
    const id = `lb-pc-m${i}`;
    crossoverIds.push(id);
    matches.push({
      id,
      roundId: "lb-pc",
      roundLabel: "Lower — Crossover",
      label: crossoverCount > 1 ? `Crossover ${i + 1}` : "Lower — Crossover",
      bracketSide: "lower",
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

  if (crossoverCount > 0) {
    insertRoundMetaBefore(roundMetas, "lb-r2", {
      id: "lb-pc",
      label: "Lower — Crossover",
      side: "lower",
      matchIds: crossoverIds,
    });
  }

  const lbR1AfterInsert = roundMetas.find((meta) => meta.id === "lb-r1");
  const lbR2AfterInsert = roundMetas.find((meta) => meta.id === "lb-r2");

  for (let i = 0; i < crossoverCount; i++) {
    const poolId = poolFeederIds[i];
    const pcId = crossoverIds[i];

    if (lbR1AfterInsert?.matchIds[i]) {
      rewireWinnerNext(matches, lbR1AfterInsert.matchIds[i], pcId, "teamA");
    }

    link(matches, poolId, pcId, "teamB");

    if (lbR2AfterInsert?.matchIds[i]) {
      link(matches, pcId, lbR2AfterInsert.matchIds[i], "teamA");
    }
  }

  return piMatchIds[0];
}

/** Single elimination for any even team count ≥ 2. */
export function buildSingleElimMatches(teamNames: string[]): {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
} {
  const n = teamNames.length;
  if (!isEvenBracketFieldSize(n)) {
    throw new Error(`buildSingleElimMatches requires an even team count ≥ 2; received ${n}.`);
  }

  if (!isPowerOfTwo(n)) {
    return buildSingleElimWithPlayIn(teamNames);
  }

  const roundCounts = powerOfTwoElimRoundMatchCounts(n);
  const totalRounds = roundCounts.length;
  const matches: ManagedMatch[] = [];
  const roundMetas: BracketRoundMeta[] = [];

  const roundLabels = (ri: number): string => {
    const remaining = totalRounds - ri;
    if (remaining === 1) return "Final";
    if (remaining === 2) return "Semifinals";
    if (remaining === 3) return "Quarterfinals";
    if (remaining === 4) return "Round of 16";
    return `Round ${ri + 1}`;
  };

  for (let ri = 0; ri < totalRounds; ri++) {
    const count = roundCounts[ri];
    const roundId = `se-r${ri}`;
    const roundLabel = roundLabels(ri);
    const matchIds: string[] = [];

    for (let mi = 0; mi < count; mi++) {
      const id = `${roundId}-m${mi}`;
      matchIds.push(id);
      matches.push({
        id,
        roundId,
        roundLabel,
        label: count > 1 ? `Match ${mi + 1}` : roundLabel,
        bracketSide: "main",
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

    roundMetas.push({ id: roundId, label: roundLabel, side: "main", matchIds });
  }

  const seRoundIds = roundCounts.map((_, ri) => `se-r${ri}`);
  linkWinnerAdvancementPath(matches, seRoundIds, roundCounts);

  const r1 = matches.filter((m) => m.roundId === "se-r0");
  for (let i = 0; i < r1.length; i++) {
    r1[i].teamA = teamNames[i * 2] ?? null;
    r1[i].teamB = teamNames[i * 2 + 1] ?? null;
  }

  return { matches: recomputeAdvancements(matches), roundMetas };
}

function buildSingleElimWithPlayIn(teamNames: string[]): {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
} {
  const n = teamNames.length;
  const playInMatches = playInMatchCount(n);
  const playInTeamCount = playInMatches * 2;
  const directTeams = teamNames.slice(0, n - playInTeamCount);
  const playInTeams = teamNames.slice(n - playInTeamCount);

  const playInBuilt = buildPlayInRound(playInTeams, playInMatches);
  const mainPlaceholders = [
    ...directTeams,
    ...Array.from({ length: playInMatches }, (_, i) => `__PI_${i}__`),
  ];
  const mainBuilt = buildSingleElimMatches(mainPlaceholders);

  wirePlayInToMainBracket(
    playInBuilt.matches,
    mainBuilt.matches,
    directTeams.length,
    playInMatches,
    "se-r0",
  );

  return {
    matches: recomputeAdvancements([...playInBuilt.matches, ...mainBuilt.matches]),
    roundMetas: [...playInBuilt.roundMetas, ...mainBuilt.roundMetas],
  };
}

export interface PlayoffRound1Pairing {
  teamA: string | null;
  teamB: string | null;
}

export function playoffBracketSize(qualifiedCount: number): number {
  return Math.pow(2, Math.ceil(Math.log2(Math.max(qualifiedCount, 2))));
}

export function playoffRound1MatchCount(qualifiedCount: number): number {
  return playoffBracketSize(qualifiedCount) / 2;
}

/** Suggested round-1 pairings seeded by qualification order (1v2, 3v4, …). */
export function defaultPlayoffRound1Pairings(qualifiedTeams: string[]): PlayoffRound1Pairing[] {
  const matchCount = playoffRound1MatchCount(qualifiedTeams.length);
  const pairings: PlayoffRound1Pairing[] = [];

  for (let i = 0; i < matchCount; i++) {
    pairings.push({
      teamA: qualifiedTeams[i * 2] ?? null,
      teamB: qualifiedTeams[i * 2 + 1] ?? null,
    });
  }

  return pairings;
}

/** Single-elimination playoff bracket with admin-configured round-1 pairings. */
export interface BuildPlayoffBracketOptions {
  includeThirdPlaceMatch?: boolean;
}

export function buildPlayoffBracket(
  round1Pairings: PlayoffRound1Pairing[],
  options?: BuildPlayoffBracketOptions,
): {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
} {
  const assignedCount = new Set(
    round1Pairings.flatMap((pairing) =>
      [pairing.teamA, pairing.teamB].filter((team): team is string => !!team),
    ),
  ).size;

  if (assignedCount < 2) {
    throw new Error("Playoffs require at least 2 qualified teams.");
  }

  const size = Math.max(round1Pairings.length * 2, playoffBracketSize(assignedCount));
  const totalRounds = Math.log2(size);
  const matches: ManagedMatch[] = [];
  const roundMetas: BracketRoundMeta[] = [];

  const roundLabels = (ri: number): string => {
    const remaining = totalRounds - ri;
    if (remaining === 1) return "Playoffs — Final";
    if (remaining === 2) return "Playoffs — Semifinals";
    if (remaining === 3) return "Playoffs — Quarterfinals";
    return `Playoffs — Round ${ri + 1}`;
  };

  for (let ri = 0; ri < totalRounds; ri++) {
    const count = size / Math.pow(2, ri + 1);
    const roundId = `po-r${ri}`;
    const roundLabel = roundLabels(ri);
    const matchIds: string[] = [];

    for (let mi = 0; mi < count; mi++) {
      const id = `${roundId}-m${mi}`;
      matchIds.push(id);
      matches.push({
        id,
        roundId,
        roundLabel,
        label: count > 1 ? `Match ${mi + 1}` : roundLabel,
        bracketSide: "playoff",
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

    roundMetas.push({ id: roundId, label: roundLabel, side: "playoff", matchIds });
  }

  for (let ri = 0; ri < totalRounds - 1; ri++) {
    const count = size / Math.pow(2, ri + 1);
    for (let mi = 0; mi < count; mi++) {
      const fromId = `po-r${ri}-m${mi}`;
      const toId = `po-r${ri + 1}-m${Math.floor(mi / 2)}`;
      link(matches, fromId, toId, mi % 2 === 0 ? "teamA" : "teamB");
    }
  }

  const pairings = [...round1Pairings];
  while (pairings.length < size / 2) {
    pairings.push({ teamA: null, teamB: null });
  }

  const r1 = matches.filter((match) => match.roundId === "po-r0");
  for (let i = 0; i < r1.length; i++) {
    const teamA = pairings[i]?.teamA ?? null;
    const teamB = pairings[i]?.teamB ?? null;
    r1[i].teamA = teamA;
    r1[i].teamB = teamB;

    if (teamA && !teamB) {
      r1[i].winner = teamA;
      r1[i].scoreA = 1;
      r1[i].scoreB = 0;
      r1[i].confirmed = true;
    } else if (!teamA && teamB) {
      r1[i].winner = teamB;
      r1[i].scoreA = 0;
      r1[i].scoreB = 1;
      r1[i].confirmed = true;
    }
  }

  if (options?.includeThirdPlaceMatch && totalRounds >= 2) {
    const semiRoundIndex = totalRounds - 2;
    const semiRoundId = `po-r${semiRoundIndex}`;
    const semiMatches = matches.filter((match) => match.roundId === semiRoundId);

    if (semiMatches.length === 2) {
      const thirdMatchId = "po-3rd-m0";
      const thirdRoundId = "po-3rd";

      matches.push({
        id: thirdMatchId,
        roundId: thirdRoundId,
        roundLabel: "Playoffs — Third Place",
        label: "3rd Place Match",
        bracketSide: "playoff",
        teamA: null,
        teamB: null,
        scoreA: 0,
        scoreB: 0,
        winner: null,
        confirmed: false,
        winnerNext: null,
        loserNext: null,
      });

      roundMetas.push({
        id: thirdRoundId,
        label: "Playoffs — Third Place",
        side: "playoff",
        matchIds: [thirdMatchId],
      });

      link(matches, semiMatches[0].id, thirdMatchId, "teamA", true);
      link(matches, semiMatches[1].id, thirdMatchId, "teamB", true);
    }
  }

  return { matches: recomputeAdvancements(matches), roundMetas };
}

/** Double elimination for any even team count ≥ 4. */
export function buildDoubleElimMatches(teamNames: string[]): {
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

  if (!isPowerOfTwo(n)) {
    return buildDoubleElimWithPlayIn(teamNames);
  }

  return buildDoubleElimPowerOfTwo(teamNames);
}

function buildDoubleElimWithPlayIn(teamNames: string[]): {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
} {
  const n = teamNames.length;
  const playInMatches = playInMatchCount(n);
  const playInTeamCount = playInMatches * 2;
  const directTeams = teamNames.slice(0, n - playInTeamCount);
  const playInTeams = teamNames.slice(n - playInTeamCount);
  const mainSize = mainBracketSize(n);

  const playInBuilt = buildPlayInRound(playInTeams, playInMatches);
  const mainPlaceholders = [
    ...directTeams,
    ...Array.from({ length: playInMatches }, (_, i) => `__PI_${i}__`),
  ];

  const hasPlayIn = playInMatches > 0;
  const mainBuilt =
    mainSize === 4
      ? buildFourTeamDoubleElim(mainPlaceholders, { hasPlayInLosersPool: hasPlayIn })
      : buildDoubleElimPowerOfTwo(mainPlaceholders);

  let playInLoserMatchId: string | null = null;
  if (hasPlayIn) {
    playInLoserMatchId =
      mainSize === 4
        ? "lb-r1-m0"
        : addPlayInLowerPool(mainBuilt.matches, mainBuilt.roundMetas, playInMatches);
  }

  wirePlayInToMainBracket(
    playInBuilt.matches,
    mainBuilt.matches,
    directTeams.length,
    playInMatches,
    "ub-r1",
    hasPlayIn,
    playInLoserMatchId,
  );

  return {
    matches: recomputeAdvancements([...playInBuilt.matches, ...mainBuilt.matches]),
    roundMetas: [...playInBuilt.roundMetas, ...mainBuilt.roundMetas],
  };
}

function buildDoubleElimPowerOfTwo(teamNames: string[]): {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
} {
  const n = teamNames.length;
  if (!isPowerOfTwo(n) || n < 8) {
    throw new Error(
      `buildDoubleElimPowerOfTwo requires a power-of-2 team count ≥ 8; received ${n}.`,
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

  const ubMatchCounts = powerOfTwoElimRoundMatchCounts(n);
  const ubRounds = ubMatchCounts.length;

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
    const label =
      r === 0
        ? "Upper — Round 1"
        : r === ubRounds - 1
          ? "Upper — Final"
          : r === ubRounds - 2
            ? "Upper — Semifinals"
            : r === ubRounds - 3
              ? "Upper — Quarterfinals"
              : `Upper — Round ${r + 1}`;
    addRound(id, label, "upper", count, r === ubRounds - 1 ? () => "Upper Final" : undefined);
  }

  addRound("gf", "Grand Final", "grand", 1, () => "Grand Final");

  const lbRoundCount = 2 * (ubRounds - 1);
  const lbRoundIds: string[] = [];
  const lbMatchCounts: number[] = [];

  let lbMatches = n / 4;
  for (let r = 0; r < lbRoundCount; r++) {
    const id =
      r === 0
        ? "lb-r1"
        : r === lbRoundCount - 1
          ? "lb-f"
          : r === lbRoundCount - 2
            ? "lb-sf"
            : `lb-r${r + 1}`;
    lbRoundIds.push(id);
    lbMatchCounts.push(lbMatches);
    const isDropRound = r % 2 === 0;
    if (!isDropRound) lbMatches = Math.max(1, lbMatches / 2);
  }

  for (let r = 0; r < lbRoundCount; r++) {
    const id = lbRoundIds[r];
    const count = lbMatchCounts[r];
    const label =
      id === "lb-f"
        ? "Lower — Final"
        : id === "lb-sf"
          ? "Lower — Semifinals"
          : id === "lb-r1"
            ? "Lower — Round 1"
            : `Lower — Round ${r + 1}`;
    addRound(id, label, "lower", count, id === "lb-f" ? () => "Lower Final" : undefined);
  }

  const ubRoundIds = roundMetas.filter((m) => m.side === "upper").map((m) => m.id);
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

  const ubR1Count = ubMatchCounts[0];
  const lbR1Id = lbRoundIds[0];
  for (let i = 0; i < ubR1Count; i++) {
    link(
      matches,
      `ub-r1-m${i}`,
      `${lbR1Id}-m${Math.floor(i / 2)}`,
      i % 2 === 0 ? "teamA" : "teamB",
      true,
    );
  }

  for (let r = 1; r < ubRoundIds.length - 1; r++) {
    const ubId = ubRoundIds[r];
    const lbDropId = lbRoundIds[r * 2 - 1] ?? lbRoundIds[lbRoundCount - 2];
    const ubCount = ubMatchCounts[r];
    for (let i = 0; i < ubCount; i++) {
      link(matches, `${ubId}-m${i}`, `${lbDropId}-m${i}`, "teamB", true);
    }
  }

  for (let r = 0; r < lbRoundCount - 1; r++) {
    const fromId = lbRoundIds[r];
    const toId = lbRoundIds[r + 1];
    const fromCount = lbMatchCounts[r];
    const toCount = lbMatchCounts[r + 1];
    if (fromCount === toCount) {
      for (let i = 0; i < fromCount; i++) {
        link(matches, `${fromId}-m${i}`, `${toId}-m${i}`, "teamA");
      }
    } else {
      for (let i = 0; i < fromCount; i++) {
        link(
          matches,
          `${fromId}-m${i}`,
          `${toId}-m${Math.floor(i / 2)}`,
          i % 2 === 0 ? "teamA" : "teamB",
        );
      }
    }
  }

  link(matches, `${lbRoundIds[lbRoundCount - 1]}-m0`, "gf-m0", "teamB");

  const ubR1 = matches.filter((m) => m.roundId === "ub-r1");
  for (let i = 0; i < ubR1.length; i++) {
    ubR1[i].teamA = teamNames[i * 2] ?? null;
    ubR1[i].teamB = teamNames[i * 2 + 1] ?? null;
  }

  return { matches: recomputeAdvancements(matches), roundMetas };
}

/** Minimal 4-team double elimination (upper R1 → upper F; lower R1 → lower F → GF). */
function buildFourTeamDoubleElim(
  teamNames: string[],
  options?: { hasPlayInLosersPool?: boolean },
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

  matches.find((m) => m.id === "ub-r1-m0")!.teamA = teamNames[0] ?? null;
  matches.find((m) => m.id === "ub-r1-m0")!.teamB = teamNames[1] ?? null;
  matches.find((m) => m.id === "ub-r1-m1")!.teamA = teamNames[2] ?? null;
  matches.find((m) => m.id === "ub-r1-m1")!.teamB = teamNames[3] ?? null;

  return { matches, roundMetas };
}

function placeTeam(
  matches: ManagedMatch[],
  matchId: string,
  slot: "teamA" | "teamB",
  team: string | null,
): ManagedMatch[] {
  return matches.map((m) => {
    if (m.id !== matchId) return m;
    return { ...m, [slot]: team };
  });
}

function buildFedSlots(matches: ManagedMatch[]): Set<string> {
  const fed = new Set<string>();
  for (const m of matches) {
    if (m.winnerNext) fed.add(`${m.winnerNext.matchId}:${m.winnerNext.slot}`);
    if (m.loserNext) fed.add(`${m.loserNext.matchId}:${m.loserNext.slot}`);
  }
  return fed;
}

function resetTeamsForRecompute(match: ManagedMatch, fedSlots: Set<string>): ManagedMatch {
  const slotTeam = (slot: "teamA" | "teamB") =>
    fedSlots.has(`${match.id}:${slot}`) ? null : match[slot];

  return {
    ...match,
    teamA: slotTeam("teamA"),
    teamB: slotTeam("teamB"),
  };
}

function processingOrder(matches: ManagedMatch[]): ManagedMatch[] {
  return [...matches].sort((a, b) => roundFlowRank(a.roundId) - roundFlowRank(b.roundId));
}

function isEliminationMatch(match: ManagedMatch): boolean {
  return match.bracketSide !== "swiss";
}

/** Re-apply elimination advancement without touching Swiss group-stage matches. */
export function recomputeAdvancements(matches: ManagedMatch[]): ManagedMatch[] {
  const elimMatches = matches.filter(isEliminationMatch);
  const swissMatches = matches.filter((match) => match.bracketSide === "swiss");

  const fedSlots = buildFedSlots(elimMatches);
  let nextElim = elimMatches.map((match) => resetTeamsForRecompute(match, fedSlots));

  for (const match of processingOrder(nextElim)) {
    if (match.confirmed && match.winner) {
      nextElim = advanceWinner(nextElim, match.id, match.winner);
    }
  }

  const elimById = new Map(nextElim.map((match) => [match.id, match]));
  return matches.map((match) => {
    if (match.bracketSide === "swiss") return match;
    return elimById.get(match.id) ?? match;
  });
}

export function updateMatchScores(
  matches: ManagedMatch[],
  matchId: string,
  scoreA: number,
  scoreB: number,
  format: BestOfFormat,
): ManagedMatch[] {
  const source = matches.find((x) => x.id === matchId);
  if (!source || !source.teamA || !source.teamB) return matches;

  const required = winsRequired(format);
  let winner: string | null = null;
  if (scoreA >= required) winner = source.teamA;
  else if (scoreB >= required) winner = source.teamB;

  const next = matches.map((x) =>
    x.id === matchId ? { ...x, scoreA, scoreB, winner, confirmed: winner !== null } : x,
  );

  return recomputeAdvancements(next);
}

export function setMatchWinner(
  matches: ManagedMatch[],
  matchId: string,
  winner: string,
  format: BestOfFormat,
): ManagedMatch[] {
  const m = matches.find((x) => x.id === matchId);
  if (!m || !m.teamA || !m.teamB) return matches;
  if (winner !== m.teamA && winner !== m.teamB) return matches;

  const required = winsRequired(format);
  const scoreA = winner === m.teamA ? required : 0;
  const scoreB = winner === m.teamB ? required : 0;
  return updateMatchScores(matches, matchId, scoreA, scoreB, format);
}

/** Clear a decided match so admins can fix misclicks. */
export function clearMatchResult(matches: ManagedMatch[], matchId: string): ManagedMatch[] {
  const next = matches.map((x) =>
    x.id === matchId ? { ...x, scoreA: 0, scoreB: 0, winner: null, confirmed: false } : x,
  );
  return recomputeAdvancements(next);
}

function advanceWinner(matches: ManagedMatch[], matchId: string, winner: string): ManagedMatch[] {
  const m = matches.find((x) => x.id === matchId);
  if (!m) return matches;

  const loser = m.teamA === winner ? m.teamB : m.teamA;
  let next = matches;

  if (m.winnerNext) {
    next = placeTeam(next, m.winnerNext.matchId, m.winnerNext.slot, winner);
  }
  if (m.loserNext && loser) {
    next = placeTeam(next, m.loserNext.matchId, m.loserNext.slot, loser);
  }

  return next;
}

export function getMatchesByRound(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
): Map<string, ManagedMatch[]> {
  const map = new Map<string, ManagedMatch[]>();
  for (const meta of roundMetas) {
    map.set(meta.id, meta.matchIds.map((id) => matches.find((m) => m.id === id)!).filter(Boolean));
  }
  return map;
}
