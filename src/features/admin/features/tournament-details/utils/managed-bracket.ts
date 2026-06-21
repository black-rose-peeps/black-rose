/**
 * Managed bracket — re-exports core, builders, and runtime helpers.
 */

export {
  type BuildBracketOptions,
  type BestOfFormat,
  type MatchSlotRef,
  type ManagedMatch,
  type BracketRoundMeta,
  winsRequired,
  defaultRoundFormats,
  reapplyFormatToRound,
  applyGrandFinalResetState,
  applyBracketProgression,
  recomputeAdvancements,
  updateMatchScores,
  setMatchWinner,
  clearMatchResult,
  getMatchesByRound,
} from "./managed-bracket-core";

export {
  canIncludeSingleElimThirdPlace,
  buildSingleElimMatches,
  type PlayoffRound1Pairing,
  playoffBracketSize,
  playoffRound1MatchCount,
  normalizePlayoffRound1Pairings,
  defaultPlayoffRound1Pairings,
  type BuildPlayoffBracketOptions,
  buildPlayoffBracket,
} from "./managed-single-elims-bracket";

export { buildDoubleElimMatches } from "./managed-double-elims-bracket";
