import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TournamentMetaItem {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  /** Prize pool and other emphasis cells */
  highlight?: boolean;
  accentClass?: string;
}

interface TournamentMetaStripProps {
  items: TournamentMetaItem[];
  className?: string;
}

export function TournamentMetaStrip({ items, className }: TournamentMetaStripProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border border-white/[0.08] bg-white/[0.02]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/12 to-transparent" />

      <div className="relative flex flex-wrap gap-px bg-white/[0.06]">
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex min-w-[9rem] flex-1 items-center gap-3 px-5 py-4",
              item.highlight
                ? "bg-white text-black"
                : "bg-[oklch(0.07_0_0)] text-foreground",
            )}
          >
            {item.icon && (
              <span
                className={cn(
                  "shrink-0",
                  item.highlight ? "text-black/45" : "text-muted-foreground",
                )}
              >
                {item.icon}
              </span>
            )}
            <div className="min-w-0">
              <div
                className={cn(
                  "text-[9px] font-tech uppercase tracking-wider-2",
                  item.highlight ? "text-black/50" : "text-muted-foreground",
                )}
              >
                {item.label}
              </div>
              <div
                className={cn(
                  "mt-0.5 truncate text-sm font-medium",
                  item.highlight && "font-display text-xl tracking-display",
                  !item.highlight && item.accentClass,
                )}
              >
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
