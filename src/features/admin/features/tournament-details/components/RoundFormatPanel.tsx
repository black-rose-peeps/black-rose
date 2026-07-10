import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { sortBracketRoundsByFlow } from "@/features/tournaments/utils/bracket-round-order";
import type { BestOfFormat, BracketRoundMeta } from "../utils/managed-bracket";
import { defaultRoundFormats } from "../utils/managed-bracket";

const FORMAT_OPTIONS: BestOfFormat[] = ["BO1", "BO3", "BO5"];

interface FormatGroup {
  id: string;
  title: string;
  hint: string;
  roundIds: string[];
}

function buildFormatGroups(roundMetas: BracketRoundMeta[], isDoubleElim: boolean): FormatGroup[] {
  const ids = new Set(roundMetas.map((round) => round.id));

  if (!isDoubleElim) {
    const seRounds = sortBracketRoundsByFlow(
      roundMetas.filter(
        (round) =>
          round.id.startsWith("se-r") ||
          round.side === "main" ||
          round.id === "pi-r1" ||
          round.id.startsWith("po-r") ||
          round.id === "po-3rd",
      ),
    );
    const grand = roundMetas.filter((round) => round.side === "grand");
    const groups: FormatGroup[] = [];

    if (seRounds.length > 0) {
      const early = seRounds.slice(0, Math.min(1, seRounds.length)).map((round) => round.id);
      const mid = seRounds.slice(1, Math.max(1, seRounds.length - 1)).map((round) => round.id);
      const late = seRounds.slice(-1).map((round) => round.id);

      if (early.some((id) => ids.has(id))) {
        groups.push({
          id: "se-early",
          title: "Early rounds",
          hint: "Recommended BO1 for opening matches",
          roundIds: early.filter((id) => ids.has(id)),
        });
      }
      if (mid.some((id) => ids.has(id))) {
        groups.push({
          id: "se-mid",
          title: "Mid bracket",
          hint: "Recommended BO3",
          roundIds: mid.filter((id) => ids.has(id)),
        });
      }
      if (late.some((id) => ids.has(id)) && seRounds.length > 1) {
        groups.push({
          id: "se-late",
          title: "Final",
          hint: "Recommended BO5",
          roundIds: late.filter((id) => ids.has(id)),
        });
      }
    }

    if (grand.length > 0) {
      groups.push({
        id: "grand",
        title: "Grand Final",
        hint: "Recommended BO5",
        roundIds: grand.map((round) => round.id),
      });
    }

    return groups;
  }

  const groups: FormatGroup[] = [
    {
      id: "qual-early",
      title: "Qualifiers — Round 1–2",
      hint: "Opening upper round & first lower rounds (BO1)",
      roundIds: ["pi-r1", "ub-r1", "lb-r1"],
    },
    {
      id: "qual-main",
      title: "Qualifiers — Round 3",
      hint: "Upper quarterfinals & lower crossover (BO3)",
      roundIds: ["ub-qf", "lb-r2", "lb-r3"],
    },
    {
      id: "semis",
      title: "Semi-finals",
      hint: "Upper/lower quarterfinals & semis through late lower rounds (BO3)",
      roundIds: ["ub-sf", "ub-f", "lb-r6", "lb-r7", "lb-r8", "lb-r9", "lb-sf", "lb-f"],
    },
    {
      id: "grand",
      title: "Grand Finals",
      hint: "Championship & bracket reset (BO5)",
      roundIds: ["gf", "gf-reset"],
    },
  ];

  return groups
    .map((group) => ({
      ...group,
      roundIds: group.roundIds.filter(
        (id) => ids.has(id) || roundMetas.some((round) => round.id.startsWith(id)),
      ),
    }))
    .map((group) => ({
      ...group,
      roundIds: sortBracketRoundsByFlow(
        roundMetas.filter((round) => {
          if (group.roundIds.includes(round.id)) return true;
          if (group.id === "qual-early" && round.id.startsWith("lb-pd")) return true;
          if (group.id === "qual-main" && /^ub-r[2-9]$/.test(round.id)) return true;
          if (group.id === "semis" && /^lb-r[5-9]$/.test(round.id)) return true;
          return false;
        }),
      ).map((round) => round.id),
    }))
    .filter((group) => group.roundIds.length > 0);
}

interface RoundFormatPanelProps {
  roundMetas: BracketRoundMeta[];
  roundFormats: Record<string, BestOfFormat>;
  isDoubleElim: boolean;
  readOnly?: boolean;
  lockedRoundIds?: Set<string>;
  onFormatChange: (roundId: string, format: BestOfFormat) => void;
  onApplyRecommended?: () => void;
}

function FormatToggle({
  value,
  disabled,
  onChange,
}: {
  value: BestOfFormat;
  disabled?: boolean;
  onChange: (format: BestOfFormat) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border">
      {FORMAT_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option)}
          className={cn(
            "min-w-[2.75rem] px-2 py-1 font-tech text-[10px] uppercase tracking-wider transition-colors",
            value === option
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function RoundFormatPanel({
  roundMetas,
  roundFormats,
  isDoubleElim,
  readOnly,
  lockedRoundIds,
  onFormatChange,
  onApplyRecommended,
}: RoundFormatPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const roundById = useMemo(
    () => new Map(roundMetas.map((round) => [round.id, round])),
    [roundMetas],
  );
  const groups = useMemo(
    () => buildFormatGroups(roundMetas, isDoubleElim),
    [roundMetas, isDoubleElim],
  );

  if (readOnly || roundMetas.length === 0) return null;

  return (
    <div className="mb-6 overflow-hidden border border-border bg-card/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/15 px-4 py-3">
        <div>
          <p className="font-display text-xs uppercase tracking-wider text-foreground">
            Match formats
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Sets map wins required on every match card in that round. Changes apply immediately to
            in-progress scores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onApplyRecommended && (
            <button
              type="button"
              onClick={onApplyRecommended}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 font-tech text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Recommended
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 font-tech text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            aria-expanded={expanded}
          >
            {expanded ? "Collapse" : "Expand"}
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="divide-y divide-border">
          {groups.map((group) => (
            <div key={group.id} className="px-4 py-3">
              <div className="mb-3">
                <p className="font-tech text-[10px] uppercase tracking-wider-2 text-foreground/90">
                  {group.title}
                </p>
                <p className="text-[11px] text-muted-foreground">{group.hint}</p>
              </div>
              <div className="space-y-2">
                {group.roundIds.map((roundId) => {
                  const round = roundById.get(roundId);
                  if (!round) return null;
                  const locked = lockedRoundIds?.has(roundId) ?? false;
                  const value = roundFormats[roundId] ?? "BO3";

                  return (
                    <div
                      key={roundId}
                      className="flex flex-col gap-2 rounded-md border border-border/70 bg-background/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-sm">{round.label}</p>
                        <p className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                          {round.matchIds.length} match{round.matchIds.length === 1 ? "" : "es"}
                          {locked ? " · locked (results entered)" : ""}
                        </p>
                      </div>
                      <FormatToggle
                        value={value}
                        disabled={locked}
                        onChange={(format) => onFormatChange(roundId, format)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function getLockedFormatRoundIds(
  matches: Array<{ roundId: string; confirmed: boolean }>,
): Set<string> {
  const locked = new Set<string>();
  for (const match of matches) {
    if (match.confirmed) locked.add(match.roundId);
  }
  return locked;
}

export function buildRecommendedRoundFormats(
  roundMetas: BracketRoundMeta[],
): Record<string, BestOfFormat> {
  return defaultRoundFormats(roundMetas);
}
