import type { BracketRound } from "../types";
import type { BracketRoundMeta, ManagedMatch } from "@/features/admin/features/tournament-details/utils/managed-bracket";
import { resolveRoundId } from "./bracket-round-order";

export interface MatchSlotHints {
  teamA?: string;
  teamB?: string;
}

function compactMatchRef(label: string): string {
  const matchNumber = label.match(/^Match\s+(\d+)$/i);
  if (matchNumber) return `M${matchNumber[1]}`;

  const playIn = label.match(/^Play-in\s+(\d+)$/i);
  if (playIn) return `PI${playIn[1]}`;

  const playInLb = label.match(/^Play-in LB\s+(\d+)$/i);
  if (playInLb) return `LB-PI${playInLb[1]}`;

  const crossover = label.match(/^Crossover\s+(\d+)$/i);
  if (crossover) return `XO${crossover[1]}`;

  const lowerReset = label.match(/^Lower Reset$/i);
  if (lowerReset) return "LB Reset";

  const upperFinal = label.match(/^Upper Final$/i);
  if (upperFinal) return "UB Final";

  const lowerFinal = label.match(/^Lower Final$/i);
  if (lowerFinal) return "LB Final";

  const grandFinal = label.match(/^Grand Final$/i);
  if (grandFinal) return "GF";

  return label;
}

function feederLabel(match: Pick<ManagedMatch, "label" | "roundLabel">, role: "winner" | "loser"): string {
  const roleLabel = role === "winner" ? "Winner" : "Loser";
  const matchRef = compactMatchRef(match.label);
  const round = match.roundLabel
    .replace(/^Lower — /, "LB ")
    .replace(/^Upper — /, "UB ")
    .replace(/^Opening — /, "");
  return `${matchRef} ${roleLabel} ${round || match.label}`;
}

export function buildMatchSlotHints(matches: ManagedMatch[]): Map<string, MatchSlotHints> {
  const hints = new Map<string, MatchSlotHints>();

  for (const match of matches) {
    if (match.winnerNext) {
      const entry = hints.get(match.winnerNext.matchId) ?? {};
      entry[match.winnerNext.slot] = feederLabel(match, "winner");
      hints.set(match.winnerNext.matchId, entry);
    }
    if (match.loserNext) {
      const entry = hints.get(match.loserNext.matchId) ?? {};
      entry[match.loserNext.slot] = feederLabel(match, "loser");
      hints.set(match.loserNext.matchId, entry);
    }
  }

  return hints;
}

export function applySlotHintsToPublicRounds(
  rounds: BracketRound[],
  managedMatches?: ManagedMatch[],
): BracketRound[] {
  if (!managedMatches?.length) return rounds;

  const hints = buildMatchSlotHints(managedMatches);

  return rounds.map((round) => ({
    ...round,
    matches: round.matches.map((match) => {
      const slotHints = hints.get(match.id);
      if (!slotHints) return match;

      return {
        ...match,
        teamAHint: match.teamAHint ?? slotHints.teamA,
        teamBHint: match.teamBHint ?? slotHints.teamB,
      };
    }),
  }));
}

export function hasLowerPlayInPool(
  rounds: Array<{ id?: string; label: string; matches?: { id: string }[]; matchIds?: string[] }>,
): boolean {
  return rounds.some((round) => {
    const roundId = resolveRoundId(round);
    return roundId === "lb-pi" || roundId === "lb-pc" || /lower — play-in/i.test(round.label);
  });
}

export function hasOpeningPlayInField(teamCount: number): boolean {
  if (!Number.isInteger(teamCount) || teamCount < 2) return false;
  let size = 2;
  while (size * 2 <= teamCount) size *= 2;
  return teamCount !== size;
}
