import { Crown } from "lucide-react";
import {
  GAME_EDITORIAL_ACCENT,
  GAME_TOURNAMENT_HEADER,
} from "@/features/tournaments/utils/tournament-display";
import type { HallOfChampionRecord } from "../types";
import { crownVariantLabel } from "../utils/champion-narrative";
import { resolveGame } from "../utils/game-mapping";

interface ChampionPortraitProps {
  champion: HallOfChampionRecord;
  className?: string;
  /** Larger hero treatment inside the story dialog. */
  variant?: "card" | "hero";
}

export function ChampionPortrait({
  champion,
  className = "",
  variant = "card",
}: ChampionPortraitProps) {
  const game = resolveGame(champion.game);
  const accent = GAME_EDITORIAL_ACCENT[game];
  const header = GAME_TOURNAMENT_HEADER[game];
  const hasPortrait = Boolean(champion.portraitUrl?.trim());

  return (
    <div
      className={`relative overflow-hidden border border-white/[0.08] bg-[oklch(0.055_0_0)] ${variant === "hero" ? "min-h-[22rem]" : "aspect-[3/4]"} ${className}`}
    >
      <span className="pointer-events-none absolute left-0 top-0 z-20 h-4 w-4 border-l border-t border-white/25" />
      <span className="pointer-events-none absolute right-0 top-0 z-20 h-4 w-4 border-r border-t border-white/25" />
      <span className="pointer-events-none absolute bottom-0 left-0 z-20 h-4 w-4 border-b border-l border-white/15" />
      <span className="pointer-events-none absolute bottom-0 right-0 z-20 h-4 w-4 border-b border-r border-white/15" />

      {hasPortrait ? (
        <img
          src={champion.portraitUrl!}
          alt={`${champion.teamName} — ${crownVariantLabel(champion.crownVariant)}`}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : (
        <>
          <img
            src={header}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover object-center opacity-35 blur-[1px] grayscale contrast-125"
          />
          <div className="absolute inset-0 bg-linear-to-t from-[oklch(0.055_0_0)] via-[oklch(0.055_0_0/0.55)] to-black/30" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <div
              className={`clip-tab grid h-20 w-20 place-items-center border font-display text-2xl tracking-display shadow-[0_0_40px_rgba(0,0,0,0.45)] ${accent.tag}`}
            >
              {champion.teamTag}
            </div>
            <Crown className="mt-5 h-5 w-5 text-amber-300/80" strokeWidth={1.25} />
            <p className="mt-3 font-tech font-semibold text-[10px] uppercase tracking-[0.22em] text-white/55">
              Champion Portrait
            </p>
            <p className="mt-1 max-w-[14rem] text-[10px] leading-relaxed text-white/35">
              Official victory shoot pending — archive entry live.
            </p>
          </div>
        </>
      )}

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 3px)",
        }}
      />

      <div
        className={`absolute inset-x-0 bottom-0 h-px bg-linear-to-r ${accent.line} opacity-90`}
      />

      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/35 to-transparent px-4 pb-4 pt-16">
        <p className="font-tech font-semibold text-[9px] uppercase tracking-[0.2em] text-amber-300/75">
          {crownVariantLabel(champion.crownVariant)}
        </p>
        {variant === "hero" ? (
          <p className="mt-1 font-display text-xl tracking-[0.04em] text-white">
            {champion.teamName}
          </p>
        ) : null}
      </div>
    </div>
  );
}
