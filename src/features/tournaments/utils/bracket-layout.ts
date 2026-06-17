import type { LayoutInputMatch } from "./bracket-connectors";

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
}

export function buildLayout(matches: LayoutInputMatch[]): {
  positioned: PositionedLayoutMatch[];
  width: number;
  height: number;
  roundIndices: number[];
} {
  if (matches.length === 0) {
    return { positioned: [], width: 0, height: 0, roundIndices: [] };
  }

  const roundIndices = Array.from(new Set(matches.map((match) => match.roundIndex))).sort(
    (a, b) => a - b,
  );
  const byRound = new Map<number, LayoutInputMatch[]>();
  roundIndices.forEach((roundIndex) => {
    byRound.set(
      roundIndex,
      matches.filter((match) => match.roundIndex === roundIndex),
    );
  });

  const positions = new Map<string, { x: number; y: number }>();
  const firstRound = roundIndices[0];
  const firstRoundMatches = byRound.get(firstRound)!;

  firstRoundMatches.forEach((match, index) => {
    positions.set(match.id, { x: 0, y: index * (BRACKET_CARD_H + BRACKET_ROW_GAP) });
  });

  for (let roundOffset = 1; roundOffset < roundIndices.length; roundOffset++) {
    const roundIndex = roundIndices[roundOffset];
    const roundMatches = byRound.get(roundIndex)!;
    const x = roundOffset * (BRACKET_CARD_W + BRACKET_COL_GAP);

    roundMatches.forEach((match) => {
      const feeders = matches.filter((candidate) => candidate.nextWinnerMatchId === match.id);

      if (feeders.length === 2) {
        const yA = positions.get(feeders[0].id)?.y ?? 0;
        const yB = positions.get(feeders[1].id)?.y ?? 0;
        positions.set(match.id, { x, y: (yA + yB) / 2 });
      } else if (feeders.length === 1) {
        positions.set(match.id, { x, y: positions.get(feeders[0].id)?.y ?? 0 });
      } else {
        const index = roundMatches.indexOf(match);
        positions.set(match.id, { x, y: index * (BRACKET_CARD_H + BRACKET_ROW_GAP) });
      }
    });
  }

  const positioned = matches.map((match) => ({
    ...match,
    ...(positions.get(match.id) ?? { x: 0, y: 0 }),
  }));

  const width = (roundIndices.length - 1) * (BRACKET_CARD_W + BRACKET_COL_GAP) + BRACKET_CARD_W;
  const height = Math.max(...positioned.map((match) => match.y), 0) + BRACKET_CARD_H;

  return { positioned, width, height, roundIndices };
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
