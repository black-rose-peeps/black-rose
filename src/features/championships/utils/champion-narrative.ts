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

export function crownVariantLabel(variant: HallOfChampionRecord["crownVariant"]): string {
  return variant === "grand" ? "Grand Finals Champion" : "Tournament Champion";
}

/**
 * Builds the Legacy File narrative for a champion record.
 *
 * If a custom `story` is set by admin, that always takes priority.
 * Otherwise, two distinct auto-generated templates are used based on venue:
 *  - onsite  → anchored in place, physicality, LAN energy
 *  - online  → digital battlefield, latency as the only opponent
 *  - unknown → neutral fallback that still reads Black Rose
 */
export function buildChampionNarrative(champion: HallOfChampionRecord): string {
  if (champion.story?.trim()) return champion.story.trim();

  const date = formatChampionLongDate(champion.crownedAt);
  const isGrand = champion.crownVariant === "grand";
  const mvpLine = champion.mvp
    ? ` ${champion.mvp} stood above the rest — named MVP for a performance that defined the series.`
    : "";

  // ── Onsite / LAN template ───────────────────────────────────────────────
  if (champion.venueType === "onsite") {
    const location = champion.venueLocation?.trim();
    const venueLine = location
      ? ` The event was held at ${location}.`
      : " The venue was packed, the crowd locked in.";

    const finalLine = isGrand
      ? `They didn't flinch. Not at match point, not in overtime — not once. The Grand Finals stage belonged to them.`
      : `Match by match, they outplayed every opponent that stood in their way. When the final series ended, the answer was clear.`;

    return (
      `On ${date}, ${champion.teamName} stepped into the Black Rose arena and didn't leave without the crown.` +
      `${venueLine} ` +
      `Under the ${champion.game} bracket at ${champion.tournamentName}, they competed for every point, every round, every moment.` +
      ` ${finalLine}` +
      `${mvpLine}` +
      ` The name is now etched — permanent, uncontested, Black Rose certified.`
    );
  }

  // ── Online template ─────────────────────────────────────────────────────
  if (champion.venueType === "online") {
    const finalLine = isGrand
      ? `The Grand Finals became their stage. No crowd, no noise — just precision, focus, and a performance that held when it counted most.`
      : `Every series was a test of consistency and nerve. They answered every one.`;

    return (
      `${champion.teamName} proved that distance is irrelevant when the read is right.` +
      ` Across the ${champion.game} bracket at ${champion.tournamentName}, they logged in and left their mark on ${date}.` +
      ` ${finalLine}` +
      `${mvpLine}` +
      ` Their crown was earned in the digital arena — filed now as part of the Black Rose permanent record.`
    );
  }

  // ── Neutral fallback ────────────────────────────────────────────────────
  const finalLine = isGrand
    ? `They emerged from Grand Finals as ${champion.game} champions — a performance that held the line when every round mattered.`
    : `They outlasted every opponent in the bracket and claimed the crown when it was on the line.`;

  return (
    `${champion.teamName} carved their name into the Black Rose archive at ${champion.tournamentName}.` +
    ` On ${date}, ${finalLine}` +
    `${mvpLine}` +
    ` Their crown is now part of the permanent legacy.`
  );
}
