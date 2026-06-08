import type { MockTeam, TournamentStatus } from "@/lib/mock-data";
import { isTournamentConcluded } from "@/features/tournaments/utils/tournament-status";

export type RegistrationStatus = MockTeam["status"];

/** Statuses that may require admin review while the target event is still active. */
export const REVIEW_QUEUE_STATUSES: RegistrationStatus[] = ["Pending", "Previously Competed"];

export function isReviewQueueStatus(status: RegistrationStatus): boolean {
  return REVIEW_QUEUE_STATUSES.includes(status);
}

/** Entrants that count toward bracket seeding (including after event completion). */
export function isBracketParticipantStatus(status: RegistrationStatus): boolean {
  return status === "Approved" || status === "Previously Competed";
}

/** Pending / veteran review only applies to open or live events — not after the event ends. */
export function registrationNeedsReview(
  registrationStatus: RegistrationStatus,
  tournamentStatus: TournamentStatus | string | null,
): boolean {
  if (!tournamentStatus) return false;
  if (!isReviewQueueStatus(registrationStatus)) return false;
  return !isTournamentConcluded(tournamentStatus);
}

/** Approve / reject controls stay available on active events (including after a reject). */
export function registrationActionsEnabled(
  tournamentStatus: TournamentStatus | string | null,
): boolean {
  if (!tournamentStatus) return false;
  return !isTournamentConcluded(tournamentStatus);
}

/** Higher = more likely to need a decision — used for Actions column sort. */
export function registrationActionPriority(
  registrationStatus: RegistrationStatus,
  tournamentStatus: TournamentStatus | string | null,
): number {
  if (!registrationActionsEnabled(tournamentStatus)) return 0;
  if (registrationStatus === "Pending" || registrationStatus === "Previously Competed") return 3;
  if (registrationStatus === "Rejected") return 2;
  if (registrationStatus === "Approved") return 1;
  return 0;
}

export const REGISTRATION_STATUS_SORT_ORDER: RegistrationStatus[] = [
  "Pending",
  "Previously Competed",
  "Approved",
  "Rejected",
];
