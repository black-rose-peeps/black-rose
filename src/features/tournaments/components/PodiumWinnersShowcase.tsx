import { Crown, Medal, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
    accent: "text-amber-200",
    accentBorder: "border-amber-300/40",
    accentLine: "bg-amber-300/50",
    accentGlow: "shadow-[0_0_48px_-12px_rgba(251,191,36,0.35)]",
    accentBg: "from-amber-400/12 via-amber-500/4 to-transparent",
    badge: "border-amber-300/35 bg-amber-400/10 text-amber-100",
    name: "text-amber-50",
    watermark: "text-amber-300/8",
    pedestal: "h-32 md:h-40",
  },
  2: {
    rank: 2,
    label: "2nd Place",
    medal: Medal,
    accent: "text-zinc-300",
    accentBorder: "border-zinc-400/30",
    accentLine: "bg-zinc-400/40",
    accentGlow: "shadow-[0_0_32px_-14px_rgba(212,212,216,0.25)]",
    accentBg: "from-zinc-300/10 via-zinc-400/4 to-transparent",
    badge: "border-zinc-400/25 bg-zinc-300/8 text-zinc-200",
    name: "text-zinc-100",
    watermark: "text-zinc-400/8",
    pedestal: "h-24 md:h-28",
  },
  3: {
    rank: 3,
    label: "3rd Place",
    medal: Trophy,
    accent: "text-orange-300/90",
    accentBorder: "border-orange-400/25",
    accentLine: "bg-orange-400/35",
    accentGlow: "shadow-[0_0_28px_-16px_rgba(251,146,60,0.28)]",
    accentBg: "from-orange-400/10 via-orange-500/4 to-transparent",
    badge: "border-orange-400/25 bg-orange-400/8 text-orange-200",
    name: "text-orange-50",
    watermark: "text-orange-400/8",
    pedestal: "h-20 md:h-24",
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
    <div className="relative mb-8 flex items-center gap-3">
      <span className="h-px w-6 bg-white/15" />
      <span className="font-tech text-[10px] uppercase tracking-wider-2 text-white/45">
        Tournament Results
      </span>
      <Separator className="flex-1 bg-white/10" />
      <span className="font-display text-xs uppercase tracking-wider text-white/30">{label}</span>
      <span className="h-px w-6 bg-white/10" />
    </div>
  );
}

function TechCorners({ accent }: { accent?: string }) {
  const border = accent ?? "border-white/20";
  return (
    <>
      <span
        className={cn(
          "pointer-events-none absolute left-0 top-0 h-2.5 w-2.5 border-l border-t",
          border,
        )}
      />
      <span
        className={cn(
          "pointer-events-none absolute right-0 top-0 h-2.5 w-2.5 border-r border-t",
          border,
        )}
      />
      <span
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 h-2.5 w-2.5 border-b border-l",
          border,
        )}
      />
      <span
        className={cn(
          "pointer-events-none absolute bottom-0 right-0 h-2.5 w-2.5 border-b border-r",
          border,
        )}
      />
    </>
  );
}

function RankBadge({ theme, label }: { theme: RankTheme; label: string }) {
  const Icon = theme.medal;
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-none px-2.5 py-0.5 font-tech text-[9px] uppercase tracking-wider-2",
        theme.badge,
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={1.75} />
      {label}
    </Badge>
  );
}

function TeamBlock({
  placement,
  theme,
  tag,
  nameSize,
  align = "center",
}: {
  placement: TournamentPlacement;
  theme: RankTheme;
  tag?: string;
  nameSize: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("space-y-2", align === "left" ? "text-left" : "text-center")}>
      <RankBadge theme={theme} label={placement.label || theme.label} />
      <p
        className={cn(
          "font-display tracking-display leading-snug text-balance wrap-break-word",
          nameSize,
          theme.name,
        )}
      >
        {placement.team}
      </p>
      {tag && (
        <p
          className={cn(
            "font-tech text-[10px] uppercase tracking-wider-2 opacity-70",
            theme.accent,
          )}
        >
          [{tag}]
        </p>
      )}
      {placement.prize && (
        <p className={cn("font-display text-lg tabular-nums tracking-display", theme.accent)}>
          {placement.prize}
        </p>
      )}
    </div>
  );
}

