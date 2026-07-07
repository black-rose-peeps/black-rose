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
export const BRACKET_BAND_GAP = 72;
export const BRACKET_BAND_TITLE_H = 40;
/** Extra clearance between round labels and the first match row. */
export const BRACKET_HEADER_PAD = 12;

/** Reserve vertical space for round labels (and optional format / schedule rows) above match cards. */
export function bracketRoundHeaderReserveHeight(options: {
  showFormatControls?: boolean;
  showScheduleControls?: boolean;
  showScheduleDisplay?: boolean;
  renderRoundHeader?: boolean;
}): number {
  let height = BRACKET_HEADER_H + BRACKET_HEADER_PAD;
  if (options.showFormatControls) height += 34;
  if (options.showScheduleControls) height += 44;
  if (options.showScheduleDisplay) height += 64;
  if (options.renderRoundHeader) height += 28;
  return height;
}

function enforceLayoutFloor(positions: Map<string, { x: number; y: number }>, minY = 0): void {
  for (const [id, pos] of positions) {
    if (pos.y < minY) {
      positions.set(id, { ...pos, y: minY });
    }
  }
}

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

function visibleFeedersForTarget(
  targetId: string,
  prevRoundIndex: number,
  matchById: Map<string, LayoutInputMatch>,
  hidden: Set<string>,
): string[] {
  const feeders: string[] = [];
  for (const match of matchById.values()) {
    if (match.roundIndex !== prevRoundIndex || hidden.has(match.id)) continue;
    const visibleTarget = resolveVisibleSuccessor(match.nextWinnerMatchId, matchById, hidden);
    if (visibleTarget === targetId) feeders.push(match.id);
  }
  return feeders;
}

function averageFeederYForTarget(
  targetId: string,
  matchById: Map<string, LayoutInputMatch>,
  prevRoundIndex: number,
  positions: Map<string, { x: number; y: number }>,
  hidden: Set<string>,
): number | null {
  const fromPrev = visibleFeedersForTarget(targetId, prevRoundIndex, matchById, hidden);
  const feederYs = fromPrev
    .map((id) => effectiveParentY(id, positions, hidden))
    .filter((value): value is number => value !== null);

  if (feederYs.length >= 2) {
    return feederYs.reduce((sum, value) => sum + value, 0) / feederYs.length;
  }
  if (feederYs.length === 1) {
    return feederYs[0];
  }
  return null;
}

function resolveTargetYFromFeeders(
  match: LayoutInputMatch,
  roundMatches: LayoutInputMatch[],
  prevRoundMatches: LayoutInputMatch[],
  prevRoundIndex: number | null,
  matchById: Map<string, LayoutInputMatch>,
  positions: Map<string, { x: number; y: number }>,
  hidden: Set<string>,
): number | null {
  if (prevRoundIndex === null) return null;

  const fromFeeders = averageFeederYForTarget(
    match.id,
    matchById,
    prevRoundIndex,
    positions,
    hidden,
  );
  if (fromFeeders !== null) return fromFeeders;

  if (prevRoundMatches.length === roundMatches.length * 2) {
    const slotIdx = roundMatches.indexOf(match);
    const parentA = prevRoundMatches[slotIdx * 2];
    const parentB = prevRoundMatches[slotIdx * 2 + 1];
    const yA = parentA ? effectiveParentY(parentA.id, positions, hidden) : null;
    const yB = parentB ? effectiveParentY(parentB.id, positions, hidden) : null;

    if (yA !== null && yB !== null) return (yA + yB) / 2;
    if (yA !== null) return yA;
    if (yB !== null) return yB;
  }

  if (prevRoundMatches.length > 0) {
    const [parentAId, parentBId] = structuralParentIds(
      roundMatches.indexOf(match),
      prevRoundMatches,
    );
    const yA = effectiveParentY(parentAId, positions, hidden);
    const yB = effectiveParentY(parentBId, positions, hidden);
    if (yA !== null && yB !== null) return (yA + yB) / 2;
    if (yA !== null) return yA;
    if (yB !== null) return yB;
  }

  return null;
}

