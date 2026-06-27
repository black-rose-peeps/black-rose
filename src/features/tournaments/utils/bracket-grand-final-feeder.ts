import { inferRoundIdFromMatchId } from "./bracket-display";

export type GrandFinalFeederSide = "upper" | "lower";

/** Rounds whose winner advances directly to the primary Grand Final match. */
export function getGrandFinalFeederSide(roundId: string | null | undefined): GrandFinalFeederSide | null {
  if (roundId === "ub-f") return "upper";
  if (roundId === "lb-f") return "lower";
  return null;
}

export function getGrandFinalFeederSideFromMatchId(
  matchId: string | undefined,
): GrandFinalFeederSide | null {
  return getGrandFinalFeederSide(inferRoundIdFromMatchId(matchId));
}