/** Single champion — hero spotlight with oversized rank watermark. */
function SoloWinnerLayout({
  placement,
  teamTags,
}: {
  placement: TournamentPlacement;
  teamTags?: Map<string, string>;
}) {
  const theme = RANK_THEMES[1];
  const tag = teamTags?.get(placement.team);

  return (
    <div className="relative mx-auto max-w-2xl">
      <Card
        className={cn(
          "relative overflow-hidden rounded-none border-white/10 bg-[oklch(0.08_0.005_75)] shadow-none",
          theme.accentBorder,
          theme.accentGlow,
        )}
      >
        <div
          className={cn("pointer-events-none absolute inset-0 bg-linear-to-b", theme.accentBg)}
        />
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />
        <TechCorners accent={theme.accentBorder} />

        <CardContent className="relative px-8 py-12 md:px-12 md:py-14">
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 text-center font-display text-[clamp(6rem,22vw,11rem)] leading-none tracking-display select-none",
              theme.watermark,
            )}
          >
            01
          </span>

          <div className="relative flex flex-col items-center gap-5">
            <div className={cn("h-px w-16", theme.accentLine)} />
            <TeamBlock
              placement={placement}
              theme={theme}
              tag={tag}
              nameSize="text-3xl md:text-4xl lg:text-5xl"
            />
            <div className={cn("h-px w-16", theme.accentLine)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Two finishers — split panel with champion emphasis. */
function DuoWinnersLayout({
  placements,
  teamTags,
}: {
  placements: TournamentPlacement[];
  teamTags?: Map<string, string>;
}) {
  const [first, second] = placements;
  const champion = first.rank === 1 ? first : (placements.find((p) => p.rank === 1) ?? first);
  const other = champion === first ? second : first;

  const championTheme = themeForRank(champion.rank);
  const otherTheme = themeForRank(other.rank);

  return (
    <div className="relative mx-auto max-w-4xl">
      <div className="grid gap-px border border-white/10 bg-white/10 md:grid-cols-[1.15fr_auto_1fr]">
        {/* Champion panel */}
        <Card className="clip-angle relative overflow-hidden rounded-none border-0 bg-[oklch(0.08_0.005_75)] shadow-none">
          <div
            className={cn(
              "pointer-events-none absolute inset-0 bg-linear-to-br",
              championTheme.accentBg,
            )}
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-px",
              championTheme.accentLine,
            )}
          />
          <TechCorners accent={championTheme.accentBorder} />
          <CardContent className="relative flex min-h-48 flex-col justify-center px-6 py-8 md:min-h-56 md:px-8 md:py-10">
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute right-4 top-4 font-display text-5xl tabular-nums tracking-display md:text-6xl",
                championTheme.watermark,
              )}
            >
              {String(champion.rank).padStart(2, "0")}
            </span>
            <TeamBlock
              placement={champion}
              theme={championTheme}
              tag={teamTags?.get(champion.team)}
              nameSize="text-2xl md:text-3xl"
              align="left"
            />
          </CardContent>
        </Card>

        {/* Divider */}
        <div className="relative hidden flex-col items-center justify-center bg-[oklch(0.06_0_0)] px-3 md:flex">
          <Separator
            orientation="vertical"
            className="absolute inset-y-4 left-1/2 h-auto -translate-x-1/2 bg-white/10"
          />
          <span className="relative z-10 font-tech text-[9px] uppercase tracking-wider-2 text-white/25">
            //
          </span>
        </div>

        {/* Runner-up panel */}
        <Card className="relative overflow-hidden rounded-none border-0 bg-[oklch(0.07_0_0)] shadow-none">
          <div
            className={cn(
              "pointer-events-none absolute inset-0 bg-linear-to-bl",
              otherTheme.accentBg,
            )}
          />
          <TechCorners accent={otherTheme.accentBorder} />
          <CardContent className="relative flex min-h-40 flex-col justify-center px-6 py-8 md:min-h-56 md:px-8 md:py-10">
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute right-4 top-4 font-display text-4xl tabular-nums tracking-display md:text-5xl",
                otherTheme.watermark,
              )}
            >
              {String(other.rank).padStart(2, "0")}
            </span>
            <TeamBlock
              placement={other}
              theme={otherTheme}
              tag={teamTags?.get(other.team)}
              nameSize="text-xl md:text-2xl"
              align="left"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Three finishers — angular podium columns (2nd · 1st · 3rd). */
