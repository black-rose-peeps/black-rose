import { ArrowUpRight, Calendar, Clock, MapPin, Monitor } from "lucide-react";
import { DISCORD_SERVER_INVITE } from "@/features/auth/constants";
import { DiscordAppAnchor } from "@/features/shared/components/DiscordAppAnchor";
import type { RoundSchedule } from "@/features/admin/features/tournament-details/utils/managed-bracket";
import { cn } from "@/lib/utils";
import {
  formatRoundScheduleParts,
  isRoundScheduleConfigured,
} from "@/features/tournaments/utils/round-schedule";

type ScheduleDisplayVariant = "column" | "card" | "grand";

interface BracketRoundScheduleDisplayProps {
  schedule?: RoundSchedule;
  /** @deprecated use variant="column" */
  compact?: boolean;
  variant?: ScheduleDisplayVariant;
  label?: string;
  className?: string;
}

export function BracketRoundScheduleDisplay({
  schedule,
  compact = false,
  variant,
  label,
  className,
}: BracketRoundScheduleDisplayProps) {
  if (!isRoundScheduleConfigured(schedule)) return null;

  const parts = formatRoundScheduleParts(schedule!);
  if (!parts) return null;

  const resolvedVariant: ScheduleDisplayVariant = variant ?? (compact ? "column" : "card");
  const isOnline = schedule!.venueType === "online";
  const isOnsite = schedule!.venueType === "onsite";

  if (resolvedVariant === "column") {
    return (
      <ColumnScheduleStrip
        schedule={schedule!}
        parts={parts}
        isOnline={isOnline}
        isOnsite={isOnsite}
        className={className}
      />
    );
  }

  if (resolvedVariant === "grand") {
    return (
      <GrandFinalSchedulePanel
        schedule={schedule!}
        parts={parts}
        isOnline={isOnline}
        isOnsite={isOnsite}
        label={label}
        className={className}
      />
    );
  }

  return (
    <CardScheduleDisplay
      schedule={schedule!}
      parts={parts}
      isOnline={isOnline}
      isOnsite={isOnsite}
      className={className}
    />
  );
}

function ColumnScheduleStrip({
  schedule,
  parts,
  isOnline,
  isOnsite,
  className,
}: {
  schedule: RoundSchedule;
  parts: NonNullable<ReturnType<typeof formatRoundScheduleParts>>;
  isOnline: boolean;
  isOnsite: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border border-border/50 bg-card/90 px-2 py-1.5 text-center shadow-sm",
        isOnline && "border-[#5865F2]/20 bg-[#5865F2]/5",
        isOnsite && "border-amber-400/20 bg-amber-400/5",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-primary/40 to-transparent" />
      <p className="font-tech text-[11px] font-semibold uppercase leading-snug tracking-wider text-foreground/90">
        {parts.weekday} {parts.monthDay}
        {parts.timeLabel ? ` · ${parts.timeLabel}` : ""}
      </p>
      {isOnline && (
        <DiscordAppAnchor
          discordUrl={DISCORD_SERVER_INVITE}
          className="mt-0.5 inline-flex items-center gap-0.5 font-tech text-[9px] uppercase tracking-wider text-[#aeb7ff] hover:text-[#c5cbff]"
        >
          <Monitor className="h-3 w-3" />
          Discord
        </DiscordAppAnchor>
      )}
      {isOnsite && schedule.location && (
        <div className="mt-0.5 inline-flex items-start gap-0.5 font-tech text-[9px] uppercase tracking-wider text-amber-300/90">
          <MapPin className="h-3 w-3 shrink-0" />
          <p className="break-words">{schedule.location}</p>
        </div>
      )}
    </div>
  );
}

