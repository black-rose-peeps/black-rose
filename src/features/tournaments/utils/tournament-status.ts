import type { MockTournament, TournamentStatus } from "@/lib/mock-data";

/** Tournament has finished — no longer live or accepting changes in public UI copy. */
export function isTournamentConcluded(status: string): boolean {
  return status === "Completed" || status === "Archived";
}

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Normalize date-only tournament fields (YYYY-MM-DD). Returns "" when invalid. */
export function tournamentDateOnly(value: string): string {
  const dateOnly = value.trim().slice(0, 10);
  if (!ISO_DATE_ONLY.test(dateOnly)) return "";

  const [year, month, day] = dateOnly.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return "";
  }

  return dateOnly;
}

/** Today's calendar date in the local timezone (YYYY-MM-DD). */
export function calendarTodayDateOnly(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** @deprecated Prefer calendarTodayDateOnly — deadlines follow the admin's local calendar day. */
export function utcTodayDateOnly(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * True once the registration deadline calendar day has ended (local time).
 * The deadline date itself remains open through end of that local day.
 */
export function isRegistrationDeadlinePassed(
  registrationDeadline: string,
  now = new Date(),
): boolean {
  const deadline = tournamentDateOnly(registrationDeadline);
  if (!deadline) return false;
  return calendarTodayDateOnly(now) > deadline;
}

/** Effective status — closes registration after the deadline even if DB is stale. */
export function resolveTournamentStatus(
  tournament: Pick<MockTournament, "status" | "registrationDeadline">,
  now = new Date(),
): TournamentStatus {
  if (
    tournament.status === "Registration Open" &&
    isRegistrationDeadlinePassed(tournament.registrationDeadline, now)
  ) {
    return "Registration Closed";
  }
  return tournament.status;
}

export function isRegistrationOpen(
  tournament: Pick<MockTournament, "status" | "registrationDeadline">,
  now = new Date(),
): boolean {
  return resolveTournamentStatus(tournament, now) === "Registration Open";
}

export function isRegistrationDeadlineExtended(
  previousDeadline: string,
  nextDeadline: string,
): boolean {
  return tournamentDateOnly(nextDeadline) > tournamentDateOnly(previousDeadline);
}

/** Statuses that must not be auto-reopened when an admin extends the deadline. */
export function blocksRegistrationReopen(status: TournamentStatus | string): boolean {
  return (
    status === "Draft" ||
    status === "Live" ||
    status === "Completed" ||
    status === "Archived"
  );
}

/** Apply deadline-based status for display and client-side registration checks. */
export function withResolvedTournamentStatus(tournament: MockTournament): MockTournament {
  return {
    ...tournament,
    status: resolveTournamentStatus(tournament),
  };
}
