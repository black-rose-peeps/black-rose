import type { ManagedMatch } from "./managed-bracket";

const GRAND_FINAL_MATCH_ID = "gf-m0";
const GRAND_FINAL_RESET_MATCH_ID = "gf-reset-m0";

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
export function resolveGrandFinalChampion(matches: ManagedMatch[]): string | null {
  const reset = matches.find(
    (match) => match.id === GRAND_FINAL_RESET_MATCH_ID && match.confirmed && match.winner,
  );
  if (reset?.winner) return reset.winner;

  const gf = matches.find(
    (match) => match.id === GRAND_FINAL_MATCH_ID && match.confirmed && match.winner,
  );
  if (!gf?.winner) return null;

  if (grandFinalResetPending(matches)) return null;

  return gf.winner;
}

export function resolveGrandFinalRunnerUp(matches: ManagedMatch[]): string | null {
  const deciding =
    matches.find(
      (match) => match.id === GRAND_FINAL_RESET_MATCH_ID && match.confirmed && match.winner,
    ) ??
    matches.find((match) => match.id === GRAND_FINAL_MATCH_ID && match.confirmed && match.winner);

  if (!deciding?.winner || !deciding.teamA || !deciding.teamB) return null;
  return deciding.winner === deciding.teamA ? deciding.teamB : deciding.teamA;
}