function GrandFinalSchedulePanel({
  schedule,
  parts,
  isOnline,
  isOnsite,
  label,
  className,
}: {
  schedule: RoundSchedule;
  parts: NonNullable<ReturnType<typeof formatRoundScheduleParts>>;
  isOnline: boolean;
  isOnsite: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden border border-amber-400/25 bg-amber-400/[0.07] px-3 py-2.5 text-center",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.1]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-amber-300/70 via-amber-400/20 to-transparent" />

      <div className="relative space-y-1.5">
        {label && (
          <p className="font-tech text-[9px] font-bold uppercase tracking-[0.16em] text-amber-300/90">
            {label}
          </p>
        )}
        <div className="flex items-center justify-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-amber-200/80" />
          <p className="font-display text-sm font-semibold tracking-display text-amber-50">
            {parts.dateLine}
          </p>
        </div>
        {parts.timeLabel && (
          <div className="inline-flex items-center gap-1.5 rounded border border-amber-400/20 bg-amber-400/10 px-2 py-0.5">
            <Clock className="h-3 w-3 text-amber-200/80" />
            <span className="font-tech text-[10px] font-semibold uppercase tracking-wider text-amber-100">
              {parts.timeLabel}
            </span>
          </div>
        )}
        {isOnline && (
          <DiscordAppAnchor
            discordUrl={DISCORD_SERVER_INVITE}
            className="inline-flex items-center justify-center gap-1.5 font-tech text-[10px] uppercase tracking-wider text-[#c5cbff] transition-colors hover:text-[#dfe3ff]"
          >
            <Monitor className="h-3.5 w-3.5" />
            Play on Black Rose Discord
            <ArrowUpRight className="h-3 w-3 opacity-80" />
          </DiscordAppAnchor>
        )}
        {isOnsite && (
          <div className="flex items-start justify-center gap-1.5 text-left">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/90" />
            <div className="min-w-0">
              <p className="font-tech text-[9px] uppercase tracking-wider text-amber-300/90">
                On-site venue
              </p>
              {schedule.location ? (
                <p className="mt-0.5 text-xs leading-snug text-foreground/90">
                  {schedule.location}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CardScheduleDisplay({
  schedule,
  parts,
  isOnline,
  isOnsite,
  className,
}: {
  schedule: RoundSchedule;
  parts: NonNullable<ReturnType<typeof formatRoundScheduleParts>>;
  isOnline: boolean;
  isOnsite: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border px-3 py-2.5 text-left shadow-[0_1px_0_rgba(255,255,255,0.04)]",
        isOnline
          ? "border-[#5865F2]/25 bg-gradient-to-br from-[#5865F2]/10 via-card to-card"
          : isOnsite
            ? "border-amber-400/25 bg-gradient-to-br from-amber-400/10 via-card to-card"
            : "border-border/60 bg-gradient-to-br from-primary/5 via-card to-card",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.12]" />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b to-transparent",
          isOnline ? "from-[#5865F2]/70" : isOnsite ? "from-amber-400/70" : "from-primary/50",
        )}
      />

      <div className="relative space-y-1.5">
        <div className="flex items-start gap-2">
          <Calendar
            className={cn(
              "mt-0.5 h-3.5 w-3.5 shrink-0",
              isOnline ? "text-[#aeb7ff]" : isOnsite ? "text-amber-300/90" : "text-primary/80",
            )}
          />
          <div className="min-w-0 flex-1">
            <p className="font-tech text-[9px] uppercase leading-none tracking-wider-2 text-muted-foreground">
              {parts.weekday}
            </p>
            <p className="mt-0.5 font-display text-xs font-semibold leading-tight tracking-display text-foreground">
              {parts.monthDay}
            </p>
            <p className="font-tech text-[8px] uppercase tracking-wider text-muted-foreground/80">
              {parts.year}
            </p>
          </div>
        </div>

        {parts.timeLabel && (
          <div className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5">
            <Clock className="h-2.5 w-2.5 text-foreground/70" />
            <span className="font-tech text-[9px] font-semibold uppercase tracking-wider text-foreground/90">
              {parts.timeLabel}
            </span>
          </div>
        )}

        {isOnline && (
          <DiscordAppAnchor
            discordUrl={DISCORD_SERVER_INVITE}
            className="inline-flex items-center gap-1 font-tech text-[9px] uppercase tracking-wider text-[#aeb7ff] transition-colors hover:text-[#c5cbff]"
          >
            <Monitor className="h-2.5 w-2.5" />
            Online · Discord
            <ArrowUpRight className="h-2.5 w-2.5 opacity-70" />
          </DiscordAppAnchor>
        )}

        {isOnsite && (
          <div className="flex items-start gap-1">
            <MapPin className="mt-0.5 h-2.5 w-2.5 shrink-0 text-amber-300/90" />
            <div className="min-w-0">
              <p className="font-tech text-[9px] uppercase tracking-wider text-amber-300/90">
                On-site
              </p>
              {schedule.location ? (
                <p className="mt-0.5 text-[10px] leading-snug text-foreground/85">
                  {schedule.location}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
