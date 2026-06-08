import { Crown, Medal, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TournamentPlacement } from "../utils/tournament-placements";

interface PodiumWinnersShowcaseProps {
  placements: TournamentPlacement[];
  teamTags?: Map<string, string>;
  className?: string;
}

const RANK_THEMES = {
  1: {
    rank: 1,
    label: "Champion",
    medal: Crown,
    pedestal: "from-amber-300/30 via-amber-400/12 to-amber-600/5",
    border: "border-amber-300/45",
    glow: "shadow-[0_0_56px_-10px_rgba(251,191,36,0.55)]",
    badge: "bg-linear-to-br from-amber-200 via-amber-300/90 to-amber-500/70 text-amber-950",
    name: "text-amber-50",
    accent: "text-amber-200",
    icon: "text-amber-300",
    height: "h-36 md:h-44",
  },
  2: {
    rank: 2,
    label: "2nd Place",
    medal: Medal,
    pedestal: "from-zinc-300/25 via-zinc-400/10 to-zinc-500/5",
    border: "border-zinc-300/35",
    glow: "shadow-[0_0_40px_-12px_rgba(212,212,216,0.45)]",
    badge: "bg-linear-to-br from-zinc-200/90 via-zinc-300/70 to-zinc-500/50 text-zinc-950",
    name: "text-zinc-100",
    accent: "text-zinc-300",
    icon: "text-zinc-300/80",
    height: "h-28 md:h-32",
  },
  3: {
    rank: 3,
    label: "3rd Place",
    medal: Trophy,
    pedestal: "from-orange-400/20 via-amber-700/10 to-orange-900/5",
    border: "border-orange-400/30",
    glow: "shadow-[0_0_36px_-14px_rgba(251,146,60,0.4)]",
    badge: "bg-linear-to-br from-orange-300/90 via-amber-600/70 to-orange-800/60 text-orange-950",
    name: "text-orange-100",
    accent: "text-orange-300/90",
    icon: "text-orange-300/75",
    height: "h-24 md:h-28",
  },
} as const;

type RankTheme = (typeof RANK_THEMES)[keyof typeof RANK_THEMES];

const PODIUM_ORDER: RankTheme[] = [RANK_THEMES[2], RANK_THEMES[1], RANK_THEMES[3]];

function placementForRank(placements: TournamentPlacement[], rank: number) {
  return placements.find((entry) => entry.rank === rank) ?? null;
}

function getTopPlacements(placements: TournamentPlacement[]) {
  return placements.filter((entry) => entry.rank <= 3).sort((a, b) => a.rank - b.rank);
}

function themeForRank(rank: number): RankTheme {
  return RANK_THEMES[rank as keyof typeof RANK_THEMES] ?? RANK_THEMES[3];
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="relative mb-6 flex items-center gap-3">
      <span className="h-px w-8 bg-amber-300/30" />
      <span className="font-tech text-[10px] uppercase tracking-wider-2 text-amber-200/70">
        Tournament Results
      </span>
      <span className="h-px flex-1 bg-white/10" />
      <span className="font-display text-sm uppercase tracking-wider text-white/35">{label}</span>
      <span className="h-px w-8 bg-amber-300/20" />
    </div>
  );
}

function TeamIdentity({
  name,
  tag,
  label,
  theme,
  nameSize,
  align = "center",
}: {
  name: string;
  tag?: string;
  label: string;
  theme: RankTheme;
  nameSize: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("space-y-1.5", align === "left" && "text-left")}>
      <p className={cn("font-tech text-[10px] uppercase tracking-wider-2", theme.accent)}>{label}</p>
      <p
        className={cn(
          "font-display tracking-display leading-snug text-balance wrap-break-word",
          nameSize,
          theme.name,
        )}
      >
        {name}
      </p>
      {tag && (
        <p className={cn("font-tech text-[10px] uppercase tracking-wider-2 opacity-80", theme.accent)}>
          Tag · {tag}
        </p>
      )}
    </div>
  );
}

