import { Link } from "@tanstack/react-router";
import { Crown } from "lucide-react";
import {
  AdaptiveModal,
  AdaptiveModalBody,
  AdaptiveModalContent,
  AdaptiveModalDescription,
  AdaptiveModalHeader,
  AdaptiveModalTitle,
} from "@/components/ui/adaptive-modal";
import { GAME_EDITORIAL_ACCENT } from "@/features/tournaments/utils/tournament-display";
import type { HallOfChampionRecord } from "../types";
import {
  buildChampionNarrative,
  crownVariantLabel,
  formatChampionLongDate,
} from "../utils/champion-narrative";
import { resolveGame } from "../utils/game-mapping";
import { ChampionPortrait } from "./ChampionPortrait";
import { RoseStarMark } from "./RoseStarMark";

interface ChampionStoryDialogProps {
  champion: HallOfChampionRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChampionStoryDialog({ champion, open, onOpenChange }: ChampionStoryDialogProps) {
  if (!champion) return null;

  const accent = GAME_EDITORIAL_ACCENT[resolveGame(champion.game)];
  const narrative = buildChampionNarrative(champion);

  return (
    <AdaptiveModal open={open} onOpenChange={onOpenChange}>
      <AdaptiveModalContent
        mobileSize="full"
        className="max-h-[92vh] max-w-5xl overflow-hidden border-white/10 bg-[oklch(0.055_0_0)] p-0 shadow-[0_32px_80px_rgba(0,0,0,0.75)]"
      >
        <AdaptiveModalBody className="custom-scrollbar flex flex-col p-0">
          <ChampionPortrait
            champion={champion}
            variant="hero"
            className="shrink-0 border-0 border-b border-white/[0.06]"
          />

          <div className="relative flex flex-col px-5 py-6 sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.14]" />

            <AdaptiveModalHeader className="relative space-y-4 border-0 px-0 py-0 text-left">
              <div className="flex items-center gap-2 text-amber-300/80">
                <RoseStarMark size={14} className="text-amber-300/90" />
                <span className="font-tech font-semibold text-[11px] uppercase tracking-[0.22em]">
                  Black Rose Archive
                </span>
              </div>

              <AdaptiveModalTitle className="text-2xl leading-[1.05] tracking-[0.04em] text-white sm:text-3xl">
                {champion.teamName}
              </AdaptiveModalTitle>

              <AdaptiveModalDescription className="text-left font-medium text-base leading-relaxed text-white/55">
                {champion.tournamentName} · {champion.game}
              </AdaptiveModalDescription>
            </AdaptiveModalHeader>

            <div className="relative mt-6 flex items-center gap-2 border border-amber-400/25 bg-amber-400/5 px-3 py-2">
              <Crown className="h-4 w-4 shrink-0 text-amber-300/85" strokeWidth={1.25} />
              <span className="font-tech font-semibold text-[10px] uppercase tracking-[0.18em] text-amber-200/90">
                {crownVariantLabel(champion.crownVariant)}
              </span>
            </div>

            <dl className="relative mt-6 grid grid-cols-2 gap-4 border-y border-white/[0.08] py-5 sm:grid-cols-3">
              <div>
                <dt className="font-tech font-semibold text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Crowned
                </dt>
                <dd className="mt-1.5 font-display text-lg tracking-[0.04em] text-white">
                  {formatChampionLongDate(champion.crownedAt)}
                </dd>
              </div>
              <div>
                <dt className="font-tech font-semibold text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Prize Pool
                </dt>
                <dd className="mt-1.5 font-display text-lg tracking-[0.04em] text-white">
                  {champion.prizePool}
                </dd>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <dt className="font-tech font-semibold text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  MVP
                </dt>
                <dd className="mt-1.5 font-display text-lg tracking-[0.04em] text-white">
                  {champion.mvp ?? "—"}
                </dd>
              </div>
            </dl>

            <div className="relative mt-6">
              <p className="font-tech font-semibold text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Legacy File
              </p>
              <p className="mt-3 text-sm leading-[1.75] text-white/72">{narrative}</p>
            </div>

            <div className="relative mt-8 flex flex-wrap gap-3">
              <Link
                to="/tournaments/$id"
                params={{ id: champion.tournamentId }}
                onClick={() => onOpenChange(false)}
                className={`clip-cta font-semibold text-[10px] inline-flex h-11 items-center justify-center gap-2 border border-white/20 bg-white/6 px-5 font-tech uppercase tracking-[0.2em] text-white transition hover:bg-white/10 ${accent.cta}`}
              >
                View tournament
                <span aria-hidden>→</span>
              </Link>
              {champion.teamId && (
                <Link
                  to="/teams/$id"
                  params={{ id: champion.teamId }}
                  onClick={() => onOpenChange(false)}
                  className="inline-flex font-medium text-[10px] h-11 items-center justify-center border border-white/12 px-5 font-tech uppercase tracking-[0.2em] text-white/70 transition hover:border-white/25 hover:text-white"
                >
                  View championship roster
                </Link>
              )}
            </div>
          </div>
        </AdaptiveModalBody>
      </AdaptiveModalContent>
    </AdaptiveModal>
  );
}
