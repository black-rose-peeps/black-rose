import { formatRegistrationDateTime } from "@/features/admin/utils/registration-date";

export function formatLogTimestamp(value: string): string {
  return formatRegistrationDateTime(value);
}
