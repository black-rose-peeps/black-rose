import type { LayoutInputMatch } from "./bracket-connectors";
import {
  buildLayoutHiddenSet,
  effectiveParentY,
  resolveVisibleSuccessor,
  structuralParentIds,
} from "./bracket-layout-visibility";

/** Shared canvas layout — keep admin and public bracket views aligned. */
export const BRACKET_CARD_W = 240;
export const BRACKET_CARD_H = 112;
export const BRACKET_MATCH_GAP = 16;
export const BRACKET_ROW_GAP = 24;
export const BRACKET_COL_GAP = 72;
export const BRACKET_PAD_V = 24;
export const BRACKET_HEADER_H = 44;

export interface PositionedLayoutMatch extends LayoutInputMatch {
  x: number;
  y: number;
  visible: boolean;
  visualNextWinnerMatchId?: string | null;
}

function matchSlotIndex(matchId: string): number {
  const parsed = Number.parseInt(matchId.match(/-m(\d+)$/)?.[1] ?? "0", 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortRoundMatches(roundMatches: LayoutInputMatch[]): LayoutInputMatch[] {
  return [...roundMatches].sort((a, b) => matchSlotIndex(a.id) - matchSlotIndex(b.id));
}

function evenlySpacedY(index: number, count: number, span: number): number {
  if (count <= 1) return span / 2;
  return (index * span) / (count - 1);
}

function verticalSpan(matchCount: number): number {
  return Math.max(0, (matchCount - 1) * (BRACKET_CARD_H + BRACKET_ROW_GAP));
}

function buildFeederMap(matches: LayoutInputMatch[]): Map<string, string[]> {
  const feedersOf = new Map<string, string[]>();
  for (const match of matches) {
    if (!match.nextWinnerMatchId) continue;
    const list = feedersOf.get(match.nextWinnerMatchId) ?? [];
    list.push(match.id);
    feedersOf.set(match.nextWinnerMatchId, list);
  }
  return feedersOf;
}

/** Spread matches in a column that share the same Y so cards do not overlap. */
function resolveColumnCollisions(
  roundMatches: LayoutInputMatch[],
  positions: Map<string, { x: number; y: number }>,
  minGap: number,
): void {
  const sorted = [...roundMatches].sort((a, b) => {
    const yA = positions.get(a.id)?.y ?? 0;
    const yB = positions.get(b.id)?.y ?? 0;
    return yA !== yB ? yA - yB : matchSlotIndex(a.id) - matchSlotIndex(b.id);
  });

  for (let i = 1; i < sorted.length; i++) {
    const prev = positions.get(sorted[i - 1].id);
    const curr = positions.get(sorted[i].id);
    if (!prev || !curr) continue;
    if (curr.y - prev.y < minGap) {
      positions.set(sorted[i].id, { ...curr, y: prev.y + minGap });
    }
  }
}

/**
 * Consecutive rounds with equal match counts where each source match advances to a
 * unique target (play-in → upper Round 2 cross-seeding).
 */
function isBijectiveAdvancementPair(
  sourceRound: LayoutInputMatch[],
  targetRound: LayoutInputMatch[],
  matchById: Map<string, LayoutInputMatch>,
  feedersOf: Map<string, string[]>,
  sourceRoundIndex: number,
  targetRoundIndex: number,
): boolean {
  if (sourceRound.length !== targetRound.length || sourceRound.length === 0) return false;

  const targetIds = new Set<string>();
  for (const match of sourceRound) {
    if (!match.nextWinnerMatchId) return false;
    const target = matchById.get(match.nextWinnerMatchId);
    if (!target || target.roundIndex !== targetRoundIndex) return false;
    if (targetIds.has(match.nextWinnerMatchId)) return false;
    targetIds.add(match.nextWinnerMatchId);
  }

  if (targetIds.size !== sourceRound.length) return false;

  for (const target of targetRound) {
    const feeders = (feedersOf.get(target.id) ?? []).filter(
      (id) => matchById.get(id)?.roundIndex === sourceRoundIndex,
    );
    if (feeders.length !== 1) return false;
  }

  return true;
}

/** Same-slot 1:1 advancement (lower consolidation); not cross-seeded play-in wiring. */
function isSameIndexBijectivePair(
  sourceRound: LayoutInputMatch[],
  targetRound: LayoutInputMatch[],
): boolean {
  const sources = sortRoundMatches(sourceRound);
  const targets = sortRoundMatches(targetRound);
  if (sources.length !== targets.length) return false;
  return sources.every((source, index) => source.nextWinnerMatchId === targets[index]?.id);
}

function alignSourceRoundToTargets(
  sourceRound: LayoutInputMatch[],
  positions: Map<string, { x: number; y: number }>,
): void {
  for (const match of sourceRound) {
    if (!match.nextWinnerMatchId) continue;
    const sourcePos = positions.get(match.id);
    const targetPos = positions.get(match.nextWinnerMatchId);
    if (!sourcePos || !targetPos) continue;
    positions.set(match.id, { x: sourcePos.x, y: targetPos.y });
  }
}

/**
 * Compressed Challonge-style layout — hides bye-only and auto-bye matches while
 * preserving backend bracket structure. Bye recipients appear in their first active round.
 */
export function buildLayout(matches: LayoutInputMatch[]): {
  positioned: PositionedLayoutMatch[];
  width: number;
  height: number;
  roundIndices: number[];
} {
  if (matches.length === 0) {
    return { positioned: [], width: 0, height: 0, roundIndices: [] };
  }

  const matchById = new Map(matches.map((match) => [match.id, match]));
  const hidden = buildLayoutHiddenSet(matches);
  const feedersOf = buildFeederMap(matches);

  const roundIndices = Array.from(new Set(matches.map((match) => match.roundIndex))).sort(
    (a, b) => a - b,
  );

  const visibleRoundIndices = roundIndices.filter((roundIndex) =>
    matches.some((match) => match.roundIndex === roundIndex && !hidden.has(match.id)),
  );

  const visualColumnByRound = new Map<number, number>();
  visibleRoundIndices.forEach((roundIndex, column) => {
    visualColumnByRound.set(roundIndex, column);
  });

  const byRound = new Map<number, LayoutInputMatch[]>();
  for (const roundIndex of roundIndices) {
    byRound.set(
      roundIndex,
      sortRoundMatches(matches.filter((match) => match.roundIndex === roundIndex)),
    );
  }

  const visibleCountByRound = new Map<number, number>();
  for (const roundIndex of roundIndices) {
    const visibleCount = byRound
      .get(roundIndex)!
      .filter((match) => !hidden.has(match.id)).length;
    visibleCountByRound.set(roundIndex, visibleCount);
  }

  const maxVisibleRoundSize = Math.max(
    1,
    ...[...visibleCountByRound.values()].filter((count) => count > 0),
  );
  const refSpan = verticalSpan(maxVisibleRoundSize);
  const minGap = BRACKET_CARD_H + BRACKET_ROW_GAP;
  const positions = new Map<string, { x: number; y: number }>();
  const bijectiveSourceRounds = new Set<number>();

  const firstVisibleRoundIndex = visibleRoundIndices[0];

  for (let roundOffset = 0; roundOffset < roundIndices.length; roundOffset++) {
    const roundIndex = roundIndices[roundOffset];
    const roundMatches = byRound.get(roundIndex)!;
    const visibleInRound = roundMatches.filter((match) => !hidden.has(match.id));

    if (visibleInRound.length === 0) continue;

    const visualColumn = visualColumnByRound.get(roundIndex) ?? 0;
    const x = visualColumn * (BRACKET_CARD_W + BRACKET_COL_GAP);
    const prevRoundIndex = roundOffset > 0 ? roundIndices[roundOffset - 1] : null;

    if (roundIndex === firstVisibleRoundIndex) {
      visibleInRound.forEach((match, index) => {
        positions.set(match.id, {
          x,
          y: evenlySpacedY(index, visibleInRound.length, refSpan),
        });
      });
      continue;
    }

    const prevRoundMatches = prevRoundIndex !== null ? byRound.get(prevRoundIndex)! : [];
    const visiblePrevRound = prevRoundMatches.filter((match) => !hidden.has(match.id));

    if (
      prevRoundIndex !== null &&
      isBijectiveAdvancementPair(
        visiblePrevRound,
        visibleInRound,
        matchById,
        feedersOf,
        prevRoundIndex,
        roundIndex,
      )
    ) {
      const sortedSources = sortRoundMatches(visiblePrevRound);
      const sortedTargets = sortRoundMatches(visibleInRound);

      if (isSameIndexBijectivePair(visiblePrevRound, visibleInRound)) {
        sortedTargets.forEach((target, index) => {
          const sourceY = positions.get(sortedSources[index]?.id ?? "")?.y;
          positions.set(target.id, {
            x,
            y: sourceY ?? evenlySpacedY(index, sortedTargets.length, refSpan),
          });
        });
      } else {
        sortedTargets.forEach((match, index) => {
          positions.set(match.id, { x, y: evenlySpacedY(index, sortedTargets.length, refSpan) });
        });
        bijectiveSourceRounds.add(prevRoundIndex);
      }
      continue;
    }

    const unplaced: LayoutInputMatch[] = [];

    for (const match of visibleInRound) {
      let y: number | null = null;

      if (prevRoundMatches.length === roundMatches.length * 2) {
        const slotIdx = roundMatches.indexOf(match);
        const parentA = prevRoundMatches[slotIdx * 2];
        const parentB = prevRoundMatches[slotIdx * 2 + 1];
        const yA = parentA ? effectiveParentY(parentA.id, positions, hidden) : null;
        const yB = parentB ? effectiveParentY(parentB.id, positions, hidden) : null;

        if (yA !== null && yB !== null) {
          y = (yA + yB) / 2;
        } else if (yA !== null) {
          y = yA;
        } else if (yB !== null) {
          y = yB;
        }
      } else {
        const fromPrev = (feedersOf.get(match.id) ?? []).filter(
          (id) => matchById.get(id)?.roundIndex === prevRoundIndex,
        );
        const visibleFeederYs = fromPrev
          .map((id) => effectiveParentY(id, positions, hidden))
          .filter((value): value is number => value !== null);

        if (visibleFeederYs.length >= 2) {
          y = visibleFeederYs.reduce((sum, value) => sum + value, 0) / visibleFeederYs.length;
        } else if (visibleFeederYs.length === 1) {
          y = visibleFeederYs[0];
        } else if (prevRoundMatches.length > 0) {
          const [parentAId, parentBId] = structuralParentIds(match, prevRoundMatches);
          const yA = effectiveParentY(parentAId, positions, hidden);
          const yB = effectiveParentY(parentBId, positions, hidden);
          if (yA !== null && yB !== null) y = (yA + yB) / 2;
          else if (yA !== null) y = yA;
          else if (yB !== null) y = yB;
        }
      }

      if (y === null) {
        unplaced.push(match);
      } else {
        positions.set(match.id, { x, y });
      }
    }

    unplaced.forEach((match, index) => {
      positions.set(match.id, {
        x,
        y: evenlySpacedY(index, unplaced.length, refSpan),
      });
    });
  }

  for (const sourceRoundIndex of bijectiveSourceRounds) {
    const visibleSources = byRound
      .get(sourceRoundIndex)!
      .filter((match) => !hidden.has(match.id));
    alignSourceRoundToTargets(visibleSources, positions);
  }

  for (const roundIndex of visibleRoundIndices) {
    if (bijectiveSourceRounds.has(roundIndex)) continue;
    const visibleInRound = byRound
      .get(roundIndex)!
      .filter((match) => !hidden.has(match.id));
    resolveColumnCollisions(visibleInRound, positions, minGap);
  }

  const positioned: PositionedLayoutMatch[] = [];

  for (const match of matches) {
    if (hidden.has(match.id)) continue;
    const pos = positions.get(match.id) ?? { x: 0, y: 0 };
    positioned.push({
      ...match,
      ...pos,
      visible: true,
      visualNextWinnerMatchId: resolveVisibleSuccessor(
        match.nextWinnerMatchId,
        matchById,
        hidden,
      ),
    });
  }

  const visualColumnCount = Math.max(1, visibleRoundIndices.length);
  const width =
    (visualColumnCount - 1) * (BRACKET_CARD_W + BRACKET_COL_GAP) + BRACKET_CARD_W;
  const height =
    positioned.length > 0
      ? Math.max(...positioned.map((match) => match.y), 0) + BRACKET_CARD_H
      : 0;

  return { positioned, width, height, roundIndices: visibleRoundIndices };
}

/** Top-to-bottom Match 1…N labels per column (visible matches only). */
export function buildColumnDisplayLabels(
  positioned: PositionedLayoutMatch[],
): Map<string, string> {
  const byRound = new Map<number, PositionedLayoutMatch[]>();

  for (const match of positioned) {
    if (!match.visible) continue;
    const list = byRound.get(match.roundIndex) ?? [];
    list.push(match);
    byRound.set(match.roundIndex, list);
  }

  const labels = new Map<string, string>();

  for (const roundMatches of byRound.values()) {
    if (roundMatches.length <= 1) continue;

    const sorted = [...roundMatches].sort(
      (a, b) => a.y - b.y || matchSlotIndex(a.id) - matchSlotIndex(b.id),
    );

    sorted.forEach((match, index) => {
      labels.set(match.id, `Match ${index + 1}`);
    });
  }

  return labels;
}

export function bracketMatchTop(
  index: number,
  count: number,
  canvasHeight: number,
  cardHeight = BRACKET_CARD_H,
): number {
  const headerH = BRACKET_HEADER_H;
  const fullCardH = cardHeight;
  if (count <= 1) {
    return BRACKET_PAD_V + headerH + (canvasHeight - BRACKET_PAD_V * 2 - headerH - fullCardH) / 2;
  }
  const contentH = canvasHeight - BRACKET_PAD_V * 2 - headerH;
  const spacing = (contentH - fullCardH) / (count - 1);
  return BRACKET_PAD_V + headerH + index * spacing;
}

export function bracketCanvasSize(
  roundCount: number,
  maxMatches: number,
): { width: number; height: number } {
  const height =
    maxMatches * BRACKET_CARD_H +
    (maxMatches - 1) * BRACKET_ROW_GAP +
    BRACKET_PAD_V * 2 +
    BRACKET_HEADER_H;
  const width = roundCount * (BRACKET_CARD_W + BRACKET_COL_GAP) + 40;
  return { width, height: Math.max(height, 300) };
}
