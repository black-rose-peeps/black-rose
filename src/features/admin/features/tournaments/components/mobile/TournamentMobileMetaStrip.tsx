import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { TournamentMetaItem } from "@/features/admin/components/TournamentMetaStrip";
import { cn } from "@/lib/utils";

interface TournamentMobileMetaStripProps {
  items: TournamentMetaItem[];
  className?: string;
}

/** Mobile-first tournament meta — no empty grid cells, consistent dark styling. */
export function TournamentMobileMetaStrip({ items, className }: TournamentMobileMetaStripProps) {
  const [expanded, setExpanded] = useState(false);

  const highlightItem = items.find((item) => item.highlight);
  const standardItems = items.filter((item) => !item.highlight);

  // Always show game, registration, status up front; rest behind "More detail".
  const headline = standardItems.slice(0, 3);
  const secondary = standardItems.slice(3);

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-white/8 bg-[oklch(0.07_0_0)] clip-tab md:hidden",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative divide-y divide-white/6">
        <div className="grid grid-cols-2 gap-px bg-white/6">
          {headline.slice(0, 2).map((item) => (
            <MetaCell key={item.label} item={item} />
          ))}
        </div>

        {headline[2] ? (
          <div className="bg-[oklch(0.07_0_0)] px-4 py-3">
            <p className="font-tech text-label-readable uppercase text-muted-foreground">
              {headline[2].label}
            </p>
            <div className="mt-1.5 text-sm font-medium leading-snug">{headline[2].value}</div>
          </div>
        ) : null}

        {highlightItem ? (
          <div className="border-l-2 border-white/40 bg-white/[0.04] px-4 py-3">
            <p className="font-tech text-label-readable uppercase text-muted-foreground">
              {highlightItem.label}
            </p>
            <div className="mt-1 font-display text-xl tracking-display text-foreground">
              {highlightItem.value}
            </div>
          </div>
        ) : null}

        {secondary.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="touch-target flex w-full items-center justify-center gap-1.5 py-3 font-tech text-label-readable uppercase text-muted-foreground transition hover:bg-white/[0.03]"
            >
              {expanded ? "Less detail" : "More detail"}
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            {expanded ? (
              <div className="divide-y divide-white/6 border-t border-white/6">
                {secondary.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 px-4 py-3">
                    {item.icon ? (
                      <span className="shrink-0 text-muted-foreground">{item.icon}</span>
                    ) : null}
                    <div className="min-w-0">
                      <p className="font-tech text-label-readable uppercase text-muted-foreground">
                        {item.label}
                      </p>
                      <div className="mt-0.5 text-sm font-medium">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function MetaCell({ item }: { item: TournamentMetaItem }) {
  return (
    <div className="bg-[oklch(0.07_0_0)] px-4 py-3">
      <p className="font-tech text-label-readable uppercase text-muted-foreground">{item.label}</p>
      <div className="mt-1 text-sm font-medium leading-snug">{item.value}</div>
    </div>
  );
}
