import type { MockTeam, TournamentStatus } from "@/lib/mock-data";
import { isTournamentConcluded } from "@/features/tournaments/utils/tournament-status";

export type RegistrationStatus = MockTeam["status"];

/** Statuses that may require admin review while the target event is still active. */
export const REVIEW_QUEUE_STATUSES: RegistrationStatus[] = ["Pending", "Previously Competed"];

export function isReviewQueueStatus(status: RegistrationStatus): boolean {
  return REVIEW_QUEUE_STATUSES.includes(status);
}

/** Rows that can be bulk-approved from the participants queue. */
export function canBulkApproveParticipant(
  registrationStatus: RegistrationStatus,
  tournamentStatus: TournamentStatus | string | null,
): boolean {
  return registrationActionsEnabled(tournamentStatus) && isReviewQueueStatus(registrationStatus);
}

/** Registrations that occupy a tournament slot / teams_registered / registration cap. */
export function isSlotCountedRegistrationStatus(status: RegistrationStatus): boolean {
  return status === "Approved";
}

export function countSlotFilledRegistrations(
  registrations: ReadonlyArray<{ status: RegistrationStatus }>,
): number {
  return registrations.filter((registration) =>
    isSlotCountedRegistrationStatus(registration.status),
  ).length;
}

/** Entrants that count toward bracket seeding (including after event completion). */
export function isBracketParticipantStatus(status: RegistrationStatus): boolean {
  return status === "Approved" || status === "Previously Competed";
}

export function countBracketParticipantRegistrations(
  registrations: ReadonlyArray<{ status: RegistrationStatus }>,
): number {
  return registrations.filter((registration) => isBracketParticipantStatus(registration.status))
    .length;
}

/** Slot fill during registration; full entrant count after the event concludes. */
export function countDisplayedTournamentEntrants(
  registrations: ReadonlyArray<{ status: RegistrationStatus }>,
  tournamentStatus: TournamentStatus | string,
): number {
  if (isTournamentConcluded(tournamentStatus)) {
    return countBracketParticipantRegistrations(registrations);
  }
  return countSlotFilledRegistrations(registrations);
}

/** Entrants that may seed a bracket for the given tournament phase. */
export function isBracketSeedingStatus(
  status: RegistrationStatus,
  tournamentStatus: TournamentStatus | string,
): boolean {
  if (isTournamentConcluded(tournamentStatus)) {
    return isBracketParticipantStatus(status);
  }
  return status === "Approved";
}

/** True when Pending / Previously Competed entries still need a decision on an active event. */
export function tournamentHasUnresolvedRegistrations(
  registrations: ReadonlyArray<{ status: RegistrationStatus }>,
  tournamentStatus: TournamentStatus | string,
): boolean {
  if (isTournamentConcluded(tournamentStatus)) return false;
  return registrations.some((registration) =>
    registrationNeedsReview(registration.status, tournamentStatus),
  );
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
