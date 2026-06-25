/** Bracket structure options for tournament creation. */
export type TournamentFormat = "Single Elimination" | "Double Elimination" | "Swiss System";

export const TOURNAMENT_FORMATS: {
  value: TournamentFormat;
  label: string;
  description: string;
}[] = [
  {
    value: "Single Elimination",
    label: "Single Elimination",
    description: "One loss and you're out. Best for power-of-2 team counts.",
  },
  {
    value: "Double Elimination",
    label: "Double Elimination",
    description: "Upper and lower brackets — teams get a second chance after one loss.",
  },
  {
    value: "Swiss System",
    label: "Swiss System",
    description:
      "Teams with similar records face each other each round. 3 wins advance, 3 losses eliminated (16-team standard).",
  },
];

export function isSingleEliminationFormat(format: string): boolean {
  return format === "Single Elimination";
}

export function isDoubleEliminationFormat(format: string): boolean {
  return format === "Double Elimination" || format.toLowerCase().includes("double");
}

export function isSwissFormat(format: string): boolean {
  return format === "Swiss System" || format.toLowerCase().includes("swiss");
}

/** Win-loss standings tab applies to elimination brackets only (not Swiss). */
export function supportsEliminationStandings(format: string): boolean {
  return isSingleEliminationFormat(format) || isDoubleEliminationFormat(format);
}
