import type { ReactNode } from "react";
import { Crown, Medal, Skull, Swords, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { teamDisplayAbbr } from "../utils/team-tags";

export interface TournamentResultsEntry {
  team: string;
  tag?: string;
  placementLabel?: string;
  prize?: string;
  record?: { wins: number; losses: number };
}

export type TournamentResultsTone = "qualified" | "eliminated" | "active" | "podium";

export interface TournamentResultsSection {
  title: string;
  subtitle: string;
  count: number;
  entries: TournamentResultsEntry[];
  emptyLabel: string;
  tone: TournamentResultsTone;
  icon?: ReactNode;
}

function ResultsColumn({
  title,
  subtitle,
  count,
  entries,
  emptyLabel,
  tone,
  icon,
}: TournamentResultsSection) {
  const toneStyles = {
    qualified: {
      panel: "bg-[oklch(0.09_0_0)]",
      accent: "from-white/10 via-white/[0.03] to-transparent",
      border: "border-white/15",
      leftBar: "bg-white/70",
      title: "text-white",
      subtitle: "text-white/50",
      count: "border-white/20 bg-white/[0.06] text-white",
      rowHover: "hover:bg-white/[0.04]",
      index: "group-hover:text-white/50",
      value: "text-white",
      tag: "border-white/15 bg-white/[0.07] text-white group-hover:border-white/25 group-hover:bg-white/[0.1]",
      empty: "text-white/40",
      rowSubtitle: "text-muted-foreground/70",
    },
    podium: {
      panel: "bg-[oklch(0.09_0_0)]",
      accent: "from-white/12 via-white/[0.04] to-transparent",
      border: "border-white/20",
      leftBar: "bg-white",
      title: "text-white",
      subtitle: "text-white/55",
      count: "border-white/25 bg-white/[0.08] text-white",
      rowHover: "hover:bg-white/[0.05]",
      index: "group-hover:text-white/60",
      value: "text-white",
      tag: "border-white/20 bg-white/[0.08] text-white group-hover:border-white/30 group-hover:bg-white/[0.12]",
      empty: "text-white/40",
      rowSubtitle: "text-white/45",
    },
    eliminated: {
      panel: "bg-[oklch(0.07_0_0)]",
      accent: "from-white/[0.03] via-transparent to-transparent",
      border: "border-white/[0.08]",
      leftBar: "bg-white/20",
      title: "text-white/70",
      subtitle: "text-white/30",
      count: "border-white/10 bg-white/[0.03] text-white/50",
      rowHover: "hover:bg-white/[0.02]",
      index: "group-hover:text-white/30",
      value: "text-white/45",
      tag: "border-white/[0.08] bg-white/[0.03] text-white/40 group-hover:border-white/12",
      empty: "text-white/30",
      rowSubtitle: "text-white/30",
    },
    active: {
      panel: "bg-[oklch(0.08_0_0)]",
      accent: "from-amber-400/10 via-amber-400/[0.03] to-transparent",
      border: "border-amber-400/20",
      leftBar: "bg-amber-400/80",
      title: "text-amber-100",
      subtitle: "text-amber-400/50",
      count: "border-amber-400/25 bg-amber-400/[0.08] text-amber-200",
      rowHover: "hover:bg-amber-400/[0.04]",
      index: "group-hover:text-amber-400/50",
      value: "text-amber-100",
      tag: "border-amber-400/20 bg-amber-400/[0.06] text-amber-100 group-hover:border-amber-400/35",
      empty: "text-amber-400/40",
      rowSubtitle: "text-amber-400/45",
    },
  }[tone];

  return (
    <div
      className={cn(
        "relative flex min-h-[220px] flex-col overflow-hidden border",
        toneStyles.panel,
        toneStyles.border,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b",
          toneStyles.accent,
        )}
      />
      <div className={cn("absolute left-0 top-0 h-full w-px", toneStyles.leftBar)} />

      <div className="relative border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-white/40">{icon}</div>
            <div>
              <p className={cn("font-tech text-[10px] uppercase tracking-wider-2", toneStyles.subtitle)}>
                {subtitle}
              </p>
              <h4 className={cn("font-display text-2xl tracking-display leading-none", toneStyles.title)}>
                {title}
              </h4>
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 border px-2 py-0.5 font-display text-lg tabular-nums leading-none tracking-display",
              toneStyles.count,
            )}
          >
            {String(count).padStart(2, "0")}
          </span>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className={cn("flex flex-1 items-center px-5 py-8 text-sm", toneStyles.empty)}>{emptyLabel}</div>
      ) : (
        <ul className="relative flex-1 divide-y divide-white/[0.06]">
          {entries.map((entry, index) => (
            <li
              key={`${entry.team}-${index}`}
              className={cn("group relative px-5 py-3.5 transition-colors duration-200", toneStyles.rowHover)}
            >
              <div className="pointer-events-none absolute left-0 top-0 h-full w-px bg-linear-to-b from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "w-6 shrink-0 font-display text-base tabular-nums tracking-display text-white/20 transition-colors duration-200",
                    toneStyles.index,
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div
                  className={cn(
                    "clip-tab grid h-10 w-10 shrink-0 place-items-center border font-display text-xs tracking-display shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] transition duration-200",
                    toneStyles.tag,
                  )}
                >
                  {teamDisplayAbbr(entry.team, entry.tag)}
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate font-display text-base tracking-display md:text-lg",
                      tone === "eliminated" ? "text-white/55" : "text-white",
                    )}
                  >
                    {entry.team}
                  </p>
                  <p className={cn("font-tech text-[10px] uppercase tracking-wider-2", toneStyles.rowSubtitle)}>
                    {entry.placementLabel ??
                      (tone === "qualified"
                        ? "Qualified"
                        : tone === "eliminated"
                          ? "Out"
                          : tone === "podium"
                            ? "Placed"
                            : "In contention")}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  {entry.prize ? (
                    <>
                      <p className={cn("font-display text-xl tabular-nums leading-none tracking-display", toneStyles.value)}>
                        {entry.prize}
                      </p>
                      <p className="mt-0.5 font-tech text-[9px] uppercase tracking-wider-2 text-muted-foreground/60">
                        Prize
                      </p>
                    </>
                  ) : entry.record ? (
                    <>
                      <p className={cn("font-display text-2xl tabular-nums leading-none tracking-display", toneStyles.value)}>
                        {entry.record.wins}
                        <span className="mx-0.5 text-white/25">–</span>
                        {entry.record.losses}
                      </p>
                      <p className="mt-0.5 font-tech text-[9px] uppercase tracking-wider-2 text-muted-foreground/60">
                        W–L
                      </p>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface TournamentResultsBoardProps {
  eyebrow: string;
  headerLabel?: string;
  sections: TournamentResultsSection[];
  className?: string;
}

export function TournamentResultsBoard({
  eyebrow,
  headerLabel = "Result",
  sections,
  className,
}: TournamentResultsBoardProps) {
  const visibleSections = sections.filter((section) => section.entries.length > 0 || section.emptyLabel);
  const columnClass =
    visibleSections.length >= 3
      ? "lg:grid-cols-3"
      : visibleSections.length === 2
        ? "lg:grid-cols-2"
        : "lg:grid-cols-1";

  return (
    <section className={cn("relative", className)}>
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative mb-5 flex items-center gap-3">
        <span className="h-px w-8 bg-white/20" />
        <span className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">{eyebrow}</span>
        <span className="h-px flex-1 bg-white/10" />
        <span className="font-display text-sm uppercase tracking-wider text-white/40">{headerLabel}</span>
        <span className="h-px w-8 bg-white/20" />
      </div>

      <div
        className={cn(
          "relative grid gap-px overflow-hidden border border-white/[0.08] bg-white/[0.05]",
          columnClass,
        )}
      >
        {visibleSections.map((section) => (
          <ResultsColumn key={`${section.title}-${section.subtitle}`} {...section} />
        ))}
      </div>
    </section>
  );
}

export function placementsToResultsEntries(
  placements: Array<{ label: string; team: string; prize?: string; tag?: string }>,
): TournamentResultsEntry[] {
  return placements.map((placement) => ({
    team: placement.team,
    tag: placement.tag,
    placementLabel: placement.label,
    prize: placement.prize,
  }));
}

export { Crown, Medal, Skull, Swords, Trophy };
