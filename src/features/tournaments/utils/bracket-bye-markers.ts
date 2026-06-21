import type { BracketRoundMeta, ManagedMatch } from "@/features/admin/features/tournament-details/utils/managed-bracket";
import type { BracketRound } from "../types";
import type { LayoutInputMatch } from "./bracket-connectors";
import { publicToLayoutMatches } from "./bracket-connectors";
import {
  buildLayoutHiddenSet,
  isLayoutHiddenMatch,
  resolveVisibleSuccessor,
} from "./bracket-layout-visibility";

export interface ByeSlotMarkers {
  teamA?: boolean;
  teamB?: boolean;
}

function toLayoutInput(
  match: Pick<
    ManagedMatch,
    "id" | "roundId" | "teamA" | "teamB" | "confirmed" | "winner" | "winnerNext"
  >,
  roundIndex: number,
): LayoutInputMatch {
  return {
    id: match.id,
    roundId: match.roundId,
    roundIndex,
    nextWinnerMatchId: match.winnerNext?.matchId ?? null,
    connectorStatus: "upcoming",
    teamA: match.teamA,
    teamB: match.teamB,
    confirmed: match.confirmed,
    winner: match.winner,
  };
}

function isAutoByeAdvancementMatch(
  match: LayoutInputMatch,
): boolean {
  if (!isLayoutHiddenMatch(match)) return false;
  const teamA = match.teamA?.trim() || null;
  const teamB = match.teamB?.trim() || null;
  if (!teamA && !teamB) return false;
  return Boolean(match.winner?.trim());
}

function markSlot(
  markers: Map<string, ByeSlotMarkers>,
  matchId: string,
  slot: "teamA" | "teamB",
): void {
  const entry = markers.get(matchId) ?? {};
  entry[slot] = true;
  markers.set(matchId, entry);
}

function resolveTargetSlot(
  source: Pick<ManagedMatch, "winner" | "winnerNext">,
  target: Pick<ManagedMatch, "teamA" | "teamB">,
): "teamA" | "teamB" | null {
  if (source.winnerNext?.slot) return source.winnerNext.slot;
  const winner = source.winner?.trim();
  if (!winner) return null;
  if (target.teamA === winner) return "teamA";
  if (target.teamB === winner) return "teamB";
  return null;
}

/** Mark first visible slots where a team arrived via round-one bye (not a played win). */
export function buildByeAdvancementMarkers(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
): Map<string, ByeSlotMarkers> {
  const roundIndexById = new Map(roundMetas.map((round, index) => [round.id, index]));
  const layoutMatches = matches.map((match) =>
    toLayoutInput(match, roundIndexById.get(match.roundId) ?? 0),
  );
  const matchById = new Map(layoutMatches.map((match) => [match.id, match]));
  const managedById = new Map(matches.map((match) => [match.id, match]));
  const hidden = buildLayoutHiddenSet(layoutMatches);
  const markers = new Map<string, ByeSlotMarkers>();

  for (const layoutMatch of layoutMatches) {
    if (!hidden.has(layoutMatch.id) || !isAutoByeAdvancementMatch(layoutMatch)) continue;

    const source = managedById.get(layoutMatch.id);
    if (!source?.winner) continue;

    const visibleTargetId = resolveVisibleSuccessor(
      source.winnerNext?.matchId,
      matchById,
      hidden,
    );
    if (!visibleTargetId) continue;

    const target = managedById.get(visibleTargetId);
    if (!target) continue;

    const slot = resolveTargetSlot(source, target);
    if (slot) markSlot(markers, visibleTargetId, slot);
  }

  return markers;
}

/** Public bracket view — same markers from published rounds + advancement links. */
export function buildByeAdvancementMarkersFromRounds(
  rounds: BracketRound[],
): Map<string, ByeSlotMarkers> {
  const layoutMatches = publicToLayoutMatches(rounds);
  const matchById = new Map(layoutMatches.map((match) => [match.id, match]));
  const hidden = buildLayoutHiddenSet(layoutMatches);
  const markers = new Map<string, ByeSlotMarkers>();

  const matchLookup = new Map(
    rounds.flatMap((round) => round.matches.map((match) => [match.id, match] as const)),
  );

  for (const layoutMatch of layoutMatches) {
    if (!hidden.has(layoutMatch.id) || !isAutoByeAdvancementMatch(layoutMatch)) continue;

    const source = matchLookup.get(layoutMatch.id);
    if (!source?.winner) continue;

    const visibleTargetId = resolveVisibleSuccessor(
      source.winnerAdvancesTo ?? layoutMatch.nextWinnerMatchId,
      matchById,
      hidden,
    );
    if (!visibleTargetId) continue;

    const target = matchLookup.get(visibleTargetId);
    if (!target) continue;

    const winner = source.winner.trim();
    let slot: "teamA" | "teamB" | null = null;
    if (target.teamA === winner) slot = "teamA";
    else if (target.teamB === winner) slot = "teamB";
    if (slot) markSlot(markers, visibleTargetId, slot);
  }

  return markers;
}
