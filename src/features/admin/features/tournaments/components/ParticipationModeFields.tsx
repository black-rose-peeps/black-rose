import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CreateTournamentFormValues } from "../types";
import {
  WWM_MODE_OPTIONS,
  resolveParticipationType,
} from "@/features/tournaments/types/participation";

interface ParticipationModeFieldsProps {
  values: CreateTournamentFormValues;
  disabled?: boolean;
  fieldErrors?: Partial<Record<keyof CreateTournamentFormValues, string>>;
  onWwmModeChange: (mode: CreateTournamentFormValues["wwmMode"]) => void;
}

export function ParticipationModeFields({
  values,
  disabled,
  fieldErrors,
  onWwmModeChange,
}: ParticipationModeFieldsProps) {
  const showWwmMode = values.game === "Where Winds Meet";
  const isTftSolo = values.game === "Teamfight Tactics";
  const participationType = resolveParticipationType(
    values.game,
    values.wwmMode || null,
  );

  if (!showWwmMode && !isTftSolo) return null;

  return (
    <div className="space-y-3 rounded-md border border-border bg-background/40 p-4">
      <div>
        <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          Registration
        </p>
        <p className="mt-1 text-sm text-foreground">
          {isTftSolo
            ? "Teamfight Tactics uses individual registration — one player per slot."
            : participationType === "solo"
              ? "Players register directly; no team roster required."
              : "Teams register with full rosters from the Teams tab."}
        </p>
      </div>

      {showWwmMode && (
        <div className="space-y-2">
          <Label htmlFor="tournament-wwm-mode">Where Winds Meet Mode</Label>
          <Select
            value={values.wwmMode || "group_strategy"}
            onValueChange={(mode) => onWwmModeChange(mode as CreateTournamentFormValues["wwmMode"])}
            disabled={disabled}
          >
            <SelectTrigger id="tournament-wwm-mode" className="bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WWM_MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {values.wwmMode && (
            <p className="text-xs text-muted-foreground">
              {WWM_MODE_OPTIONS.find((o) => o.value === values.wwmMode)?.description}
            </p>
          )}
          {fieldErrors?.wwmMode && (
            <p className="text-xs text-destructive">{fieldErrors.wwmMode}</p>
          )}
        </div>
      )}
    </div>
  );
}
