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
      className={`relative w-full overflow-hidden border border-white/[0.08] bg-[oklch(0.055_0_0)] ${
        variant === "hero" ? "h-44 sm:h-56" : "h-40 sm:h-52"
      } ${className}`}
    >
      <span className="pointer-events-none absolute left-0 top-0 z-20 h-4 w-4 border-l border-t border-white/25" />
      <span className="pointer-events-none absolute right-0 top-0 z-20 h-4 w-4 border-r border-t border-white/25" />
      <span className="pointer-events-none absolute bottom-0 left-0 z-20 h-4 w-4 border-b border-l border-white/15" />
      <span className="pointer-events-none absolute bottom-0 right-0 z-20 h-4 w-4 border-b border-r border-white/15" />

      {hasPortrait ? (
        <img
          src={champion.portraitUrl!}
          alt={`${champion.teamName} — ${crownVariantLabel(champion.crownVariant)}`}
          className="absolute inset-0 h-full w-full object-cover object-center"
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
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center sm:px-6">
            <div
              className={`clip-tab grid place-items-center border font-display tracking-display shadow-[0_0_40px_rgba(0,0,0,0.45)] ${accent.tag} ${
                variant === "hero"
                  ? "h-16 w-16 text-xl sm:h-20 sm:w-20 sm:text-2xl"
                  : "h-12 w-12 text-lg sm:h-16 sm:w-16 sm:text-xl"
              }`}
            >
              {champion.teamTag}
            </div>
            <Crown
              className={`text-amber-300/80 ${variant === "hero" ? "mt-5 h-5 w-5" : "mt-2 h-4 w-4 sm:mt-5 sm:h-5 sm:w-5"}`}
              strokeWidth={1.25}
            />
            <p
              className={`font-tech font-semibold uppercase tracking-[0.22em] text-white/55 ${
                variant === "hero" ? "mt-3 text-[10px]" : "mt-1.5 text-[8px] sm:mt-3 sm:text-[10px]"
              }`}
            >
              Champion Portrait
            </p>
            <p
              className={`max-w-[14rem] leading-relaxed text-white/35 ${
                variant === "hero"
                  ? "mt-1 text-[10px]"
                  : "mt-0.5 hidden text-[9px] sm:mt-1 sm:block sm:text-[10px]"
              }`}
            >
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

      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/35 to-transparent px-4 pb-3 pt-8 sm:px-5 sm:pb-4 sm:pt-10">
        <p className="font-tech font-semibold text-[9px] uppercase tracking-[0.2em] text-amber-300/75">
          {crownVariantLabel(champion.crownVariant)}
        </p>
      </div>
    </div>
  );
}
