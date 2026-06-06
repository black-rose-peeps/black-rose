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

/** Double elimination for any power-of-2 team count ≥ 2. */
export function buildDoubleElimMatches(teamNames: string[]): {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
} {
  const n = teamNames.length;
  if (n < 2 || (n & (n - 1)) !== 0) {
    throw new Error(`buildDoubleElimMatches requires a power-of-2 team count ≥ 2; received ${n}.`);
  }

  if (n === 2) {
    throw new Error(
      "Double elimination requires at least 4 teams. Use single elimination for 2-team events.",
    );
  }

  if (n === 4) {
    return buildFourTeamDoubleElim(teamNames);
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

  // Number of upper-bracket rounds = log2(n)
  const ubRounds = Math.log2(n); // e.g. n=8 → 3, n=16 → 4

  // Build upper bracket rounds
  let ubMatchCounts: number[] = [];
  for (let r = 0; r < ubRounds; r++) {
    ubMatchCounts.push(n / Math.pow(2, r + 1));
  }

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
    const side: ManagedMatch["bracketSide"] = "upper";
    addRound(id, label, side, count, r === ubRounds - 1 ? () => "Upper Final" : undefined);
  }

  // Grand Final
  addRound("gf", "Grand Final", "grand", 1, () => "Grand Final");

  // Lower bracket: number of LB rounds = 2*(ubRounds-1)
  const lbRoundCount = 2 * (ubRounds - 1);
  const lbRoundIds: string[] = [];
  const lbMatchCounts: number[] = [];

  // LB match counts per round — standard DE pattern:
  // LR1: n/4, then alternates between same count and half
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
    const isDropRound = r % 2 === 0; // odd UB drops go into even-indexed LB rounds
    if (!isDropRound) lbMatches = Math.max(1, Math.floor(lbMatches / 2));
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

  // ── Upper bracket internal linking ────────────────────────────────────
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

  // UF → Grand Final (winner)
  link(matches, "ub-f-m0", "gf-m0", "teamA");
  // UF loser → Lower Final (teamB — lb-sf winner feeds teamA)
  link(matches, "ub-f-m0", `${lbRoundIds[lbRoundCount - 1]}-m0`, "teamB", true);

  // ── UB → LB loser drops ───────────────────────────────────────────────
  // UB R1 losers → LB R1
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

  // Remaining UB rounds (except final) drop losers into odd-indexed LB rounds
  for (let r = 1; r < ubRoundIds.length - 1; r++) {
    const ubId = ubRoundIds[r];
    const lbDropId = lbRoundIds[r * 2 - 1] ?? lbRoundIds[lbRoundCount - 2];
    const ubCount = ubMatchCounts[r];
    for (let i = 0; i < ubCount; i++) {
      link(matches, `${ubId}-m${i}`, `${lbDropId}-m${i}`, "teamB", true);
    }
  }

  // ── LB internal linking ───────────────────────────────────────────────
  for (let r = 0; r < lbRoundCount - 1; r++) {
    const fromId = lbRoundIds[r];
    const toId = lbRoundIds[r + 1];
    const fromCount = lbMatchCounts[r];
    const toCount = lbMatchCounts[r + 1];
    if (fromCount === toCount) {
      // Same match count — winner goes as teamA
      for (let i = 0; i < fromCount; i++) {
        link(matches, `${fromId}-m${i}`, `${toId}-m${i}`, "teamA");
      }
    } else {
      // Halving round
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

  // LBF winner → Grand Final
  link(matches, `${lbRoundIds[lbRoundCount - 1]}-m0`, "gf-m0", "teamB");

  // Seed first round
  const ubR1 = matches.filter((m) => m.roundId === "ub-r1");
  for (let i = 0; i < ubR1.length; i++) {
    ubR1[i].teamA = teamNames[i * 2] ?? null;
    ubR1[i].teamB = teamNames[i * 2 + 1] ?? null;
  }

  return { matches, roundMetas };
}

/** Minimal 4-team double elimination (upper R1 → upper F; lower R1 → lower F → GF). */
function buildFourTeamDoubleElim(teamNames: string[]): {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
} {
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
  addRound("lb-r1", "Lower — Round 1", "lower", 1);
  addRound("lb-f", "Lower — Final", "lower", 1, () => "Lower Final");
  addRound("gf", "Grand Final", "grand", 1, () => "Grand Final");

  link(matches, "ub-r1-m0", "ub-f-m0", "teamA");
  link(matches, "ub-r1-m1", "ub-f-m0", "teamB");
  link(matches, "ub-r1-m0", "lb-r1-m0", "teamA", true);
  link(matches, "ub-r1-m1", "lb-r1-m0", "teamB", true);
  link(matches, "ub-f-m0", "gf-m0", "teamA");
  link(matches, "ub-f-m0", "lb-f-m0", "teamB", true);
  link(matches, "lb-r1-m0", "lb-f-m0", "teamA");
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

function isFirstRoundMatch(m: ManagedMatch): boolean {
  return m.roundId === "se-r0" || m.roundId === "ub-r1";
}

/** Deterministic feeder order for any bracket graph produced by build*Matches. */
function roundProcessRank(roundId: string): number {
  if (roundId === "gf") return 1_000_000;

  const seMatch = roundId.match(/^se-r(\d+)$/);
  if (seMatch) return parseInt(seMatch[1], 10) * 10;

  const ubSpecial: Record<string, number> = {
    "ub-r1": 100,
    "ub-qf": 300,
    "ub-sf": 500,
    "ub-f": 700,
  };
  if (roundId in ubSpecial) return ubSpecial[roundId];

  const ubMatch = roundId.match(/^ub-r(\d+)$/);
  if (ubMatch) return 100 + (parseInt(ubMatch[1], 10) - 1) * 100;

  const lbSpecial: Record<string, number> = {
    "lb-r1": 200,
    "lb-sf": 600,
    "lb-f": 800,
  };
  if (roundId in lbSpecial) return lbSpecial[roundId];

  const lbMatch = roundId.match(/^lb-r(\d+)$/);
  if (lbMatch) return 200 + (parseInt(lbMatch[1], 10) - 1) * 100;

  return 99_999;
}

function processingOrder(matches: ManagedMatch[]): ManagedMatch[] {
  return [...matches].sort(
    (a, b) => roundProcessRank(a.roundId) - roundProcessRank(b.roundId),
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
