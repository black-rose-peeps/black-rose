import { Link } from "@tanstack/react-router";
import { Crown, ExternalLink, MapPin, Monitor } from "lucide-react";
import {
  AdaptiveModal,
  AdaptiveModalBody,
  AdaptiveModalContent,
  AdaptiveModalDescription,
  AdaptiveModalHeader,
  AdaptiveModalTitle,
} from "@/components/ui/adaptive-modal";
import {
  GAME_EDITORIAL_ACCENT,
  GAME_TOURNAMENT_HEADER,
} from "@/features/tournaments/utils/tournament-display";
import type { HallOfChampionRecord } from "../types";
import {
  buildChampionNarrative,
  crownVariantLabel,
  formatChampionLongDate,
} from "../utils/champion-narrative";
import { resolveGame } from "../utils/game-mapping";
import { RoseStarMark } from "./RoseStarMark";

interface ChampionStoryDialogProps {
  champion: HallOfChampionRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Two-layer dialog:
 *  1. Ambient background — the champion photo (or editorial image) blurred + darkened.
 *  2. Foreground content panel — scrollable, always fully reachable.
 */
export function ChampionStoryDialog({ champion, open, onOpenChange }: ChampionStoryDialogProps) {
  if (!champion) return null;

  const game = resolveGame(champion.game);
  const accent = GAME_EDITORIAL_ACCENT[game];
  const header = GAME_TOURNAMENT_HEADER[game];
  const narrative = buildChampionNarrative(champion);
  const bgSrc = champion.portraitUrl?.trim() || header;

  const isOnsite = champion.venueType === "onsite";
  const isOnline = champion.venueType === "online";

  return (
    <AdaptiveModal open={open} onOpenChange={onOpenChange}>
      <AdaptiveModalContent
        mobileSize="full"
        className="flex max-h-[92vh] max-w-4xl flex-col overflow-hidden border-white/10 bg-black p-0 shadow-[0_40px_100px_rgba(0,0,0,0.9)]"
      >
        {/* ── Layer 1: ambient atmosphere ──────────────────────────── */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <img
            src={bgSrc}
            alt=""
            aria-hidden
            className="h-full w-full object-cover object-center opacity-30"
            style={{ filter: "blur(18px) saturate(0.6) brightness(0.5)" }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_0%,transparent_20%,rgba(0,0,0,0.7)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black to-transparent" />
        </div>

        {/* ── Layer 2: scrollable content ──────────────────────────── */}
        <AdaptiveModalBody className="custom-scrollbar relative z-10 overflow-y-auto p-0">
          {/* Champion photo */}
          <div className="relative w-full">
            <div className="aspect-video w-full overflow-hidden">
              <img
                src={bgSrc}
                alt={
                  champion.portraitUrl?.trim()
                    ? `${champion.teamName} — championship photo`
                    : `${champion.game} tournament editorial artwork`
                }
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black to-transparent" />
            <div className="absolute right-4 top-4">
              <span
                className={`border px-2.5 py-1 font-tech text-[9px] uppercase tracking-[0.18em] backdrop-blur-sm ${accent.tag}`}
              >
                {champion.game}
              </span>
            </div>
          </div>

          {/* Content body */}
          <div className="px-5 pb-8 pt-6 sm:px-8 sm:pt-8">
            {/* eyebrow */}
            <div className="flex items-center gap-2 text-amber-300/75">
              <RoseStarMark size={12} className="text-amber-300/85" />
              <span className="font-tech font-semibold text-[10px] uppercase tracking-[0.24em]">
                Black Rose Archive
              </span>
            </div>

            {/* title */}
            <AdaptiveModalHeader className="mt-3 border-0 px-0 py-0 text-left">
              <AdaptiveModalTitle className="font-display text-4xl leading-none tracking-[0.04em] text-white sm:text-5xl">
                {champion.teamName}
              </AdaptiveModalTitle>
              <AdaptiveModalDescription className="mt-2 text-left text-sm leading-relaxed text-white/45">
                {champion.tournamentName}
              </AdaptiveModalDescription>
            </AdaptiveModalHeader>

            {/* crown badge */}
            <div className="mt-5 inline-flex items-center gap-2 border border-amber-400/25 bg-amber-400/5 px-3 py-2">
              <Crown className="h-3.5 w-3.5 shrink-0 text-amber-300/80" strokeWidth={1.25} />
              <span className="font-tech font-semibold text-[10px] uppercase tracking-[0.2em] text-amber-200/85">
                {crownVariantLabel(champion.crownVariant)}
              </span>
            </div>

            {/* stats row */}
            <div className="mt-5 grid grid-cols-3 divide-x divide-white/8 border border-white/8 bg-white/3">
              {[
                { label: "Crowned", value: formatChampionLongDate(champion.crownedAt) },
                { label: "Prize Pool", value: champion.prizePool },
                {
                  label: "Format",
                  value: `${champion.format} · ${champion.participationType === "team" ? "Team" : "Solo"}`,
                },
              ].map(({ label, value }) => (
                <div key={label} className="px-4 py-3 sm:px-5 sm:py-4">
                  <p className="font-tech font-semibold text-[8px] uppercase tracking-[0.22em] text-white/40">
                    {label}
                  </p>
                  <p className="mt-1.5 font-display text-base leading-tight tracking-[0.03em] text-white sm:text-lg">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* ── Venue block ──────────────────────────────────────── */}
            {isOnsite && (
              <div className="mt-4 flex items-start gap-3 border border-amber-400/20 bg-amber-400/4 px-4 py-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-300/80" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="font-tech font-semibold text-[9px] uppercase tracking-[0.22em] text-amber-300/70">
                    On-site · LAN Event
                  </p>
                  {champion.venueLocation && (
                    <p className="mt-1 text-sm leading-snug text-white/70">
                      {champion.venueLocation}
                    </p>
                  )}
                </div>
              </div>
            )}

            {isOnline && (
              <div className="mt-4 flex items-center gap-3 border border-[#5865F2]/25 bg-[#5865F2]/5 px-4 py-3">
                <Monitor className="h-4 w-4 shrink-0 text-[#aeb7ff]/80" strokeWidth={1.5} />
                <div>
                  <p className="font-tech font-semibold text-[9px] uppercase tracking-[0.22em] text-[#aeb7ff]/70">
                    Online · Remote Event
                  </p>
                  <p className="mt-0.5 text-xs text-white/45">
                    Competed across the digital arena — no stage, no ceiling.
                  </p>
                </div>
              </div>
            )}

            {/* divider with game accent */}
            <div className={`mt-6 h-px bg-linear-to-r ${accent.line} opacity-60`} />

            {/* legacy narrative */}
            <div className="mt-5">
              <p className="font-tech font-semibold text-[9px] uppercase tracking-[0.24em] text-white/35">
                Legacy File
              </p>
              <p className="mt-3 text-sm leading-[1.85] text-white/65">{narrative}</p>
            </div>

            {/* actions */}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/tournaments/$id"
                params={{ id: champion.tournamentId }}
                onClick={() => onOpenChange(false)}
                className={`clip-cta inline-flex h-11 items-center gap-2 border border-white/20 bg-white/8 px-5 font-tech text-[10px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/12 ${accent.cta}`}
              >
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                View tournament
              </Link>
              {champion.teamId && (
                <Link
                  to="/teams/$id"
                  params={{ id: champion.teamId }}
                  onClick={() => onOpenChange(false)}
                  className="inline-flex h-11 items-center gap-2 border border-white/12 px-5 font-tech text-[10px] font-medium uppercase tracking-[0.2em] text-white/60 transition hover:border-white/25 hover:text-white"
                >
                  Championship roster →
                </Link>
              )}
            </div>
          </div>
        </AdaptiveModalBody>
      </AdaptiveModalContent>
    </AdaptiveModal>
  );
}
