/** Shared canvas layout — keep admin and public bracket views aligned. */
export const BRACKET_CARD_W = 220;
export const BRACKET_CARD_H = 96;
export const BRACKET_MATCH_GAP = 16;
export const BRACKET_COL_GAP = 56;
export const BRACKET_PAD_V = 24;

export function bracketMatchTop(
  index: number,
  count: number,
  canvasHeight: number,
  cardHeight = BRACKET_CARD_H,
): number {
  const headerH = 36;
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
    maxMatches * BRACKET_CARD_H + (maxMatches - 1) * BRACKET_MATCH_GAP + BRACKET_PAD_V * 2 + 36;
  const width = roundCount * (BRACKET_CARD_W + BRACKET_COL_GAP) + 40;
  return { width, height: Math.max(height, 300) };
}
