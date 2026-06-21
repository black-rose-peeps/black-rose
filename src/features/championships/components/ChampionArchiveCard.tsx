import { Crown } from "lucide-react";
import {
  GAME_EDITORIAL_ACCENT,
  getGameAbbrev,
} from "@/features/tournaments/utils/tournament-display";
import type { HallOfChampionRecord } from "../types";
import { formatChampionDate } from "../utils/champion-narrative";
import { resolveGame } from "../utils/game-mapping";
import { ChampionPortrait } from "./ChampionPortrait";
import { RoseStarMark } from "./RoseStarMark";

interface ChampionArchiveCardProps {
  champion: HallOfChampionRecord;
  index: number;
  onSelect: (champion: HallOfChampionRecord) => void;
}

export function ChampionArchiveCard({ champion, index, onSelect }: ChampionArchiveCardProps) {
  const game = resolveGame(champion.game);
  const accent = GAME_EDITORIAL_ACCENT[game];

  return (
    <button
      type="button"
      onClick={() => onSelect(champion)}
      className={`group clip-angle-lg relative flex w-full flex-col overflow-hidden border border-white/[0.07] bg-[oklch(0.055_0_0)] text-left shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] transition duration-500 ${accent.glow} hover:shadow-[0_24px_64px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06)_inset] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40`}
    >
      <span className="pointer-events-none absolute left-0 top-0 z-20 h-5 w-5 border-l border-t border-white/20" />
      <span className="pointer-events-none absolute right-0 top-0 z-20 h-5 w-5 border-r border-t border-white/20" />

      <div className="relative">
        <ChampionPortrait champion={champion} className="border-0 border-b border-white/[0.06]" />

        <div className="absolute left-3 top-3 flex items-center gap-2 border border-white/15 bg-black/75 px-2 py-0.5 font-tech text-[9px] uppercase tracking-[0.2em] text-white/90 backdrop-blur-md sm:left-4 sm:top-4 sm:px-2.5 sm:py-1">
          <RoseStarMark size={10} className="text-amber-300/90" />#
          {String(index + 1).padStart(2, "0")}
        </div>

        <div
          className={`absolute right-3 top-3 border px-2 py-0.5 font-tech text-[9px] uppercase tracking-[0.18em] backdrop-blur-md sm:right-4 sm:top-4 ${accent.tag}`}
        >
          {getGameAbbrev(game)}
        </div>
      </div>

      <div className="relative flex flex-1 flex-col px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.14]" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-xl leading-[1.05] tracking-[0.04em] text-white transition group-hover:text-white sm:text-2xl">
              {champion.teamName}
            </p>
            <p className="mt-1 truncate font-title text-[11px] text-muted-foreground">
              {champion.tournamentName}
            </p>
          </div>
          <span className="clip-tab grid h-9 w-9 shrink-0 place-items-center border border-white/10 bg-white/[0.04] font-display text-xs tracking-display text-white/70 sm:h-10 sm:w-10">
            {champion.teamTag}
          </span>
        </div>

        <div className="relative mt-3 flex items-center justify-between border-t border-white/[0.08] pt-3 sm:mt-4 sm:pt-4">
          <div className="flex items-center gap-2 text-amber-300/75">
            <Crown className="h-3.5 w-3.5" strokeWidth={1.25} />
            <span className="font-tech font-semibold text-[9px] uppercase tracking-[0.2em]">
              {formatChampionDate(champion.crownedAt)}
            </span>
          </div>
          <span className="font-tech font-semibold text-[9px] uppercase tracking-[0.2em] text-white/65 transition group-hover:text-white/60 cursor-pointer">
            Open file →
          </span>
        </div>
      </div>
    </button>
  );
}
