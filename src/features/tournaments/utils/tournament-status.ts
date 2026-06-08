/** Tournament has finished — no longer live or accepting changes in public UI copy. */
export function isTournamentConcluded(status: string): boolean {
  return status === "Completed" || status === "Archived";
}