/** Sort sources by where they actually advance so connectors stay parallel. */
function layoutSourcesGroupedByTarget(
  sources: LayoutInputMatch[],
  positions: Map<string, { x: number; y: number }>,
  matchById: Map<string, LayoutInputMatch>,
  hidden: Set<string>,
  span: number,
  minGap: number,
): void {
  if (sources.length === 0) return;

  const x = positions.get(sources[0]!.id)?.x ?? 0;
  const groups = new Map<string, LayoutInputMatch[]>();
  const orphans: LayoutInputMatch[] = [];

  for (const source of sources) {
    const targetId = resolveVisibleSuccessor(source.nextWinnerMatchId, matchById, hidden);
    if (!targetId) {
      orphans.push(source);
      continue;
    }
    const list = groups.get(targetId) ?? [];
    list.push(source);
    groups.set(targetId, list);
  }

  const sortedGroups = [...groups.entries()].sort((a, b) => {
    const yA = positions.get(a[0])?.y ?? 0;
    const yB = positions.get(b[0])?.y ?? 0;
    if (yA !== yB) return yA - yB;
    return matchSlotIndex(a[1][0]!.id) - matchSlotIndex(b[1][0]!.id);
  });

  const planned: { id: string; y: number }[] = [];

  for (const [targetId, group] of sortedGroups) {
    const targetY = positions.get(targetId)?.y ?? span / 2;
    const sortedGroup = sortRoundMatches(group);

    if (sortedGroup.length === 1) {
      planned.push({ id: sortedGroup[0]!.id, y: targetY });
      continue;
    }

    const innerSpan = Math.min(span * 0.6, (sortedGroup.length - 1) * minGap);
    const groupStart = Math.max(0, targetY - innerSpan / 2);
    sortedGroup.forEach((match, index) => {
      planned.push({
        id: match.id,
        y: groupStart + (index * innerSpan) / (sortedGroup.length - 1),
      });
    });
  }

  const sortedOrphans = sortRoundMatches(orphans);
  sortedOrphans.forEach((match, index) => {
    planned.push({ id: match.id, y: evenlySpacedY(index, sortedOrphans.length, span) });
  });

  planned.sort((a, b) => a.y - b.y || matchSlotIndex(a.id) - matchSlotIndex(b.id));
  for (let i = 1; i < planned.length; i++) {
    if (planned[i]!.y - planned[i - 1]!.y < minGap) {
      planned[i]!.y = planned[i - 1]!.y + minGap;
    }
  }

  for (const entry of planned) {
    positions.set(entry.id, { x, y: entry.y });
  }
}

function assignEvenTargetColumn(
  visibleInRound: LayoutInputMatch[],
  x: number,
  span: number,
  positions: Map<string, { x: number; y: number }>,
): void {
  const sorted = sortRoundMatches(visibleInRound);
  sorted.forEach((match, index) => {
    positions.set(match.id, {
      x,
      y: evenlySpacedY(index, sorted.length, span),
    });
  });
}

function repositionTargetRoundFromFeeders(
  roundIndex: number,
  visibleRoundIndices: number[],
  byRound: Map<number, LayoutInputMatch[]>,
  feedersOf: Map<string, string[]>,
  matchById: Map<string, LayoutInputMatch>,
  positions: Map<string, { x: number; y: number }>,
  hidden: Set<string>,
  visualColumnByRound: Map<number, number>,
  refSpan: number,
  minGap: number,
): void {
  const roundMatches = byRound.get(roundIndex)!;
  const visibleInRound = roundMatches.filter((match) => !hidden.has(match.id));
  const roundPos = visibleRoundIndices.indexOf(roundIndex);
  const prevRoundIndex = roundPos > 0 ? visibleRoundIndices[roundPos - 1]! : null;
  if (prevRoundIndex === null) return;

  const prevRoundMatches = byRound.get(prevRoundIndex)!;
  const x = (visualColumnByRound.get(roundIndex) ?? 0) * (BRACKET_CARD_W + BRACKET_COL_GAP);
  const yById = new Map<string, number>();

  for (const match of visibleInRound) {
    const y = resolveTargetYFromFeeders(
      match,
      roundMatches,
      prevRoundMatches,
      prevRoundIndex,
      matchById,
      positions,
      hidden,
    );
    if (y !== null) yById.set(match.id, y);
  }

  const ys = [...yById.values()];
  const needsEvenSpacing = ys.length > 1 && Math.max(...ys) - Math.min(...ys) < minGap * 0.75;

  if (needsEvenSpacing) {
    assignEvenTargetColumn(visibleInRound, x, refSpan, positions);
    return;
  }

  for (const [id, y] of yById) {
    positions.set(id, { x, y });
  }
}

