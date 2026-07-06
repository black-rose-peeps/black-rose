export type RoundVenueType = "online" | "onsite";

/** Per-round schedule configured by staff in the bracket manager. */
export interface RoundSchedule {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Optional 24h time (HH:mm). Omitted from public copy when empty. */
  time?: string;
  venueType?: RoundVenueType;
  /** Required when `venueType` is `onsite`. */
  location?: string;
}

export function isRoundScheduleConfigured(
  schedule: RoundSchedule | undefined,
): schedule is RoundSchedule {
  return !!schedule?.date?.trim();
}

export function hasAnyRoundSchedule(
  roundSchedules: Record<string, RoundSchedule> | undefined,
): boolean {
  if (!roundSchedules) return false;
  return Object.values(roundSchedules).some(isRoundScheduleConfigured);
}

export function normalizeRoundSchedule(
  schedule: RoundSchedule | undefined,
): RoundSchedule | undefined {
  if (!schedule?.date?.trim()) return undefined;

  const normalized: RoundSchedule = {
    date: schedule.date.trim(),
    time: schedule.time?.trim() || undefined,
    venueType: schedule.venueType,
    location:
      schedule.location != null && schedule.location.trim().length > 0
        ? schedule.location.trim()
        : undefined,
  };

  if (normalized.venueType === "onsite" && !normalized.location) {
    normalized.venueType = undefined;
  }

  return normalized;
}

export function formatRoundScheduleDate(schedule: RoundSchedule): string {
  const parts = formatRoundScheduleParts(schedule);
  if (!parts) return schedule.date;
  if (!parts.timeLabel) return parts.dateLine;
  return `${parts.dateLine} · ${parts.timeLabel}`;
}

export function formatRoundScheduleParts(schedule: RoundSchedule): {
  weekday: string;
  monthDay: string;
  year: string;
  dateLine: string;
  timeLabel: string | null;
} | null {
  const dateValue = schedule.time?.trim()
    ? `${schedule.date}T${schedule.time}:00`
    : `${schedule.date}T12:00:00`;
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return null;

  const weekday = new Intl.DateTimeFormat("en-PH", { weekday: "short" }).format(parsed);
  const monthDay = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  }).format(parsed);
  const year = new Intl.DateTimeFormat("en-PH", { year: "numeric" }).format(parsed);
  const dateLine = new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);

  const timeLabel = schedule.time?.trim()
    ? new Intl.DateTimeFormat("en-PH", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(parsed)
    : null;

  return { weekday, monthDay, year, dateLine, timeLabel };
}

/** Value for `<input type="datetime-local" />`. */
export function toDateTimeLocalValue(schedule?: RoundSchedule): string {
  if (!schedule?.date?.trim()) return "";
  const time = schedule.time?.trim() || "00:00";
  return `${schedule.date}T${time}`;
}

export function fromDateTimeLocalValue(
  value: string,
  includeTime: boolean,
): Pick<RoundSchedule, "date" | "time"> | null {
  if (!value.trim()) return null;
  const [date, rawTime] = value.split("T");
  if (!date) return null;
  const time = includeTime && rawTime && rawTime !== "00:00" ? rawTime.slice(0, 5) : undefined;
  return { date, time };
}

export function formatRoundScheduleSummary(schedule: RoundSchedule): string {
  const parts = formatRoundScheduleParts(schedule);
  if (!parts) return schedule.date;
  return parts.timeLabel ? `${parts.monthDay} · ${parts.timeLabel}` : parts.monthDay;
}

export type ScheduleTimeParts = {
  hour12: number;
  minute: number;
  period: "AM" | "PM";
};

const DEFAULT_SCHEDULE_TIME: ScheduleTimeParts = { hour12: 12, minute: 0, period: "PM" };

export function parseScheduleTime(time?: string): ScheduleTimeParts {
  if (!time?.trim()) return DEFAULT_SCHEDULE_TIME;

  const [hourRaw, minuteRaw] = time.split(":");
  const hour24 = Number.parseInt(hourRaw ?? "", 10);
  const minute = Number.parseInt(minuteRaw ?? "", 10);
  if (Number.isNaN(hour24) || Number.isNaN(minute)) return DEFAULT_SCHEDULE_TIME;

  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return { hour12, minute, period };
}

export function buildScheduleTime(parts: ScheduleTimeParts): string {
  let hour24 = parts.hour12 % 12;
  if (parts.period === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export function parseScheduleDate(date?: string): Date | undefined {
  if (!date?.trim()) return undefined;
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function toScheduleDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function pruneRoundSchedules(
  roundSchedules: Record<string, RoundSchedule>,
  roundMetas: Array<{ id: string }>,
): Record<string, RoundSchedule> {
  const ids = new Set(roundMetas.map((meta) => meta.id));
  const next = { ...roundSchedules };
  for (const roundId of Object.keys(next)) {
    if (!ids.has(roundId)) delete next[roundId];
  }
  return next;
}

export function roundVenueLabel(venueType: RoundVenueType | undefined): string | null {
  switch (venueType) {
    case "online":
      return "Online";
    case "onsite":
      return "On-site";
    default:
      return null;
  }
}
