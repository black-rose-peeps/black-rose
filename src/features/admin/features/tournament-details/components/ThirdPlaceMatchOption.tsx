import { Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

interface ThirdPlaceMatchOptionProps {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  disabledReason?: string;
  contextLabel?: string;
}

export function ThirdPlaceMatchOption({
  enabled,
  onToggle,
  disabled = false,
  disabledReason,
  contextLabel = "Single elimination",
}: ThirdPlaceMatchOptionProps) {
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
          enabled
            ? "border-amber-400/40 bg-amber-400/[0.04] shadow-[0_0_32px_-12px_rgba(251,191,36,0.35)]"
            : "border-border bg-card hover:border-amber-400/25 hover:bg-amber-400/[0.02]",
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-12 bg-linear-to-b to-transparent",
            enabled ? "from-amber-400/10" : "from-white/[0.02]",
          )}
        />

        <div className="relative flex items-start gap-4 p-4 sm:p-5">
          <button
            type="button"
            aria-pressed={enabled}
            aria-label={`Battle for 3rd place — currently ${enabled ? "enabled" : "disabled"}`}
            disabled={disabled}
            onClick={onToggle}
            className={cn(
              "min-w-0 flex-1 text-left outline-none transition-opacity",
              disabled ? "cursor-not-allowed" : "cursor-pointer hover:opacity-95",
              "focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center border transition-colors",
                  enabled
                    ? "border-amber-400/35 bg-amber-400/10"
                    : "border-border bg-secondary/40 group-hover:border-amber-400/20",
                )}
              >
                <Trophy
                  className={cn("h-4 w-4", enabled ? "text-amber-300" : "text-muted-foreground")}
                  strokeWidth={1.5}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      "font-tech text-[10px] uppercase tracking-wider-2",
                      enabled ? "text-amber-300/80" : "text-muted-foreground",
                    )}
                  >
                    Optional — Post-semifinals
                  </p>
                  {enabled ? (
                    <span className="inline-flex items-center gap-1 border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 font-tech text-[9px] uppercase tracking-wider text-amber-200">
                      <Sparkles className="h-3 w-3" />
                      Enabled
                    </span>
                  ) : (
                    !disabled && (
                      <span className="border border-border bg-secondary/50 px-2 py-0.5 font-tech text-[9px] uppercase tracking-wider text-muted-foreground">
                        Click to enable
                      </span>
                    )
                  )}
                </div>
                <p className="mt-1 font-display text-base tracking-wide text-foreground sm:text-lg">
                  Battle for 3rd place
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  Both semifinal losers meet in a dedicated bronze match. Recommended for prize
                  placements in {contextLabel.toLowerCase()} brackets.
                </p>
                {disabled && disabledReason && (
                  <p className="mt-2 font-tech text-[10px] uppercase tracking-wider text-muted-foreground/80">
                    {disabledReason}
                  </p>
                )}
              </div>
            </div>
          </button>

          <div className="flex shrink-0 flex-col items-center gap-1.5 pt-1">
            <Switch
              checked={enabled}
              disabled={disabled}
              onCheckedChange={onToggle}
              aria-label="Toggle battle for 3rd place"
              className={cn(
                "h-6 w-11 cursor-pointer data-[state=checked]:bg-amber-400 data-[state=unchecked]:bg-input",
                "[&>span]:h-5 [&>span]:w-5 [&>span]:data-[state=checked]:translate-x-5",
                "focus-visible:ring-amber-400/50",
              )}
            />
            <span
              className={cn(
                "font-tech text-[9px] uppercase tracking-wider",
                enabled ? "text-amber-300/90" : "text-muted-foreground",
              )}
            >
              {enabled ? "On" : "Off"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
