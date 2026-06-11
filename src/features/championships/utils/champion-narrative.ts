import type { HallOfChampionRecord } from "../types";

export function formatChampionDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatChampionLongDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function buildChampionNarrative(champion: HallOfChampionRecord): string {
  if (champion.story?.trim()) return champion.story.trim();

  const crownLabel =
    champion.crownVariant === "grand" ? "Grand Finals" : "the championship bracket";
  const date = formatChampionLongDate(champion.crownedAt);
  const mvpLine = champion.mvp
    ? ` ${champion.mvp} was named MVP after a standout performance in the decisive series.`
    : "";

  return `${champion.teamName} carved their name into the Black Rose archive at ${champion.tournamentName}. On ${date}, they emerged from ${crownLabel} as ${champion.game} champions — a roster that held the line when every round mattered.${mvpLine} Their crown is now part of the permanent legacy.`;
}

export function crownVariantLabel(variant: HallOfChampionRecord["crownVariant"]): string {
  return variant === "grand" ? "Grand Finals Champion" : "Tournament Champion";
}