function refineLayoutForFeederFlow(
  visibleRoundIndices: number[],
  byRound: Map<number, LayoutInputMatch[]>,
  feedersOf: Map<string, string[]>,
  matchById: Map<string, LayoutInputMatch>,
  positions: Map<string, { x: number; y: number }>,
  hidden: Set<string>,
  visualColumnByRound: Map<number, number>,
  refSpan: number,
  minGap: number,
): void {
  for (let i = 1; i < visibleRoundIndices.length; i++) {
    const roundIndex = visibleRoundIndices[i]!;
    const visibleInRound = byRound.get(roundIndex)!.filter((match) => !hidden.has(match.id));
    const x = (visualColumnByRound.get(roundIndex) ?? 0) * (BRACKET_CARD_W + BRACKET_COL_GAP);
    assignEvenTargetColumn(visibleInRound, x, refSpan, positions);
  }

  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < visibleRoundIndices.length - 1; i++) {
      const roundIndex = visibleRoundIndices[i]!;
      const sources = byRound.get(roundIndex)!.filter((match) => !hidden.has(match.id));
      layoutSourcesGroupedByTarget(sources, positions, matchById, hidden, refSpan, minGap);
    }

    for (let i = 1; i < visibleRoundIndices.length; i++) {
      repositionTargetRoundFromFeeders(
        visibleRoundIndices[i]!,
        visibleRoundIndices,
        byRound,
        feedersOf,
        matchById,
        positions,
        hidden,
        visualColumnByRound,
        refSpan,
        minGap,
      );
    }
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
    const visibleCount = byRound.get(roundIndex)!.filter((match) => !hidden.has(match.id)).length;
    visibleCountByRound.set(roundIndex, visibleCount);
  }

  const maxVisibleRoundSize = Math.max(
    1,
    ...[...visibleCountByRound.values()].filter((count) => count > 0),
  );
  const refSpan = verticalSpan(maxVisibleRoundSize);
  const minGap = BRACKET_CARD_H + BRACKET_ROW_GAP;
  const positions = new Map<string, { x: number; y: number }>();

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
      }
      continue;
    }

    const unplaced: LayoutInputMatch[] = [];

    for (const match of visibleInRound) {
      const y =
        prevRoundIndex === null
          ? null
          : resolveTargetYFromFeeders(
              match,
              roundMatches,
              prevRoundMatches,
              prevRoundIndex,
              matchById,
              positions,
              hidden,
            );

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

  refineLayoutForFeederFlow(
    visibleRoundIndices,
    byRound,
    feedersOf,
    matchById,
    positions,
    hidden,
    visualColumnByRound,
    refSpan,
    minGap,
  );

  enforceLayoutFloor(positions, 0);

  for (const roundIndex of visibleRoundIndices) {
    const visibleInRound = byRound.get(roundIndex)!.filter((match) => !hidden.has(match.id));
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
      visualNextWinnerMatchId: resolveVisibleSuccessor(match.nextWinnerMatchId, matchById, hidden),
    });
  }

  const visualColumnCount = Math.max(1, visibleRoundIndices.length);
  const width = (visualColumnCount - 1) * (BRACKET_CARD_W + BRACKET_COL_GAP) + BRACKET_CARD_W;
  const height =
    positioned.length > 0 ? Math.max(...positioned.map((match) => match.y), 0) + BRACKET_CARD_H : 0;

  return { positioned, width, height, roundIndices: visibleRoundIndices };
}

/** Top-to-bottom Match 1…N labels per column (visible matches only). */
export function buildColumnDisplayLabels(positioned: PositionedLayoutMatch[]): Map<string, string> {
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
