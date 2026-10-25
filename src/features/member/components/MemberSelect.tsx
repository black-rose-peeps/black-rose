import { useId, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface MemberSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/** One member-facing dropdown treatment; longer catalogs gain keyboard-searchable options. */
export function MemberSelect({
  id,
  label,
  value,
  options,
  onValueChange,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  options: MemberSelectOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const selected = options.find((option) => option.value === value);
  const triggerClass =
    "min-h-11 w-full min-w-0 justify-between rounded-none border-white/15 bg-white/5 px-3 text-left text-sm text-foreground font-normal";
  if (options.length <= 8)
    return (
      <Select
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          if (next) onValueChange(next);
        }}
      >
        <SelectTrigger id={id} aria-label={label} className={triggerClass}>
          <SelectValue>{selected?.label ?? "Choose an option"}</SelectValue>
        </SelectTrigger>
        <SelectContent className="rounded-none border-white/15 bg-[oklch(0.1_0_0)]">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="min-h-11 rounded-none"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          disabled={disabled}
          variant="outline"
          className={triggerClass}
        >
          <span className="truncate">{selected?.label ?? "Choose an option"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-48 max-w-[calc(100vw-2rem)] rounded-none border-white/15 bg-[oklch(0.1_0_0)] p-0"
      >
        <Command label={`Search ${label.toLowerCase()}`} className="rounded-none bg-transparent">
          <CommandInput
            aria-label={`Search ${label.toLowerCase()}`}
            placeholder={`Search ${label.toLowerCase()}…`}
          />
          <CommandList id={listId} className="custom-scrollbar max-h-64">
            <CommandEmpty>No matching options.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label]}
                  disabled={option.disabled}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className="min-h-11 rounded-none"
                >
                  <Check
                    aria-hidden
                    className={`h-4 w-4 ${value === option.value ? "opacity-100" : "opacity-0"}`}
                  />
                  <span>{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
