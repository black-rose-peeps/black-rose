/**
 * Shared bracket build helpers — wiring, seeding placement, labels, play-in.
 */

import { bracketCapacity, directSeedCount } from "./bracket-field";
import { sortBracketRoundsByFlow } from "@/features/tournaments/utils/bracket-round-order";
import {
  bracketRoundOnePairings,
  playInWinnerTargetSeed,
  roundOnePairingsForSeedingMode,
  seedToMainBracketSlot,
  standardSeedOrder,
  teamForRegisteredSeed,
  type SeedPairing,
} from "@/features/tournaments/utils/tournament-seeding";
import {
  type BracketRoundMeta,
  type ManagedMatch,
  type MatchSlotRef,
} from "./managed-bracket-core";

export function link(
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

export function attachThirdPlaceMatchFromSemifinals(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
  config: {
    semiRoundId: string;
    thirdRoundId: string;
    thirdMatchId: string;
    roundLabel: string;
    matchLabel: string;
    bracketSide: ManagedMatch["bracketSide"];
    totalRounds: number;
  },
): void {
  if (config.totalRounds < 2) return;

  const semiMatches = matches.filter((match) => match.roundId === config.semiRoundId);
  if (semiMatches.length !== 2) return;

  matches.push({
    id: config.thirdMatchId,
    roundId: config.thirdRoundId,
    roundLabel: config.roundLabel,
    label: config.matchLabel,
    bracketSide: config.bracketSide,
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
    id: config.thirdRoundId,
    label: config.roundLabel,
    side: config.bracketSide,
    matchIds: [config.thirdMatchId],
  });

  link(matches, semiMatches[0].id, config.thirdMatchId, "teamA", true);
  link(matches, semiMatches[1].id, config.thirdMatchId, "teamB", true);
}

/**
 * Link winners forward through standard Po2 elimination rounds (m0+m1 → next m0, etc.).
 */
export function linkWinnerAdvancementPath(
  matches: ManagedMatch[],
  roundIds: string[],
  roundCounts: number[],
): void {
  for (let r = 0; r < roundCounts.length - 1; r++) {
    const fromRoundId = roundIds[r];
    const toRoundId = roundIds[r + 1];
    const fromCount = roundCounts[r];
    for (let i = 0; i < fromCount; i++) {
      link(
        matches,
        `${fromRoundId}-m${i}`,
        `${toRoundId}-m${Math.floor(i / 2)}`,
        i % 2 === 0 ? "teamA" : "teamB",
      );
    }
  }
}

export const PLAY_IN_ROUND_ID = "pi-r1";

/** Upper-bracket competition rounds only (excludes legacy opening play-in). */
export function competitionUpperRoundIds(roundMetas: BracketRoundMeta[]): string[] {
  return sortBracketRoundsByFlow(
    roundMetas.filter((meta) => meta.side === "upper" && meta.id !== PLAY_IN_ROUND_ID),
  ).map((meta) => meta.id);
}

function slotTeamForSeed(
  seed: number,
  seedOrderedNames: string[],
  teamCount: number,
): string | null {
  const direct = directSeedCount(teamCount);
  if (seed > teamCount || seed > direct) return null;
  return seedOrderedNames[seed - 1] ?? null;
}

export function placeStandardFirstRound(
  roundMatches: ManagedMatch[],
  seedOrderedNames: string[],
  teamCount: number,
  mainFieldSize: number,
): void {
  const order = standardSeedOrder(mainFieldSize);

  for (let i = 0; i < roundMatches.length; i++) {
    const seedA = order[i * 2];
    const seedB = order[i * 2 + 1];
    roundMatches[i].teamA = slotTeamForSeed(seedA, seedOrderedNames, teamCount);
    roundMatches[i].teamB = slotTeamForSeed(seedB, seedOrderedNames, teamCount);
  }
}

export function roundOnePairingsForBuild(teamCount: number): SeedPairing[] {
  return roundOnePairingsForSeedingMode(teamCount);
}

function autoConfirmByeMatch(match: ManagedMatch): void {
  if (match.teamA && !match.teamB) {
    match.winner = match.teamA;
    match.scoreA = 1;
    match.scoreB = 0;
    match.confirmed = true;
  } else if (!match.teamA && match.teamB) {
    match.winner = match.teamB;
    match.scoreA = 0;
    match.scoreB = 1;
    match.confirmed = true;
  }
}

export function placeBracketRoundOne(
  roundMatches: ManagedMatch[],
  seedOrderedNames: string[],
  registeredCount: number,
): void {
  const capacity = bracketCapacity(registeredCount);
  const pairings = bracketRoundOnePairings(capacity);

  for (let i = 0; i < roundMatches.length; i++) {
    const pairing = pairings[i];
    if (!pairing) continue;
    roundMatches[i].teamA = teamForRegisteredSeed(pairing.seedA, registeredCount, seedOrderedNames);
    roundMatches[i].teamB = teamForRegisteredSeed(pairing.seedB, registeredCount, seedOrderedNames);
    autoConfirmByeMatch(roundMatches[i]);
  }
}

export function placeRoundOneTeams(
  roundMatches: ManagedMatch[],
  seedOrderedNames: string[],
  pairings: SeedPairing[],
): void {
  for (let i = 0; i < roundMatches.length; i++) {
    const pairing = pairings[i];
    if (!pairing) continue;
    roundMatches[i].teamA = seedOrderedNames[pairing.seedA - 1] ?? null;
    roundMatches[i].teamB = seedOrderedNames[pairing.seedB - 1] ?? null;
  }
}

export function placeUpperOrMainFirstRound(
  roundMatches: ManagedMatch[],
  seedOrderedNames: string[],
  teamCount: number,
  _mainFieldSize: number,
): void {
  placeBracketRoundOne(roundMatches, seedOrderedNames, teamCount);
}

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

/** Label multi-match rounds Match 1…N within each column (visual / advancement order). */
function matchIdSlotIndex(matchId: string): number {
  const parsed = Number.parseInt(matchId.match(/-m(\d+)$/)?.[1] ?? "0", 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function orderedMatchIdsForLabeling(matches: ManagedMatch[], matchIds: string[]): string[] {
  const roundMatches = matchIds
    .map((id) => matches.find((entry) => entry.id === id))
    .filter((entry): entry is ManagedMatch => !!entry);

  if (roundMatches.length <= 1) return matchIds;

  const withWinnerNext = roundMatches.filter((match) => match.winnerNext?.matchId);
  const targetIds = withWinnerNext.map((match) => match.winnerNext!.matchId);
  const bijective =
    withWinnerNext.length === roundMatches.length &&
    new Set(targetIds).size === roundMatches.length;

  if (bijective) {
    return [...roundMatches]
      .sort(
        (a, b) => matchIdSlotIndex(a.winnerNext!.matchId) - matchIdSlotIndex(b.winnerNext!.matchId),
      )
      .map((match) => match.id);
  }

  return [...matchIds].sort((a, b) => matchIdSlotIndex(a) - matchIdSlotIndex(b));
}

const OPENING_ELIM_ROUND_IDS = new Set(["ub-r1", "se-r0"]);

/** Opening-round losers (play-in or bye-field UB R1) → LB R1 teamB, Challonge inverted index. */
export function wireOpeningPlayableLosersToLowerRoundOne(
  matches: ManagedMatch[],
  ubR1Meta: BracketRoundMeta,
  registeredCount: number,
): void {
  const capacity = bracketCapacity(registeredCount);
  const pairings = bracketRoundOnePairings(capacity);
  const playableIndices: number[] = [];

  for (let i = 0; i < pairings.length; i++) {
    const pairing = pairings[i];
    if (pairing.seedA <= registeredCount && pairing.seedB <= registeredCount) {
      playableIndices.push(i);
    }
  }

  for (let p = 0; p < playableIndices.length; p++) {
    const ubIndex = playableIndices[p];
    const lbIndex = playableIndices.length - 1 - p;
    link(matches, `${ubR1Meta.id}-m${ubIndex}`, `lb-r1-m${lbIndex}`, "teamB", true);
  }
}

/** Playable + bye-advance labels on capacity-compressed opening rounds (Match 1…N, Seed N · protected). */
export function applyOpeningRoundMatchLabels(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
  registeredCount: number,
): void {
  const capacity = bracketCapacity(registeredCount);
  const pairings = bracketRoundOnePairings(capacity);

  for (const round of roundMetas) {
    if (!OPENING_ELIM_ROUND_IDS.has(round.id)) continue;

    let playableIndex = 0;
    for (let i = 0; i < round.matchIds.length; i++) {
      const match = matches.find((entry) => entry.id === round.matchIds[i]);
      const pairing = pairings[i];
      if (!match || !pairing) continue;

      const teamA = match.teamA?.trim() || null;
      const teamB = match.teamB?.trim() || null;

      if (teamA && teamB) {
        playableIndex += 1;
        match.label = `Match ${playableIndex}`;
      } else if (teamA || teamB) {
        const seed = teamA ? pairing.seedA : pairing.seedB;
        if (seed <= registeredCount) {
          match.label = `Seed ${seed} · protected`;
        }
      }
    }
  }
}

export function applySequentialMatchLabels(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
): void {
  for (const round of sortBracketRoundsByFlow(roundMetas)) {
    if (OPENING_ELIM_ROUND_IDS.has(round.id)) continue;

    const matchCount = round.matchIds.length;
    const orderedIds = orderedMatchIdsForLabeling(matches, round.matchIds);

    orderedIds.forEach((matchId, index) => {
      const match = matches.find((entry) => entry.id === matchId);
      if (!match) return;
      if (matchCount === 1 && !/^match\s+\d+$/i.test(match.label)) return;
      match.label = `Match ${index + 1}`;
    });
  }
}

/** Challonge-style inverted index: play-in loser i → LB R1 slot (M - 1 - i). */
export function wirePlayInLosersToLowerRoundOne(
  matches: ManagedMatch[],
  playInMatchCount: number,
): void {
  for (let lbIndex = 0; lbIndex < playInMatchCount; lbIndex++) {
    const playInIndex = playInMatchCount - 1 - lbIndex;
    link(matches, `${PLAY_IN_ROUND_ID}-m${playInIndex}`, `lb-r1-m${lbIndex}`, "teamB", true);
  }
}

export function buildPlayInRound(
  playInTeams: string[],
  playInMatches: number,
  teamCount: number,
  options?: { singleElim?: boolean },
): {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
} {
  const singleElim = options?.singleElim ?? false;
  const roundLabel = singleElim ? "Opening Play-in" : "Opening — Play-in";
  const roundSide: BracketRoundMeta["side"] = singleElim ? "playoff" : "upper";
  const matchSide: ManagedMatch["bracketSide"] = singleElim ? "playoff" : "upper";

  const matches: ManagedMatch[] = [];
  const matchIds: string[] = [];

  for (let i = 0; i < playInMatches; i++) {
    const id = `${PLAY_IN_ROUND_ID}-m${i}`;
    matchIds.push(id);
    matches.push({
      id,
      roundId: PLAY_IN_ROUND_ID,
      roundLabel,
      label: `Play-in ${i + 1}`,
      bracketSide: matchSide,
      teamA: playInTeams[i] ?? null,
      teamB: playInTeams[playInTeams.length - 1 - i] ?? null,
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
        label: roundLabel,
        side: roundSide,
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

export function wirePlayInToMainBracket(
  playInMatches: ManagedMatch[],
  mainMatches: ManagedMatch[],
  teamCount: number,
  playInMatchCount: number,
  mainFirstRoundId: string,
  mainFieldSize: number,
): void {
  for (let i = 0; i < playInMatchCount; i++) {
    const targetSeed = playInWinnerTargetSeed(teamCount, i);
    const { matchIndex, slot } = seedToMainBracketSlot(targetSeed, mainFieldSize);
    const mainMatchId = `${mainFirstRoundId}-m${matchIndex}`;
    const mainMatch = mainMatches.find((match) => match.id === mainMatchId);
    const playInId = `${PLAY_IN_ROUND_ID}-m${i}`;

    if (mainMatch) {
      mainMatch[slot] = null;
    }

    link(playInMatches, playInId, mainMatchId, slot);
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
    lbR1Count > 0 ? reduceLowerPoolWinners(matches, roundMetas, piMatchIds, lbR1Count) : piMatchIds;

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

export function assertUniqueFeederSlots(matches: ManagedMatch[]): void {
  const slots = new Map<string, string>();
  for (const match of matches) {
    for (const ref of [match.winnerNext, match.loserNext]) {
      if (!ref) continue;
      const key = `${ref.matchId}:${ref.slot}`;
      const existing = slots.get(key);
      if (existing && existing !== match.id) {
        throw new Error(`Bracket wiring conflict: ${existing} and ${match.id} both feed ${key}.`);
      }
      slots.set(key, match.id);
    }
  }
}
