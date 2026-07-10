import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TournamentTeam } from "@/features/tournaments/types";
import {
  SEEDING_TIER_OPTIONS,
  type SeedingTier,
} from "@/features/tournaments/utils/seeding-format";

interface TierSeedingPanelProps {
  teams: TournamentTeam[];
  tierByTeamId: Record<string, SeedingTier | undefined>;
  disabled?: boolean;
  onTierChange: (teamId: string, tier: SeedingTier) => void;
  onApply: () => void;
}

export function TierSeedingPanel({
  teams,
  tierByTeamId,
  disabled,
  onTierChange,
  onApply,
}: TierSeedingPanelProps) {
  const tierCounts = teams.reduce(
    (acc, team) => {
      const tier = tierByTeamId[team.id] ?? "open";
      acc[tier] += 1;
      return acc;
    },
    { elite: 0, contender: 0, open: 0 } as Record<SeedingTier, number>,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-secondary/10 px-4 py-3">
        <p className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
          Elite {tierCounts.elite} · Contender {tierCounts.contender} · Open {tierCounts.open}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={onApply}
          className="font-tech text-[10px] uppercase tracking-wider"
        >
          Apply tier seeding
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {teams.map((team) => {
          const tier = tierByTeamId[team.id] ?? "open";
          return (
            <div
              key={team.id}
              className={cn(
                "flex items-center gap-3 border bg-card px-3 py-2",
                tier === "elite" && "border-amber-400/30",
              )}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center border border-border bg-secondary text-[9px] font-tech">
                {team.tag}
              </span>
              <span className="min-w-0 flex-1 truncate font-display text-sm tracking-wider">
                {team.name}
              </span>
              <Select
                value={tier}
                onValueChange={(value) => onTierChange(team.id, value as SeedingTier)}
                disabled={disabled}
              >
                <SelectTrigger className="h-8 w-[8.5rem] bg-background/50 font-tech text-[10px] uppercase tracking-wider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEEDING_TIER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