/** Horizontal winner card — used when fewer than 3 podium spots are filled. */
function WinnerResultCard({
  placement,
  theme,
  tag,
  emphasized = false,
}: {
  placement: TournamentPlacement;
  theme: RankTheme;
  tag?: string;
  emphasized?: boolean;
}) {
  const Icon = theme.medal;

  return (
    <article
      className={cn(
        "relative overflow-hidden border backdrop-blur-sm",
        theme.border,
        theme.glow,
        "bg-[oklch(0.09_0.01_75)]",
        emphasized ? "px-6 py-7 md:px-8 md:py-8" : "px-5 py-5 md:px-6 md:py-6",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 bg-linear-to-b to-transparent",
          theme.pedestal,
          emphasized ? "h-28" : "h-20",
        )}
      />
      <div className="pointer-events-none absolute left-0 top-0 h-full w-px bg-linear-to-b from-white/20 via-white/10 to-transparent" />

      <div className="relative flex items-center gap-4 md:gap-6">
        <div
          className={cn(
            "grid shrink-0 place-items-center rounded-full border",
            theme.border,
            theme.badge,
            emphasized ? "h-12 w-12" : "h-10 w-10",
          )}
        >
          <Icon
            className={cn(emphasized ? "h-5 w-5" : "h-4 w-4", theme.icon)}
            strokeWidth={1.75}
          />
        </div>

        <div className="min-w-0 flex-1">
          <TeamIdentity
            name={placement.team}
            tag={tag}
            label={placement.label || theme.label}
            theme={theme}
            nameSize={emphasized ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"}
            align="left"
          />
        </div>

        <div className="shrink-0 text-right">
          <span
            className={cn(
              "font-display tabular-nums tracking-display",
              emphasized ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl",
              theme.accent,
              "opacity-90",
            )}
          >
            {String(placement.rank).padStart(2, "0")}
          </span>
          {placement.prize && (
            <p className={cn("mt-1 font-display text-lg tabular-nums tracking-display", theme.accent)}>
              {placement.prize}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

/** Classic 2nd–1st–3rd podium — only when all three ranks are decided. */
function PodiumColumn({
  placement,
  theme,
  tag,
}: {
  placement: TournamentPlacement;
  theme: RankTheme;
  tag?: string;
}) {
  const Icon = theme.medal;
  const isChampion = theme.rank === 1;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center text-center",
        theme.rank === 2 && "order-1",
        theme.rank === 1 && "order-2 md:-mt-4",
        theme.rank === 3 && "order-3",
      )}
    >
      <div
        className={cn(
          "relative mb-3 w-full max-w-60 border px-4 py-5 backdrop-blur-sm",
          theme.border,
          theme.glow,
          "bg-[oklch(0.09_0.01_75)]",
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b to-transparent",
            theme.pedestal,
          )}
        />

        <div className="relative flex flex-col items-center gap-3">
          <div
            className={cn("grid h-9 w-9 place-items-center rounded-full border", theme.border, theme.badge)}
          >
            <Icon className={cn("h-4 w-4", theme.icon)} strokeWidth={1.75} />
          </div>

          <TeamIdentity
            name={placement.team}
            tag={tag}
            label={placement.label || theme.label}
            theme={theme}
            nameSize={isChampion ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"}
          />

          {placement.prize && (
            <p className={cn("font-display text-lg tabular-nums tracking-display", theme.accent)}>
              {placement.prize}
            </p>
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex w-full max-w-60 items-end justify-center border-x border-b px-3 pb-2 pt-6",
          theme.height,
          theme.border,
          "bg-linear-to-t",
          theme.pedestal,
        )}
      >
        <span className={cn("font-display text-4xl tabular-nums tracking-display opacity-80", theme.accent)}>
          {String(theme.rank).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

function WinnerResultsLayout({
  placements,
  teamTags,
}: {
  placements: TournamentPlacement[];
  teamTags?: Map<string, string>;
}) {
  const count = placements.length;

  return (
    <div className="relative mx-auto flex max-w-3xl flex-col gap-4">
      {placements.map((placement) => {
        const theme = themeForRank(placement.rank);
        return (
          <WinnerResultCard
            key={`${placement.rank}-${placement.team}`}
            placement={placement}
            theme={theme}
            tag={teamTags?.get(placement.team)}
            emphasized={count === 1 && placement.rank === 1}
          />
        );
      })}
    </div>
  );
}

function FullPodiumLayout({
  placements,
  teamTags,
}: {
  placements: TournamentPlacement[];
  teamTags?: Map<string, string>;
}) {
  return (
    <div className="relative grid items-end gap-3 md:grid-cols-3 md:gap-4">
      {PODIUM_ORDER.map((theme) => {
        const placement = placementForRank(placements, theme.rank);
        if (!placement) return null;

        return (
          <PodiumColumn
            key={theme.rank}
            placement={placement}
            theme={theme}
            tag={teamTags?.get(placement.team)}
          />
        );
      })}
    </div>
  );
}

export function PodiumWinnersShowcase({
  placements,
  teamTags,
  className,
}: PodiumWinnersShowcaseProps) {
  const topPlacements = getTopPlacements(placements);
  if (topPlacements.length === 0) return null;

  const extras = placements.filter((entry) => entry.rank > 3);
  const hasFullPodium =
    placementForRank(placements, 1) !== null &&
    placementForRank(placements, 2) !== null &&
    placementForRank(placements, 3) !== null;

  const headerLabel = hasFullPodium
    ? "Podium"
    : topPlacements.length === 1
      ? "Winner"
      : "Top Finishers";

  return (
    <section className={cn("relative overflow-hidden", className)}>
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-amber-300/30 to-transparent" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[min(100%,36rem)] -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />

      <SectionHeader label={headerLabel} />

      {hasFullPodium ? (
        <FullPodiumLayout placements={placements} teamTags={teamTags} />
      ) : (
        <WinnerResultsLayout placements={topPlacements} teamTags={teamTags} />
      )}

      {extras.length > 0 && (
        <div className="relative mt-8 border border-white/10 bg-[oklch(0.07_0_0)]">
          <div className="border-b border-white/8 px-5 py-3">
            <p className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
              Also placed
            </p>
          </div>
          <ul className="divide-y divide-white/6">
            {extras.map((placement) => {
              const tag = teamTags?.get(placement.team);
              return (
                <li
                  key={`${placement.rank}-${placement.team}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-8 shrink-0 font-display text-lg tabular-nums tracking-display text-white/25">
                      {String(placement.rank).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-base tracking-display text-white/90 wrap-break-word">
                        {placement.team}
                      </p>
                      <p className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
                        {tag ? `Tag · ${tag} · ` : ""}
                        {placement.label}
                      </p>
                    </div>
                  </div>
                  {placement.prize && (
                    <span className="shrink-0 font-display text-base tabular-nums tracking-display text-white/55">
                      {placement.prize}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
