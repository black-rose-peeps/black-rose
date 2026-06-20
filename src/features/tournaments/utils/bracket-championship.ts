import type { BracketRound } from "../types";
import type { BracketRoundMeta } from "@/features/admin/features/tournament-details/utils/managed-bracket";
import { sortBracketRoundsByFlow } from "./bracket-round-order";

export function isChampionshipRoundMeta(round: BracketRoundMeta): boolean {
  if (round.side === "grand") return true;
  const label = round.label.trim();
  if (/^final$/i.test(label)) return true;
  if (/playoffs?\s*[—-]\s*final/i.test(label)) return true;
  if (/third place/i.test(label)) return true;
  return false;
}

export function championshipRoundVariant(
  round: BracketRoundMeta,
): "final" | "third" | "grand" {
  if (/third place/i.test(round.label)) return "third";
  if (round.side === "grand") return "grand";
  return "final";
}

export function partitionChampionshipRounds(roundMetas: BracketRoundMeta[]): {
  bracketRounds: BracketRoundMeta[];
  championshipRounds: BracketRoundMeta[];
} {
  const sorted = sortBracketRoundsByFlow(
    roundMetas.filter((round) => round.side !== "grand"),
  );
  const championshipRounds = sorted.filter(isChampionshipRoundMeta);
  const championshipIds = new Set(championshipRounds.map((round) => round.id));
  const bracketRounds = sorted.filter((round) => !championshipIds.has(round.id));

  return { bracketRounds, championshipRounds };
}

export function isPublicChampionshipRound(round: BracketRound): boolean {
  if (isGrandFinalRoundLabel(round.label)) return true;
  const label = round.label.trim();
  if (/^final$/i.test(label)) return true;
  if (/playoffs?\s*[—-]\s*final/i.test(label)) return true;
  if (/third place/i.test(label)) return true;
  return false;
}

function isGrandFinalRoundLabel(label: string): boolean {
  return /grand/i.test(label);
}

export function publicChampionshipRoundVariant(round: BracketRound): "final" | "third" | "grand" {
  if (/third place/i.test(round.label)) return "third";
  if (isGrandFinalRoundLabel(round.label)) return "grand";
  return "final";
}

export function partitionPublicChampionshipRounds(rounds: BracketRound[]): {
  bracketRounds: BracketRound[];
  championshipRounds: BracketRound[];
} {
  const sorted = sortBracketRoundsByFlow(
    rounds.filter((round) => !isGrandFinalRoundLabel(round.label)),
  );
  const championshipRounds = sorted.filter(isPublicChampionshipRound);
  const championshipLabels = new Set(championshipRounds.map((round) => round.label));
  const bracketRounds = sorted.filter((round) => !championshipLabels.has(round.label));

  return { bracketRounds, championshipRounds };
}