function PodiumSlot({
  placement,
  theme,
  tag,
}: {
  placement: TournamentPlacement;
  theme: RankTheme;
  tag?: string;
}) {
  const isChampion = theme.rank === 1;

  return (
    <div
      className={cn(
        "relative flex flex-col",
        theme.rank === 2 && "md:order-1 md:mt-6",
        theme.rank === 1 && "md:order-2",
        theme.rank === 3 && "md:order-3 md:mt-10",
      )}
    >
      <Card
        className={cn(
          "clip-angle relative flex-1 overflow-hidden rounded-none border-white/10 bg-[oklch(0.08_0.005_75)] shadow-none",
          theme.accentBorder,
          isChampion && theme.accentGlow,
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b",
            theme.accentBg,
          )}
        />
        <TechCorners accent={theme.accentBorder} />
        <CardContent
          className={cn(
            "relative flex flex-col items-center gap-4 px-4",
            isChampion ? "py-8 md:py-10" : "py-6 md:py-8",
          )}
        >
          <TeamBlock
            placement={placement}
            theme={theme}
            tag={tag}
            nameSize={isChampion ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"}
          />
        </CardContent>
      </Card>

      <div
        className={cn(
          "relative mt-px flex items-end justify-center border border-t-0 border-white/10 bg-[oklch(0.06_0_0)]",
          theme.pedestal,
        )}
      >
        <div className={cn("absolute inset-x-0 top-0 h-px", theme.accentLine)} />
        <span
          className={cn("pb-3 font-display text-3xl tabular-nums tracking-display", theme.accent)}
        >
          {String(theme.rank).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

function TriPodiumLayout({
  placements,
  teamTags,
}: {
  placements: TournamentPlacement[];
  teamTags?: Map<string, string>;
}) {
  return (
    <div className="relative grid items-stretch gap-4 md:grid-cols-3 md:gap-3">
      {PODIUM_ORDER.map((theme) => {
        const placement = placementForRank(placements, theme.rank);
        if (!placement) return null;

        return (
          <PodiumSlot
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

function AlsoPlacedList({
  extras,
  teamTags,
}: {
  extras: TournamentPlacement[];
  teamTags?: Map<string, string>;
}) {
  if (extras.length === 0) return null;

  return (
    <Card className="relative mt-8 overflow-hidden rounded-none border-white/10 bg-[oklch(0.07_0_0)] shadow-none">
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
                    {tag ? `[${tag}] · ` : ""}
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
    </Card>
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
  const count = topPlacements.length;

  const hasFullPodium =
    placementForRank(placements, 1) !== null &&
    placementForRank(placements, 2) !== null &&
    placementForRank(placements, 3) !== null;

  const headerLabel =
    count === 1 ? "Winner" : count === 2 ? "Finalists" : hasFullPodium ? "Podium" : "Top Finishers";

  return (
    <section className={cn("relative overflow-hidden", className)}>
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />

      <SectionHeader label={headerLabel} />

      {count === 1 && <SoloWinnerLayout placement={topPlacements[0]} teamTags={teamTags} />}
      {count === 2 && <DuoWinnersLayout placements={topPlacements} teamTags={teamTags} />}
      {count >= 3 && hasFullPodium && (
        <TriPodiumLayout placements={placements} teamTags={teamTags} />
      )}
      {count >= 3 && !hasFullPodium && (
        <div className="flex flex-col gap-4">
          {topPlacements.map((placement) => {
            const theme = themeForRank(placement.rank);
            return (
              <Card
                key={`${placement.rank}-${placement.team}`}
                className={cn(
                  "clip-angle relative overflow-hidden rounded-none border-white/10 bg-[oklch(0.08_0.005_75)] shadow-none",
                  theme.accentBorder,
                )}
              >
                <TechCorners accent={theme.accentBorder} />
                <CardContent className="relative px-6 py-6">
                  <TeamBlock
                    placement={placement}
                    theme={theme}
                    tag={teamTags?.get(placement.team)}
                    nameSize="text-xl md:text-2xl"
                    align="left"
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlsoPlacedList extras={extras} teamTags={teamTags} />
    </section>
  );
}
