/**
 * Single-elimination bracket build (main bracket + playoffs).
 */

import {
  firstRoundSeedPairings,
  teamForRegisteredSeed,
} from "@/features/tournaments/utils/tournament-seeding";
import {
  bracketCapacity,
  eliminationRoundLabel,
  isEvenBracketFieldSize,
  mainBracketSize,
  playInMatchCount,
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
  attachThirdPlaceMatchFromSemifinals,
  buildPlayInRound,
  link,
  linkWinnerAdvancementPath,
  placeBracketRoundOne,
  placeUpperOrMainFirstRound,
  wirePlayInToMainBracket,
} from "./managed-bracket-build-helpers";

/** True when the main bracket has semifinals (≥4 teams in the main field). */
export function canIncludeSingleElimThirdPlace(teamCount: number): boolean {
  if (teamCount < 4) return false;
  return bracketCapacity(teamCount) >= 4;
}

export function buildSingleElimMatches(
  teamNames: string[],
  options?: BuildBracketOptions,
): {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
} {
  const n = teamNames.length;
  if (!isEvenBracketFieldSize(n)) {
    throw new Error(`buildSingleElimMatches requires an even team count ≥ 2; received ${n}.`);
  }

  const capacity = bracketCapacity(n);
  const roundCounts = powerOfTwoElimRoundMatchCounts(capacity);
  const totalRounds = roundCounts.length;
  const matches: ManagedMatch[] = [];
  const roundMetas: BracketRoundMeta[] = [];

  for (let ri = 0; ri < totalRounds; ri++) {
    const count = roundCounts[ri];
    const roundId = `se-r${ri}`;
    const roundLabel = eliminationRoundLabel(count * 2);
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
  placeBracketRoundOne(r1, teamNames, n);
  applyOpeningRoundMatchLabels(matches, roundMetas, n);
  applySequentialMatchLabels(matches, roundMetas);

  if (options?.includeThirdPlaceMatch) {
    attachThirdPlaceMatchFromSemifinals(matches, roundMetas, {
      semiRoundId: `se-r${totalRounds - 2}`,
      thirdRoundId: "se-3rd",
      thirdMatchId: "se-3rd-m0",
      roundLabel: "Third Place",
      matchLabel: "3rd Place Match",
      bracketSide: "main",
      totalRounds,
    });
  }

  return { matches: recomputeAdvancements(matches), roundMetas };
}

function buildSingleElimWithPlayIn(
  teamNames: string[],
  options?: BuildBracketOptions,
): {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
} {
  const n = teamNames.length;
  const playInMatches = playInMatchCount(n);
  const playInTeamCount = playInMatches * 2;
  const playInTeams = teamNames.slice(n - playInTeamCount);
  const mainSize = mainBracketSize(n);

  const playInBuilt = buildPlayInRound(playInTeams, playInMatches, n, { singleElim: true });
  const mainBuilt = buildSingleElimMatches(Array.from({ length: mainSize }, () => ""), options);

  const r1 = mainBuilt.matches.filter((m) => m.roundId === "se-r0");
  placeUpperOrMainFirstRound(r1, teamNames, n, mainSize);

  wirePlayInToMainBracket(
    playInBuilt.matches,
    mainBuilt.matches,
    n,
    playInMatches,
    "se-r0",
    mainSize,
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

/** Trim or pad pairings to the bracket's round-one match count. */
export function normalizePlayoffRound1Pairings(
  qualifiedTeams: string[],
  pairings: PlayoffRound1Pairing[],
): PlayoffRound1Pairing[] {
  const matchCount = playoffRound1MatchCount(qualifiedTeams.length);
  const normalized = pairings.slice(0, matchCount).map((pairing) => ({
    teamA: pairing.teamA ?? null,
    teamB: pairing.teamB ?? null,
  }));

  while (normalized.length < matchCount) {
    normalized.push({ teamA: null, teamB: null });
  }

  return normalized;
}

/** Suggested round-1 pairings: #1 vs lowest seed, standard bracket order, byes on empty slots. */
export function defaultPlayoffRound1Pairings(qualifiedTeams: string[]): PlayoffRound1Pairing[] {
  const size = playoffBracketSize(qualifiedTeams.length);
  const registeredCount = qualifiedTeams.length;

  return firstRoundSeedPairings(size).map(({ seedA, seedB }) => ({
    teamA: teamForRegisteredSeed(seedA, registeredCount, qualifiedTeams),
    teamB: teamForRegisteredSeed(seedB, registeredCount, qualifiedTeams),
  }));
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

  if (options?.includeThirdPlaceMatch) {
    attachThirdPlaceMatchFromSemifinals(matches, roundMetas, {
      semiRoundId: `po-r${totalRounds - 2}`,
      thirdRoundId: "po-3rd",
      thirdMatchId: "po-3rd-m0",
      roundLabel: "Playoffs — Third Place",
      matchLabel: "3rd Place Match",
      bracketSide: "playoff",
      totalRounds,
    });
  }

  return { matches: recomputeAdvancements(matches), roundMetas };
}