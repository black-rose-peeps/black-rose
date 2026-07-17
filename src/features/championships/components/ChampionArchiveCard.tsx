import { Crown, Monitor, Users } from "lucide-react";
import {
  GAME_EDITORIAL_ACCENT,
  GAME_TOURNAMENT_HEADER,
  getGameAbbrev,
} from "@/features/tournaments/utils/tournament-display";
import type { HallOfChampionRecord } from "../types";
import { crownVariantLabel, formatChampionDate } from "../utils/champion-narrative";
import { resolveGame } from "../utils/game-mapping";
import { RoseStarMark } from "./RoseStarMark";

interface ChampionArchiveCardProps {
  champion: HallOfChampionRecord;
  index: number;
  onSelect: (champion: HallOfChampionRecord) => void;
}

/**
 * Full-bleed film-poster card.
 * The photo (or editorial placeholder) IS the card — all metadata overlays
 * directly on the image via a gradient scrim.
 */
export function ChampionArchiveCard({ champion, index, onSelect }: ChampionArchiveCardProps) {
  const game = resolveGame(champion.game);
  const accent = GAME_EDITORIAL_ACCENT[game];
  const header = GAME_TOURNAMENT_HEADER[game];
  const hasPhoto = Boolean(champion.portraitUrl?.trim());
  const isTeam = champion.participationType === "team";

  return (
    <button
      type="button"
      onClick={() => onSelect(champion)}
      className={`group relative aspect-4/3 w-full overflow-hidden border border-white/10 bg-black text-left transition duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${accent.glow} hover:border-white/20`}
    >
      {/* ── Background ───────────────────────────────────── */}
      {hasPhoto ? (
        <img
          src={champion.portraitUrl!}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 group-hover:scale-[1.03]"
        />
      ) : (
        <img
          src={header}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-center opacity-25 grayscale transition duration-700 group-hover:scale-[1.03]"
        />
      )}

      {/* gradient scrim */}
      <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-black/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_140%_100%_at_50%_100%,transparent_40%,rgba(0,0,0,0.5)_100%)]" />

      {/* scanlines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.15) 2px,rgba(255,255,255,0.15) 3px)",
        }}
      />

      {/* ── Top badges ───────────────────────────────────── */}
      <div className="absolute left-0 top-0 flex items-center gap-2 p-3 sm:p-4">
        <span className="flex items-center gap-1.5 border border-white/20 bg-black/60 px-2 py-1 font-tech text-[9px] uppercase tracking-[0.2em] text-white/80 backdrop-blur-sm">
          <RoseStarMark size={8} className="text-amber-300/80" />
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <div className="absolute right-0 top-0 p-3 sm:p-4">
        <span
          className={`border px-2 py-1 font-tech text-[9px] uppercase tracking-[0.18em] backdrop-blur-sm ${accent.tag}`}
        >
          {getGameAbbrev(game)}
        </span>
      </div>

      {/* ── Bottom content ───────────────────────────────── */}
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-16 sm:px-5 sm:pb-5 sm:pt-20">
        <div className={`mb-3 h-px w-8 bg-linear-to-r ${accent.line}`} />

        {/* crown label + team name */}
        <div className="flex items-center gap-2 text-amber-300/80">
          <Crown className="h-3 w-3 shrink-0" strokeWidth={1.5} />
          <span className="font-tech font-semibold text-[9px] uppercase tracking-[0.2em]">
            {crownVariantLabel(champion.crownVariant)}
          </span>
        </div>
        <p className="mt-1.5 font-display text-2xl leading-none tracking-[0.04em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:text-3xl">
          {champion.teamName}
        </p>

        {/* meta row: format · participation · date */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {/* format */}
          <span className="flex items-center gap-1 font-tech text-[9px] uppercase tracking-[0.15em] text-white/45">
            {champion.format}
          </span>

          <span className="text-white/20">·</span>

          {/* online / onsite derived from participationType */}
          <span className="flex items-center gap-1 font-tech text-[9px] uppercase tracking-[0.15em] text-white/45">
            {isTeam ? (
              <Users className="h-2.5 w-2.5 shrink-0" strokeWidth={1.75} />
            ) : (
              <Monitor className="h-2.5 w-2.5 shrink-0" strokeWidth={1.75} />
            )}
            {isTeam ? "Team" : "Solo"}
          </span>

          <span className="text-white/20">·</span>

          {/* date */}
          <span className="font-tech text-[9px] uppercase tracking-[0.15em] text-white/40">
            {formatChampionDate(champion.crownedAt)}
          </span>
        </div>
      </div>

      {/* corner marks */}
      <span className="pointer-events-none absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-white/25" />
      <span className="pointer-events-none absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-white/25" />
      <span className="pointer-events-none absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-white/15" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-white/15" />
    </button>
  );
}
