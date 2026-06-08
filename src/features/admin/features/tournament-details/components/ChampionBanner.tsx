import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TournamentTeam } from "@/features/tournaments/types";

interface ChampionBannerProps {
  champion: string;
  team?: TournamentTeam;
  variant?: "final" | "grand";
  className?: string;
}

export function ChampionBanner({ champion, team, variant = "final", className }: ChampionBannerProps) {
  const abbr = team?.tag ?? champion.slice(0, 2).toUpperCase();
  const title = variant === "grand" ? "Grand Finals Champion" : "Tournament Champion";

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-amber-400/35 bg-linear-to-r from-amber-400/10 via-amber-400/5 to-transparent px-6 py-5",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-amber-300/50 to-transparent" />

      <div className="relative flex flex-wrap items-center gap-5">
        <div className="clip-tab grid h-14 w-14 place-items-center border border-amber-400/40 bg-amber-400/10 font-display text-lg tracking-display text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.12)]">
          {abbr}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-amber-300/80">
            <Crown className="h-4 w-4" strokeWidth={1.5} />
            <span className="font-tech text-[10px] uppercase tracking-wider-2">{title}</span>
          </div>
          <p className="mt-1 font-display text-3xl tracking-display text-white">{champion}</p>
        </div>

        <div className="hidden sm:block text-right">
          <p className="font-tech text-[10px] uppercase tracking-wider-2 text-amber-400/60">Status</p>
          <p className="font-display text-xl tracking-display text-amber-100">Crowned</p>
        </div>
      </div>
    </div>
  );
}
