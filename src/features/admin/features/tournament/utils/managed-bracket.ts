/**
 * Managed bracket state — seeding, match results, BO formats, and advancement.
 */

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
  bracketSide: "main" | "upper" | "lower" | "grand";
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

/** Single elimination (power-of-2 team count). */
export function buildSingleElimMatches(teamNames: string[]): {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
} {
  const n = teamNames.length;
  const size = Math.pow(2, Math.ceil(Math.log2(Math.max(n, 2))));
  const totalRounds = Math.log2(size);
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
    const count = size / Math.pow(2, ri + 1);
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

  for (let ri = 0; ri < totalRounds - 1; ri++) {
    const count = size / Math.pow(2, ri + 1);
    for (let mi = 0; mi < count; mi++) {
      const fromId = `se-r${ri}-m${mi}`;
      const toId = `se-r${ri + 1}-m${Math.floor(mi / 2)}`;
      link(matches, fromId, toId, mi % 2 === 0 ? "teamA" : "teamB");
    }
  }

  const r1 = matches.filter((m) => m.roundId === "se-r0");
  for (let i = 0; i < r1.length; i++) {
    r1[i].teamA = teamNames[i * 2] ?? null;
    r1[i].teamB = teamNames[i * 2 + 1] ?? null;
  }

  return { matches, roundMetas };
}

/** Double elimination for 8 teams (standard layout). */
export function buildDoubleElimMatches(teamNames: string[]): {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
} {
  if (teamNames.length !== 8) {
    throw new Error(
      `buildDoubleElimMatches only supports exactly 8 teams; received ${teamNames.length}.`,
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
  ): string[] => {
    const matchIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const mid = `${id}-m${i}`;
      matchIds.push(mid);
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
    roundMetas.push({ id, label, side, matchIds });
    return matchIds;
  };

  addRound("ub-r1", "Upper — Round 1", "upper", 4);
  addRound("ub-sf", "Upper — Semifinals", "upper", 2);
  addRound("ub-f", "Upper — Final", "upper", 1, () => "Upper Final");
  addRound("gf", "Grand Final", "grand", 1, () => "Grand Final");
  addRound("lb-r1", "Lower — Round 1", "lower", 2);
  addRound("lb-r2", "Lower — Round 2", "lower", 2);
  addRound("lb-sf", "Lower — Semifinals", "lower", 1);
  addRound("lb-f", "Lower — Final", "lower", 1, () => "Lower Final");

  // Upper R1 → Upper SF
  link(matches, "ub-r1-m0", "ub-sf-m0", "teamA");
  link(matches, "ub-r1-m1", "ub-sf-m0", "teamB");
  link(matches, "ub-r1-m2", "ub-sf-m1", "teamA");
  link(matches, "ub-r1-m3", "ub-sf-m1", "teamB");

  // Upper SF → Upper Final
  link(matches, "ub-sf-m0", "ub-f-m0", "teamA");
  link(matches, "ub-sf-m1", "ub-f-m0", "teamB");

  // Upper Final → Grand Final (winner)
  link(matches, "ub-f-m0", "gf-m0", "teamA");

  // Upper R1 losers → Lower R1
  link(matches, "ub-r1-m0", "lb-r1-m0", "teamA", true);
  link(matches, "ub-r1-m1", "lb-r1-m0", "teamB", true);
  link(matches, "ub-r1-m2", "lb-r1-m1", "teamA", true);
  link(matches, "ub-r1-m3", "lb-r1-m1", "teamB", true);

  // Lower R1 winners + Upper SF losers → Lower Round 2
  link(matches, "lb-r1-m0", "lb-r2-m0", "teamA");
  link(matches, "ub-sf-m1", "lb-r2-m0", "teamB", true);
  link(matches, "lb-r1-m1", "lb-r2-m1", "teamA");
  link(matches, "ub-sf-m0", "lb-r2-m1", "teamB", true);

  // Lower Round 2 winners → single Lower Semifinals match
  link(matches, "lb-r2-m0", "lb-sf-m0", "teamA");
  link(matches, "lb-r2-m1", "lb-sf-m0", "teamB");

  // Lower Semifinals winner + Upper Final loser → Lower Final
  link(matches, "lb-sf-m0", "lb-f-m0", "teamA");
  link(matches, "ub-f-m0", "lb-f-m0", "teamB", true);

  // Lower Final winner → Grand Final
  link(matches, "lb-f-m0", "gf-m0", "teamB");

  const ubR1 = matches.filter((m) => m.roundId === "ub-r1");
  for (let i = 0; i < ubR1.length; i++) {
    ubR1[i].teamA = teamNames[i * 2] ?? null;
    ubR1[i].teamB = teamNames[i * 2 + 1] ?? null;
  }

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

function isFirstRoundMatch(m: ManagedMatch): boolean {
  return m.roundId === "se-r0" || m.roundId === "ub-r1";
}

const ROUND_PROCESS_ORDER: Record<string, number> = {
  "se-r0": 0,
  "se-r1": 1,
  "se-r2": 2,
  "se-r3": 3,
  "se-r4": 4,
  "ub-r1": 0,
  "lb-r1": 1,
  "ub-sf": 2,
  "lb-r2": 3,
  "lb-sf": 4,
  "ub-f": 5,
  "lb-f": 6,
  gf: 7,
};

function processingOrder(matches: ManagedMatch[]): ManagedMatch[] {
  return [...matches].sort(
    (a, b) => (ROUND_PROCESS_ORDER[a.roundId] ?? 99) - (ROUND_PROCESS_ORDER[b.roundId] ?? 99),
  );
}

/** Re-apply all confirmed winners/losers without wiping sibling feeder slots. */
export function recomputeAdvancements(matches: ManagedMatch[]): ManagedMatch[] {
  let next = matches.map((m) => {
    if (isFirstRoundMatch(m)) return { ...m };
    return { ...m, teamA: null, teamB: null };
  });

  for (const m of processingOrder(next)) {
    if (m.confirmed && m.winner) {
      next = advanceWinner(next, m.id, m.winner);
    }
  }

  return next;
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
  if (source.confirmed && source.winner) return matches;

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
  if (m.confirmed && m.winner) return matches;
  if (winner !== m.teamA && winner !== m.teamB) return matches;

  const required = winsRequired(format);
  const scoreA = winner === m.teamA ? required : 0;
  const scoreB = winner === m.teamB ? required : 0;
  return updateMatchScores(matches, matchId, scoreA, scoreB, format);
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
