import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChampionArchiveStatProps {
  label: string;
  value: number;
  description: string;
}

export function ChampionArchiveStat({ label, value, description }: ChampionArchiveStatProps) {
  return (
    <div className="px-6 py-5">
      <div className="font-display text-3xl tracking-display md:text-4xl">{value}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          {label}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex shrink-0 cursor-pointer text-muted-foreground/50 transition hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
              aria-label={`About ${label}`}
            >
              <Info className="h-3 w-3" strokeWidth={1.75} />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="max-w-[240px] rounded-none border border-white/12 bg-[oklch(0.09_0_0)] px-3 py-2 text-[11px] leading-relaxed text-white/80"
          >
            {description}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

interface ChampionArchiveStatsStripProps {
  stats: Array<{ label: string; value: number; description: string }>;
}

export function ChampionArchiveStatsStrip({ stats }: ChampionArchiveStatsStripProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="mt-10 inline-grid grid-cols-3 divide-x divide-white/8 border border-white/8 bg-white/2.5">
        {stats.map((stat) => (
          <ChampionArchiveStat key={stat.label} {...stat} />
        ))}
      </div>
    </TooltipProvider>
  );
}
