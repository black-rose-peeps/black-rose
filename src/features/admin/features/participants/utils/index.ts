import type { MockTeam } from "@/lib/mock-data";
import {
  compareRegistrationDates,
  formatRegistrationDateTime,
} from "@/features/admin/utils/registration-date";

export { compareRegistrationDates, formatRegistrationDateTime as formatParticipantRegistrationDate };

export function registrationStatusVariant(
  status: MockTeam["status"],
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "Approved":
      return "default";
    case "Pending":
      return "secondary";
    case "Previously Competed":
      return "outline";
    case "Rejected":
      return "destructive";
    default:
      return "outline";
  }
}
