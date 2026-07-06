"use client";

import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  buildScheduleTime,
  parseScheduleDate,
  parseScheduleTime,
  toScheduleDateString,
  type ScheduleTimeParts,
} from "@/features/tournaments/utils/round-schedule";

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => index * 5);

interface ScheduleDateTimePickerProps {
  date?: string;
  time?: string;
  includeTime: boolean;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onIncludeTimeChange: (include: boolean) => void;
  className?: string;
}

export function ScheduleDateTimePicker({
  date,
  time,
  includeTime,
  onDateChange,
  onTimeChange,
  onIncludeTimeChange,
  className,
}: ScheduleDateTimePickerProps) {
  const selectedDate = parseScheduleDate(date);
  const timeParts = parseScheduleTime(time);

  function handleDateSelect(next: Date | undefined) {
    if (!next) return;
    onDateChange(toScheduleDateString(next));
  }

  function handleTimePartChange(patch: Partial<ScheduleTimeParts>) {
    onTimeChange(buildScheduleTime({ ...timeParts, ...patch }));
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
          Date
        </Label>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start bg-background/50 font-normal",
            !selectedDate && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
        </Button>
        <div className="overflow-hidden rounded-md border border-border/70 bg-background/40">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            captionLayout="dropdown"
            defaultMonth={selectedDate ?? new Date()}
            fromYear={new Date().getFullYear()}
            toYear={new Date().getFullYear() + 3}
            className="mx-auto"
          />
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Include time</p>
            <p className="text-xs text-muted-foreground">Show a start time on the public bracket</p>
          </div>
        </div>
        <Switch checked={includeTime} onCheckedChange={onIncludeTimeChange} />
      </div>

      {includeTime && (
        <div className="space-y-2">
          <Label className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
            Start time
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">Hour</Label>
              <Select
                value={String(timeParts.hour12)}
                onValueChange={(value) => handleTimePartChange({ hour12: Number(value) })}
              >
                <SelectTrigger className="h-9 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUR_OPTIONS.map((hour) => (
                    <SelectItem key={hour} value={String(hour)}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">Min</Label>
              <Select
                value={String(timeParts.minute)}
                onValueChange={(value) => handleTimePartChange({ minute: Number(value) })}
              >
                <SelectTrigger className="h-9 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MINUTE_OPTIONS.map((minute) => (
                    <SelectItem key={minute} value={String(minute)}>
                      {String(minute).padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">Period</Label>
              <ToggleGroup
                type="single"
                value={timeParts.period}
                onValueChange={(value) => {
                  if (value === "AM" || value === "PM") {
                    handleTimePartChange({ period: value });
                  }
                }}
                className="grid w-full grid-cols-2 gap-0"
              >
                <ToggleGroupItem
                  value="AM"
                  className="h-9 rounded-r-none border border-input text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  AM
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="PM"
                  className="h-9 rounded-l-none border border-l-0 border-input text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  PM
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
