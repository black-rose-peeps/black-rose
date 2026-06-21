import type { BracketRound } from "../types";
import type { BracketRoundMeta, ManagedMatch } from "@/features/admin/features/tournament-details/utils/managed-bracket";

export interface MatchSlotHints {
  teamA?: string;
  teamB?: string;
}

function compactMatchRef(label: string): string {
  const protectedSeed = label.match(/^Seed (\d+) · protected$/i);
  if (protectedSeed) return `Seed ${protectedSeed[1]}`;

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

/** Human-readable round name for empty slot placeholders (matches column headers). */
export function displayHintRoundLabel(
  roundId: string,
  fallbackRoundLabel: string,
  labelByRoundId?: Map<string, string>,
): string {
  const metaLabel = labelByRoundId?.get(roundId);
  if (metaLabel) {
    return metaLabel
      .replace(/^Upper — /, "Upper ")
      .replace(/^Lower — /, "Lower ")
      .replace(/^Opening — /, "Opening ");
  }

  if (roundId === "ub-qf") return "Upper Quarterfinals";
  if (roundId === "ub-sf") return "Upper Semifinals";
  if (roundId === "ub-f") return "Upper Final";
  if (roundId === "lb-sf") return "Lower Semifinals";
  if (roundId === "lb-f") return "Lower Final";
  if (roundId === "pi-r1") return "Opening Play-in";
  if (roundId === "gf") return "Grand Final";
  if (roundId === "gf-reset") return "Grand Final Reset";

  const ubRoundMatch = roundId.match(/^ub-r(\d+)$/);
  if (ubRoundMatch) return `Upper Round ${ubRoundMatch[1]}`;

  const lbRoundMatch = roundId.match(/^lb-r(\d+)$/);
  if (lbRoundMatch) return `Lower Round ${lbRoundMatch[1]}`;

  const seRoundMatch = roundId.match(/^se-r(\d+)$/);
  if (seRoundMatch) return `Round ${parseInt(seRoundMatch[1], 10) + 1}`;

  return fallbackRoundLabel
    .replace(/^Upper — /, "Upper ")
    .replace(/^Lower — /, "Lower ")
    .replace(/^Opening — /, "Opening ");
}

function feederLabel(
  match: Pick<ManagedMatch, "label" | "roundLabel" | "roundId">,
  role: "winner" | "loser",
  labelByRoundId?: Map<string, string>,
): string {
  const protectedSeed = match.label.match(/^Seed (\d+) · protected$/i);
  if (protectedSeed) {
    return `Seed ${protectedSeed[1]} · protected`;
  }

  const matchRef = compactMatchRef(match.label);
  const round = displayHintRoundLabel(match.roundId, match.roundLabel, labelByRoundId);
  const roleWord = role === "winner" ? "winner" : "loser";
  return `${round} · ${matchRef} ${roleWord}`;
}

function buildLabelByRoundId(
  roundMetas?: BracketRoundMeta[],
  publicRounds?: BracketRound[],
): Map<string, string> | undefined {
  if (roundMetas?.length) {
    return new Map(roundMetas.map((meta) => [meta.id, meta.label]));
  }
  if (publicRounds?.length) {
    const map = new Map<string, string>();
    for (const round of publicRounds) {
      if (round.id) map.set(round.id, round.label);
    }
    return map.size > 0 ? map : undefined;
  }
  return undefined;
}

export function buildMatchSlotHints(
  matches: ManagedMatch[],
  roundMetas?: BracketRoundMeta[],
  publicRounds?: BracketRound[],
): Map<string, MatchSlotHints> {
  const labelByRoundId = buildLabelByRoundId(roundMetas, publicRounds);
  const hints = new Map<string, MatchSlotHints>();

  for (const match of matches) {
    if (match.winnerNext) {
      const entry = hints.get(match.winnerNext.matchId) ?? {};
      entry[match.winnerNext.slot] = feederLabel(match, "winner", labelByRoundId);
      hints.set(match.winnerNext.matchId, entry);
    }
    if (match.loserNext) {
      if (/^Seed \d+ · protected$/i.test(match.label)) continue;
      const entry = hints.get(match.loserNext.matchId) ?? {};
      entry[match.loserNext.slot] = feederLabel(match, "loser", labelByRoundId);
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

  const hints = buildMatchSlotHints(managedMatches, undefined, rounds);

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

export function hasOpeningPlayInField(_teamCount: number): boolean {
  return false;
}
