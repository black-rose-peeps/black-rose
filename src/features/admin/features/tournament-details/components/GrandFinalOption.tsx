import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  GRAND_FINAL_MODE_OPTIONS,
  type GrandFinalMode,
} from "@/features/admin/features/tournament-details/utils/grand-final";

interface GrandFinalOptionProps {
  value: GrandFinalMode;
  onChange: (mode: GrandFinalMode) => void;
  disabled?: boolean;
  disabledReason?: string;
}

export function GrandFinalOption({
  value,
  onChange,
  disabled = false,
  disabledReason,
}: GrandFinalOptionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="font-display text-sm uppercase tracking-wider text-foreground/90">
          Bracket options
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div
        className={cn(
          "relative overflow-hidden border transition-all duration-200",
          disabled && "opacity-60",
          "border-border bg-card",
        )}
      >
        <div className="relative flex items-start gap-4 p-4 sm:p-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center border border-border bg-secondary/40">
            <Crown className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <p className="font-display text-base tracking-wide text-foreground sm:text-lg">
                Grand Finals
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                How the upper and lower bracket winners meet to decide the champion.
              </p>
              {disabled && disabledReason && (
                <p className="mt-2 font-tech text-[10px] uppercase tracking-wider text-muted-foreground/80">
                  {disabledReason}
                </p>
              )}
            </div>

            <RadioGroup
              value={value}
              onValueChange={(next) => onChange(next as GrandFinalMode)}
              disabled={disabled}
              className="gap-3"
            >
              {GRAND_FINAL_MODE_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-start gap-3">
                  <RadioGroupItem
                    value={option.value}
                    id={`grand-final-mode-${option.value}`}
                    className="mt-0.5 border-muted-foreground/50 data-[state=checked]:border-amber-400 data-[state=checked]:text-amber-400"
                  />
                  <Label
                    htmlFor={`grand-final-mode-${option.value}`}
                    className={cn(
                      "cursor-pointer font-normal leading-snug",
                      disabled && "cursor-not-allowed",
                    )}
                  >
                    <span className="text-sm text-foreground">{option.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      </div>
    </section>
  );
}
