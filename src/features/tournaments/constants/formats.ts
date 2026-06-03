/** Bracket structure options for tournament creation. */
export type TournamentFormat = "Single Elimination" | "Double Elimination";

export const TOURNAMENT_FORMATS: {
  value: TournamentFormat;
  label: string;
  description: string;
}[] = [
  {
    value: "Single Elimination",
    label: "Single Elimination",
    description: "One loss and you're out. Uses the bracket manager for 16-team brackets.",
  },
  {
    value: "Double Elimination",
    label: "Double Elimination",
    description:
      "Upper and lower brackets — teams get a second chance after one loss. Bracket UI coming soon.",
  },
];

export function isSingleEliminationFormat(format: string): boolean {
  return format === "Single Elimination";
}

export function isDoubleEliminationFormat(format: string): boolean {
  return format === "Double Elimination" || format.toLowerCase().includes("double");
}
