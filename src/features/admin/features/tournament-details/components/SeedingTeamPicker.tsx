import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { TournamentTeam } from "@/features/tournaments/types";

interface SeedingTeamPickerProps {
  value: TournamentTeam | null;
  teams: TournamentTeam[];
  usedTeamIds: Set<string>;
  onChange: (teamId: string | null) => void;
  disabled?: boolean;
  label: string;
  seed: number;
}

export function SeedingTeamPicker({
  value,
  teams,
  usedTeamIds,
  onChange,
  disabled = false,
  label,
  seed,
}: SeedingTeamPickerProps) {
  const [open, setOpen] = useState(false);

  const options = teams.filter((team) => team.id === value?.id || !usedTeamIds.has(team.id));

  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
        {label} · Seed {seed}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-10 w-full justify-between border-border bg-input/40 px-3 font-normal hover:bg-input/60",
              !value && "text-muted-foreground",
            )}
          >
            {value ? (
              <span className="flex min-w-0 items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center border border-border bg-secondary text-[9px] font-tech tracking-wider">
                  {value.tag}
                </span>
                <span className="truncate font-display text-sm tracking-wider">{value.name}</span>
              </span>
            ) : (
              <span className="text-sm">Select team…</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search by name or tag…" className="h-9" />
            <CommandList className="custom-scrollbar max-h-56">
              <CommandEmpty>No team found.</CommandEmpty>
              <CommandGroup>
                {value && (
                  <CommandItem
                    value="clear-slot"
                    onSelect={() => {
                      onChange(null);
                      setOpen(false);
                    }}
                    className="text-muted-foreground"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear slot
                  </CommandItem>
                )}
                {options.map((team) => (
                  <CommandItem
                    key={team.id}
                    value={`${team.name} ${team.tag}`}
                    onSelect={() => {
                      onChange(team.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value?.id === team.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="mr-2 grid h-6 w-6 shrink-0 place-items-center border border-border bg-secondary text-[9px] font-tech tracking-wider">
                      {team.tag}
                    </span>
                    <span className="min-w-0 truncate">{team.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
