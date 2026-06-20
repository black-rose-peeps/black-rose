import type { LayoutInputMatch } from "./bracket-connectors";

/** Opening elimination rounds that may contain structural bye vs bye slots. */
export function isOpeningElimRoundId(roundId: string | undefined): boolean {
  return roundId === "se-r0" || roundId === "ub-r1";
}

/** Match slot data used to decide layout visibility (bye compression). */
export interface LayoutSlotState {
  teamA?: string | null;
  teamB?: string | null;
  confirmed?: boolean;
  winner?: string | null;
  roundIndex?: number;
  roundId?: string;
}

/**
 * True when a match should not be drawn.
 * - Bye vs bye in the opening round (both slots permanently empty)
 * - Auto-advanced team vs bye (winner set, only one competitor)
 * Future rounds with both slots TBD remain visible.
 */
export function isLayoutHiddenMatch(match: LayoutSlotState): boolean {
  const teamA = match.teamA?.trim() || null;
  const teamB = match.teamB?.trim() || null;
  const hasWinner = Boolean(match.winner?.trim());

  if (hasWinner && ((!teamA && teamB) || (teamA && !teamB))) {
    return true;
  }

  if (match.confirmed && hasWinner && (!teamA || !teamB)) {
    return true;
  }

  if (!teamA && !teamB) {
    return Boolean(match.roundId && isOpeningElimRoundId(match.roundId));
  }

  return false;
}

export function buildLayoutHiddenSet(
  matches: Array<LayoutInputMatch & LayoutSlotState>,
): Set<string> {
  const hidden = new Set<string>();
  for (const match of matches) {
    if (isLayoutHiddenMatch(match)) {
      hidden.add(match.id);
    }
  }
  return hidden;
}

/** Walk winner links through hidden nodes to the next visible match. */
export function resolveVisibleSuccessor(
  startId: string | null | undefined,
  matchById: Map<string, LayoutInputMatch>,
  hidden: Set<string>,
): string | null {
  let current = startId ?? null;
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current)) return null;
    visited.add(current);
    if (!hidden.has(current)) return current;
    const next = matchById.get(current)?.nextWinnerMatchId ?? null;
    current = next;
  }

  return null;
}

/** Structural parent ids for standard Po2 halving (slot index in previous round). */
export function structuralParentIds(
  match: LayoutInputMatch,
  prevRoundMatches: LayoutInputMatch[],
): [string | null, string | null] {
  const idx = prevRoundMatches.findIndex((entry) => entry.id === match.id);
  if (idx < 0) return [null, null];
  return [prevRoundMatches[idx * 2]?.id ?? null, prevRoundMatches[idx * 2 + 1]?.id ?? null];
}

/** Effective Y from a parent that may be hidden (returns null when parent is compressed away). */
export function effectiveParentY(
  parentId: string | null,
  positions: Map<string, { y: number }>,
  hidden: Set<string>,
): number | null {
  if (!parentId || hidden.has(parentId)) return null;
  return positions.get(parentId)?.y ?? null;
}
