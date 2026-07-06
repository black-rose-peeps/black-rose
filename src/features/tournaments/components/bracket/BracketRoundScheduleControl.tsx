import { useEffect, useState } from "react";
import { CalendarClock, ChevronDown, MapPin, Monitor } from "lucide-react";
import { DISCORD_SERVER_INVITE } from "@/features/auth/constants";
import { DiscordAppAnchor } from "@/features/shared/components/DiscordAppAnchor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  RoundSchedule,
  RoundVenueType,
} from "@/features/admin/features/tournament-details/utils/managed-bracket";
import { cn } from "@/lib/utils";
import {
  buildScheduleTime,
  formatRoundScheduleSummary,
  isRoundScheduleConfigured,
  normalizeRoundSchedule,
  parseScheduleTime,
} from "@/features/tournaments/utils/round-schedule";
import { ScheduleDateTimePicker } from "./ScheduleDateTimePicker";

interface BracketRoundScheduleControlProps {
  value?: RoundSchedule;
  compact?: boolean;
  onChange: (schedule: RoundSchedule | undefined) => void;
}

export function BracketRoundScheduleControl({
  value,
  compact = false,
  onChange,
}: BracketRoundScheduleControlProps) {
  const [open, setOpen] = useState(false);
  const configured = isRoundScheduleConfigured(value);
  const [date, setDate] = useState(value?.date ?? "");
  const [time, setTime] = useState(value?.time ?? buildScheduleTime(parseScheduleTime()));
  const [includeTime, setIncludeTime] = useState(() => !!value?.time?.trim());
  const [venueType, setVenueType] = useState<RoundVenueType | undefined>(value?.venueType);
  const [location, setLocation] = useState(value?.location ?? "");

  useEffect(() => {
    if (open) return;
    setDate(value?.date ?? "");
    setTime(value?.time ?? buildScheduleTime(parseScheduleTime()));
    setIncludeTime(!!value?.time?.trim());
    setVenueType(value?.venueType);
    setLocation(value?.location ?? "");
  }, [value, open]);

  function commit(
    nextDate: string,
    nextTime: string,
    nextIncludeTime: boolean,
    nextVenue: RoundVenueType | undefined,
    nextLocation: string,
  ) {
    if (!nextDate.trim()) {
      onChange(undefined);
      return;
    }

    onChange(
      normalizeRoundSchedule({
        date: nextDate,
        time: nextIncludeTime ? nextTime : undefined,
        venueType: nextVenue,
        location: nextVenue === "onsite" ? nextLocation : undefined,
      }),
    );
  }

  function handleDateChange(nextDate: string) {
    setDate(nextDate);
    commit(nextDate, time, includeTime, venueType, location);
  }

  function handleTimeChange(nextTime: string) {
    setTime(nextTime);
    if (date) commit(date, nextTime, includeTime, venueType, location);
  }

  function handleIncludeTimeChange(checked: boolean) {
    setIncludeTime(checked);
    if (date) commit(date, time, checked, venueType, location);
  }

  function handleVenueChange(next: RoundVenueType) {
    setVenueType(next);
    if (date) commit(date, time, includeTime, next, location);
  }

  function handleLocationChange(next: string) {
    setLocation(next);
  }

  function commitLocation() {
    if (date && venueType === "onsite") {
      commit(date, time, includeTime, venueType, location);
    }
  }

  function clearSchedule() {
    setDate("");
    setTime(buildScheduleTime(parseScheduleTime()));
    setIncludeTime(false);
    setVenueType(undefined);
    setLocation("");
    onChange(undefined);
    setOpen(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && open) {
      commitLocation();
    }
    setOpen(nextOpen);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-bracket-interactive
          onPointerDown={(event) => event.stopPropagation()}
          className={cn(
            "h-auto w-full justify-between gap-1.5 px-2 font-normal",
            configured
              ? "border-primary/35 bg-primary/8 hover:border-primary/50 hover:bg-primary/12"
              : "border-dashed border-border/80 bg-background/50 hover:bg-secondary/30",
            compact && "py-1",
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <CalendarClock
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                configured ? "text-primary/90" : "text-muted-foreground",
              )}
            />
            <span
              className={cn(
                "truncate font-tech text-[9px] uppercase tracking-wider",
                configured ? "text-foreground/90" : "text-muted-foreground",
              )}
            >
              {configured && value ? formatRoundScheduleSummary(value) : "Set schedule"}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-3 w-3 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="center"
        side="bottom"
        className="w-auto max-w-[calc(100vw-2rem)] border-border/80 bg-card p-0 shadow-xl"
        data-bracket-interactive
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <div className="relative overflow-hidden border-b border-border/70 bg-secondary/20 px-4 py-3">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-primary/50 via-white/10 to-transparent" />
          <p className="relative font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
            Round schedule
          </p>
          <p className="relative mt-0.5 font-display text-sm tracking-display text-foreground">
            Date &amp; venue
          </p>
        </div>

        <div className="space-y-4 p-4">
          <ScheduleDateTimePicker
            date={date}
            time={time}
            includeTime={includeTime}
            onDateChange={handleDateChange}
            onTimeChange={handleTimeChange}
            onIncludeTimeChange={handleIncludeTimeChange}
          />

          <Separator />

          <div className="space-y-2">
            <Label className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
              Where
            </Label>
            <ToggleGroup
              type="single"
              value={venueType}
              onValueChange={(next) => {
                if (next === "online" || next === "onsite") handleVenueChange(next);
              }}
              className="grid w-full grid-cols-2 gap-2"
            >
              <ToggleGroupItem
                value="online"
                className={cn(
                  "h-10 gap-1.5 font-tech text-[10px] uppercase tracking-wider",
                  "data-[state=on]:border-[#5865F2]/45 data-[state=on]:bg-[#5865F2]/12 data-[state=on]:text-[#c5cbff]",
                )}
              >
                <Monitor className="h-3.5 w-3.5" />
                Online
              </ToggleGroupItem>
              <ToggleGroupItem
                value="onsite"
                className={cn(
                  "h-10 gap-1.5 font-tech text-[10px] uppercase tracking-wider",
                  "data-[state=on]:border-amber-400/45 data-[state=on]:bg-amber-400/10 data-[state=on]:text-amber-200",
                )}
              >
                <MapPin className="h-3.5 w-3.5" />
                On-site
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {venueType === "onsite" && (
            <div className="space-y-2">
              <Label
                htmlFor="bracket-round-venue"
                className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground"
              >
                Venue
              </Label>
              <Input
                id="bracket-round-venue"
                value={location}
                onChange={(event) => handleLocationChange(event.target.value)}
                onBlur={commitLocation}
                onKeyDown={(event) => event.stopPropagation()}
                placeholder="e.g. Double Dragon NAOS"
                maxLength={120}
                className="bg-background/50"
              />
            </div>
          )}

          {venueType === "online" && (
            <DiscordAppAnchor
              discordUrl={DISCORD_SERVER_INVITE}
              className="flex items-center justify-center gap-2 rounded-md border border-[#5865F2]/35 bg-[#5865F2]/10 px-3 py-2.5 font-tech text-[10px] uppercase tracking-wider text-[#aeb7ff] transition-colors hover:bg-[#5865F2]/18"
            >
              <Monitor className="h-3.5 w-3.5" />
              Black Rose Discord
            </DiscordAppAnchor>
          )}

          {configured && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSchedule}
              className="w-full font-tech text-[10px] uppercase tracking-wider text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            >
              Clear schedule
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface BracketScheduleToolbarProps {
  className?: string;
}

export function BracketScheduleToolbar({ className }: BracketScheduleToolbarProps) {
  return (
    <div
      className={cn(
        "relative mb-3 overflow-hidden rounded-md border border-border/70 bg-card/40 px-4 py-3",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-15" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-primary/40 via-white/10 to-transparent" />
      <p className="relative font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
        Round schedules
      </p>
      <p className="relative mt-1 text-xs leading-relaxed text-muted-foreground">
        Click <span className="text-foreground/80">Set schedule</span> under any round column. Use
        the calendar to pick a date, optionally set a start time, then choose Online (Discord) or
        On-site.
      </p>
    </div>
  );
}
