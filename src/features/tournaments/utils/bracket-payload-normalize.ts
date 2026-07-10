import type { PersistedBracketPayload } from "@/features/admin/features/tournament-details/services/bracket.service";
import type {
  BracketRoundMeta,
  ManagedMatch,
} from "@/features/admin/features/tournament-details/utils/managed-bracket";
import { applyOpeningRoundMatchLabels } from "@/features/admin/features/tournament-details/utils/managed-bracket-build-helpers";
import {
  isDoubleEliminationFormat,
  isSingleEliminationFormat,
  isSwissFormat,
} from "@/features/tournaments/constants/formats";
import { enrichPublicRounds } from "./bracket-connectors";
import { applyGlobalMatchLabels } from "./bracket-global-match-labels";
import { applyDoubleElimRoundMetaLabels } from "@/features/admin/features/tournament-details/utils/managed-double-elims-bracket";
import { inferRoundIdFromMatchId } from "./bracket-display";
import type { BracketRound } from "../types";

/** Recompute global Match N labels on elimination brackets (admin restore + public read). */
export function relabelEliminationMatches(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
  format: string,
  teamCount: number,
): void {
  if (isSwissFormat(format)) return;
  if (isDoubleEliminationFormat(format)) {
    applyDoubleElimRoundMetaLabels(roundMetas);
    syncMatchRoundLabels(matches, roundMetas);
  }
  applyOpeningRoundMatchLabels(matches, roundMetas, teamCount);
  if (isDoubleEliminationFormat(format)) {
    applyGlobalMatchLabels(matches, roundMetas, "double");
    return;
  }
  if (isSingleEliminationFormat(format)) {
    applyGlobalMatchLabels(matches, roundMetas, "single");
  }
}

function syncMatchRoundLabels(matches: ManagedMatch[], roundMetas: BracketRoundMeta[]): void {
  const labelByRoundId = new Map(roundMetas.map((meta) => [meta.id, meta.label]));
  for (const match of matches) {
    const label = labelByRoundId.get(match.roundId);
    if (label) match.roundLabel = label;
  }
}

function syncPublicRoundColumnLabels(
  rounds: BracketRound[],
  roundMetas: BracketRoundMeta[],
): BracketRound[] {
  const labelByRoundId = new Map(roundMetas.map((meta) => [meta.id, meta.label]));

  return rounds.map((round) => {
    const roundId =
      round.id ??
      (round.matches[0]?.id ? inferRoundIdFromMatchId(round.matches[0].id) : undefined);
    const label = roundId ? labelByRoundId.get(roundId) : undefined;
    return label ? { ...round, label } : round;
  });
}

export function inferEliminationLabelFormat(
  roundMetas: BracketRoundMeta[],
): "single" | "double" | null {
  if (roundMetas.some((meta) => meta.side === "swiss")) return null;
  if (roundMetas.some((meta) => meta.side === "lower" || meta.side === "upper")) {
    return "double";
  }
  return "single";
}

export function syncPublicMatchLabels(
  rounds: BracketRound[],
  matches: ManagedMatch[],
): BracketRound[] {
  const labelById = new Map(matches.map((match) => [match.id, match.label]));

  return rounds.map((round) => ({
    ...round,
    matches: round.matches.map((match) => ({
      ...match,
      label: labelById.get(match.id) ?? match.label,
    })),
  }));
}

function resolveOpeningFieldSize(
  assignmentTeamIds: Array<string | null> | undefined,
  matches: ManagedMatch[],
): number {
  if (assignmentTeamIds?.length) return assignmentTeamIds.length;

  const teams = new Set<string>();
  for (const match of matches) {
    if (match.teamA?.trim()) teams.add(match.teamA);
    if (match.teamB?.trim()) teams.add(match.teamB);
  }
  return teams.size;
}

/**
 * Apply elimination relabeling and slot hints for published payloads read on the public site.
 * Does not persist — safe to run on every fetch/realtime update.
 */
export function normalizePublishedBracketPayload(
  payload: PersistedBracketPayload,
): PersistedBracketPayload {
  const admin = payload.admin;
  if (!admin?.managedMatches?.length) {
    return { ...payload, rounds: enrichPublicRounds(payload.rounds) };
  }

  const roundMetas = admin.roundMetas ?? [];
  const labelFormat = roundMetas.length ? inferEliminationLabelFormat(roundMetas) : null;
  let managedMatches = admin.managedMatches;
  let normalizedRoundMetas = roundMetas;

  if (labelFormat && roundMetas.length) {
    managedMatches = admin.managedMatches.map((match) => ({ ...match }));
    normalizedRoundMetas = roundMetas.map((meta) => ({ ...meta }));
    const fieldSize = resolveOpeningFieldSize(admin.assignmentTeamIds, managedMatches);
    const formatLabel = labelFormat === "double" ? "Double Elimination" : "Single Elimination";
    relabelEliminationMatches(managedMatches, normalizedRoundMetas, formatLabel, fieldSize);
  }

  const labeledRounds = syncPublicMatchLabels(payload.rounds, managedMatches);
  const roundsWithColumnLabels =
    labelFormat === "double"
      ? syncPublicRoundColumnLabels(labeledRounds, normalizedRoundMetas)
      : labeledRounds;
  const rounds = enrichPublicRounds(roundsWithColumnLabels, managedMatches, normalizedRoundMetas);

  return {
    ...payload,
    rounds,
    admin: admin
      ? { ...admin, managedMatches, roundMetas: normalizedRoundMetas }
      : undefined,
  };
}
