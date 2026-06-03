"use client";

import { format, parseISO, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AdminDatePickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

function parseDateValue(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function AdminDatePicker({
  id,
  label,
  value,
  onChange,
  disabled,
  error,
  placeholder = "Pick a date",
}: AdminDatePickerProps) {
  const selected = parseDateValue(value);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start bg-background/50 text-left font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {selected ? format(selected, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (date) onChange(toIsoDate(date));
            }}
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
