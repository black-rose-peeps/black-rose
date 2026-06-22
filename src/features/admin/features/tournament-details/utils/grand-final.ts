import type { ManagedMatch } from "./managed-bracket";

const GRAND_FINAL_MATCH_ID = "gf-m0";
const GRAND_FINAL_RESET_MATCH_ID = "gf-reset-m0";

export { GRAND_FINAL_MATCH_ID, GRAND_FINAL_RESET_MATCH_ID };

/** How the championship match is decided in double elimination. */
export type GrandFinalMode = "two_matches" | "one_match" | "none";

export const DEFAULT_GRAND_FINAL_MODE: GrandFinalMode = "two_matches";

export function resolveStoredGrandFinalMode(
  roundMetaIds: string[],
  stored?: GrandFinalMode | null,
): GrandFinalMode {
  if (stored) return stored;
  return roundMetaIds.includes("gf") ? DEFAULT_GRAND_FINAL_MODE : "none";
}

export const GRAND_FINAL_MODE_OPTIONS: ReadonlyArray<{
  value: GrandFinalMode;
  label: string;
  description: string;
}> = [
  {
    value: "two_matches",
    label: "1–2 matches",
    description:
      "Winners bracket finalist must be defeated twice by the losers bracket finalist.",
  },
  {
    value: "one_match",
    label: "1 match",
    description: "A single grand final decides the champion — no bracket reset.",
  },
  {
    value: "none",
    label: "None",
    description:
      "No grand final — the upper bracket winner is crowned when they win the upper final.",
  },
];

export function grandFinalResetPending(matches: ManagedMatch[]): boolean {
  const gf = matches.find((match) => match.id === GRAND_FINAL_MATCH_ID);
  const reset = matches.find((match) => match.id === GRAND_FINAL_RESET_MATCH_ID);
  return (
    !!gf?.confirmed &&
    !!gf.winner &&
    !!gf.teamB &&
    gf.winner === gf.teamB &&
    !!reset &&
    !reset.confirmed
  );
}

/** Tournament champion from Grand Final (reset match takes priority). */
export function resolveGrandFinalChampion(
  matches: ManagedMatch[],
  mode: GrandFinalMode = DEFAULT_GRAND_FINAL_MODE,
): string | null {
  if (mode === "none") {
    const upperFinal = matches.find(
      (match) => match.id === "ub-f-m0" && match.confirmed && match.winner,
    );
    return upperFinal?.winner ?? null;
  }

  const reset = matches.find(
    (match) => match.id === GRAND_FINAL_RESET_MATCH_ID && match.confirmed && match.winner,
  );
  if (reset?.winner) return reset.winner;

  const gf = matches.find(
    (match) => match.id === GRAND_FINAL_MATCH_ID && match.confirmed && match.winner,
  );
  if (!gf?.winner) return null;

  if (mode === "two_matches" && grandFinalResetPending(matches)) return null;

  return gf.winner;
}

export function resolveGrandFinalRunnerUp(
  matches: ManagedMatch[],
  mode: GrandFinalMode = DEFAULT_GRAND_FINAL_MODE,
): string | null {
  if (mode === "none") {
    const lowerFinal = matches.find(
      (match) => match.roundId === "lb-f" && match.confirmed && match.winner,
    );
    return lowerFinal?.winner ?? null;
  }

  const deciding =
    matches.find(
      (match) => match.id === GRAND_FINAL_RESET_MATCH_ID && match.confirmed && match.winner,
    ) ??
    matches.find((match) => match.id === GRAND_FINAL_MATCH_ID && match.confirmed && match.winner);

  if (!deciding?.winner || !deciding.teamA || !deciding.teamB) return null;
  return deciding.winner === deciding.teamA ? deciding.teamB : deciding.teamA;
}
