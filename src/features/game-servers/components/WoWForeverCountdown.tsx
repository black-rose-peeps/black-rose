import { WOW_FOREVER_LAUNCH_AT, type LaunchCountdown } from "../utils/wow-forever-launch";

export function WoWForeverCountdown({
  label,
  countdown,
}: {
  label: string;
  countdown: LaunchCountdown;
}) {
  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`${label} launch countdown: ${countdown.days} days, ${countdown.hours} hours, ${countdown.minutes} minutes, ${countdown.seconds} seconds`}
      className="max-w-sm"
    >
      <p className="text-xs text-muted-foreground">Launch countdown</p>
      <dl className="my-4 grid grid-cols-4 gap-4 tabular-nums">
        {(
          [
            ["days", countdown.days],
            ["hours", countdown.hours],
            ["minutes", countdown.minutes],
            ["seconds", countdown.seconds],
          ] as const
        ).map(([unit, value]) => (
          <div key={unit} className="flex min-w-0 flex-col">
            <dt className="order-2 mt-1 text-xs text-muted-foreground">{unit}</dt>
            <dd className="order-1 text-3xl leading-tight font-medium sm:text-4xl">
              {String(value).padStart(2, "0")}
            </dd>
          </div>
        ))}
      </dl>
      <time
        dateTime={WOW_FOREVER_LAUNCH_AT}
        className="block text-xs leading-relaxed text-muted-foreground"
      >
        November 5, 2026 · 7:00 AM Philippine time
      </time>
    </div>
  );
}
