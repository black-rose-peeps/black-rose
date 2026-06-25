export function formatRegistrationDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function compareRegistrationDates(a: string, b: string): number {
  const timeA = new Date(a).getTime();
  const timeB = new Date(b).getTime();
  const safeA = Number.isNaN(timeA) ? Number.NEGATIVE_INFINITY : timeA;
  const safeB = Number.isNaN(timeB) ? Number.NEGATIVE_INFINITY : timeB;
  if (safeA !== safeB) return safeA - safeB;
  return a.localeCompare(b);
}
