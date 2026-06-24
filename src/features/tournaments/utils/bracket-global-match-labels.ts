import { sortBracketRoundsByFlow } from "@/features/tournaments/utils/bracket-round-order";
import type {
  BracketRoundMeta,
  ManagedMatch,
} from "@/features/admin/features/tournament-details/utils/managed-bracket";
import { orderedMatchIdsForLabeling } from "@/features/admin/features/tournament-details/utils/managed-bracket-build-helpers";

const OPENING_ELIM_ROUND_IDS = new Set(["pi-r1", "ub-r1", "lb-r1", "se-r0"]);

function isProtectedSeedLabel(label: string): boolean {
  return /^Seed \d+ · protected$/i.test(label);
}

function shouldGloballyNumberMatch(
  match: ManagedMatch,
  roundId: string,
  roundMatchCount: number,
): boolean {
  if (isProtectedSeedLabel(match.label)) return false;
  if (
    roundMatchCount === 1 &&
    match.label.trim() &&
    !/^Match \d+$/i.test(match.label.trim())
  ) {
    return false;
  }
  if (OPENING_ELIM_ROUND_IDS.has(roundId) && roundId === "ub-r1") {
    return Boolean(match.teamA?.trim() && match.teamB?.trim());
  }
  return true;
}

/**
 * Challonge-style double-elim play order: UB R1 → UB R2 → LB R1 → LB R2, then
 * UB/LB waves through the bracket, ending with upper final, lower final, and grand final.
 */
export function buildDoubleElimPlayOrderRoundIds(roundMetas: BracketRoundMeta[]): string[] {
  const upper = sortBracketRoundsByFlow(roundMetas.filter((round) => round.side === "upper")).map(
    (round) => round.id,
  );
  const lower = sortBracketRoundsByFlow(roundMetas.filter((round) => round.side === "lower")).map(
    (round) => round.id,
  );
  const grand = sortBracketRoundsByFlow(roundMetas.filter((round) => round.side === "grand")).map(
    (round) => round.id,
  );

  if (upper.length === 0) return [];

  const order: string[] = [];
  const append = (id: string | undefined) => {
    if (id && !order.includes(id)) order.push(id);
  };

  if (upper.length <= 2) {
    for (const id of upper) append(id);
    for (const id of lower) append(id);
    for (const id of grand) append(id);
    return order;
  }

  if (upper.length === 3) {
    append(upper[0]);
    append(upper[1]);
    append(lower[0]);
    append(lower[1]);
    append(upper[2]);
    append(lower[2]);
    append(lower[3]);
    for (const id of grand) append(id);
    return order;
  }

  append(upper[0]);
  append(upper[1]);
  append(lower[0]);
  append(lower[1]);

  for (let i = 2; i < upper.length - 2; i++) {
    append(upper[i]);
    append(lower[2 * i - 2]);
    append(lower[2 * i - 1]);
  }

  const semifinalUpperIndex = upper.length - 2;
  append(upper[semifinalUpperIndex]);
  append(lower[2 * semifinalUpperIndex - 2]);
  append(lower[2 * semifinalUpperIndex - 1]);
  append(upper[upper.length - 1]);

  for (const lbId of lower) {
    append(lbId);
  }
  for (const id of grand) {
    append(id);
  }

  return order;
}

/** Assign global Match 1…N labels in Challonge play order (double elimination). */
export function applyGlobalDoubleElimMatchLabels(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
): void {
  const roundById = new Map(roundMetas.map((round) => [round.id, round]));
  const playOrder = buildDoubleElimPlayOrderRoundIds(roundMetas);
  let globalNumber = 1;

  for (const roundId of playOrder) {
    const round = roundById.get(roundId);
    if (!round) continue;

    const orderedIds = orderedMatchIdsForLabeling(matches, round.matchIds);
    for (const matchId of orderedIds) {
      const match = matches.find((entry) => entry.id === matchId);
      if (!match || !shouldGloballyNumberMatch(match, roundId, round.matchIds.length)) continue;
      match.label = `Match ${globalNumber}`;
      globalNumber += 1;
    }
  }
}

/** Assign global Match 1…N labels for single elimination (round flow order). */
export function applyGlobalSingleElimMatchLabels(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
): void {
  let globalNumber = 1;

  for (const round of sortBracketRoundsByFlow(roundMetas)) {
    if (round.side === "grand") continue;

    const orderedIds = orderedMatchIdsForLabeling(matches, round.matchIds);
    for (const matchId of orderedIds) {
      const match = matches.find((entry) => entry.id === matchId);
      if (!match || !shouldGloballyNumberMatch(match, round.id, round.matchIds.length)) continue;
      match.label = `Match ${globalNumber}`;
      globalNumber += 1;
    }
  }

  for (const round of sortBracketRoundsByFlow(roundMetas.filter((entry) => entry.side === "grand"))) {
    for (const matchId of round.matchIds) {
      const match = matches.find((entry) => entry.id === matchId);
      if (!match || !shouldGloballyNumberMatch(match, round.id, round.matchIds.length)) continue;
      match.label = `Match ${globalNumber}`;
      globalNumber += 1;
    }
  }
}

export function applyGlobalMatchLabels(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
  format: "single" | "double",
): void {
  if (format === "double") {
    applyGlobalDoubleElimMatchLabels(matches, roundMetas);
    return;
  }
  applyGlobalSingleElimMatchLabels(matches, roundMetas);
}

/** Count matches that receive a global number (for validation). */
export function countGloballyNumberedMatches(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
  format: "single" | "double",
): number {
  const snapshot = matches.map((match) => ({ ...match }));
  applyGlobalMatchLabels(snapshot, roundMetas, format);
  return snapshot.filter((match) => /^Match \d+$/i.test(match.label)).length;
}
