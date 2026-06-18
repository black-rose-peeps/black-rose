import {
  ArrowDownToLine,
  GitBranch,
  Lock,
  LockOpen,
  RotateCcw,
  Shuffle,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BracketStatus } from "@/features/admin/types";

interface BracketStat {
  label: string;
  value: string | number;
  accent?: boolean;
}

interface BracketManagerHeaderProps {
  tournamentName: string;
  game: string;
  region: string;
  format: string;
  startDate: string;
  teamCount: number;
  teamCap: number;
  assignedCount: number;
  stats: BracketStat[];
  bracketStatus: BracketStatus;
  bracketGenerated: boolean;
  canGenerate: boolean;
  canPublish: boolean;
  isPublished: boolean;
  isSaving: boolean;
  resultsLocked: boolean;
  seedingLocked: boolean;
  seedingShuffleDisabled: boolean;
  hasBracketProgress: boolean;
  showMarkComplete: boolean;
  onGenerate: () => void;
  onRandomSeed: () => void;
  onAutoSeed: () => void;
  onToggleLock: () => void;
  onReset: () => void;
  onPublish: () => void;
  onMarkComplete: () => void;
}

function bracketStatusLabel(status: BracketStatus): string {
  if (status === "published") return "Published";
  if (status === "draft") return "Draft";
  return "Not generated";
}

function bracketStatusClass(status: BracketStatus): string {
  if (status === "published") return "border-foreground/30 bg-foreground/10 text-foreground";
  if (status === "draft") return "border-amber-400/40 bg-amber-400/10 text-amber-300";
  return "border-border bg-secondary/40 text-muted-foreground";
}

export function BracketManagerHeader({
  tournamentName,
  game,
  region,
  format,
  startDate,
  teamCount,
  teamCap,
  assignedCount,
  stats,
  bracketStatus,
  bracketGenerated,
  canGenerate,
  canPublish,
  isPublished,
  isSaving,
  resultsLocked,
  seedingLocked,
  seedingShuffleDisabled,
  hasBracketProgress,
  showMarkComplete,
  onGenerate,
  onRandomSeed,
  onAutoSeed,
  onToggleLock,
  onReset,
  onPublish,
  onMarkComplete,
}: BracketManagerHeaderProps) {
  const shuffleTitle =
    bracketGenerated && hasBracketProgress
      ? "Reset the bracket to reshuffle seeds after match results exist"
      : undefined;

  return (
    <div className="border-b border-border">
      <div className="relative overflow-hidden px-6 py-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                {game} · {region}
              </p>
              <h2 className="mt-1 font-title tracking-display text-2xl lg:text-3xl">
                {tournamentName}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {format} · {teamCount}/{teamCap} approved teams · Starts {startDate}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {resultsLocked && (
                <Badge
                  variant="outline"
                  className="font-tech text-[10px] uppercase tracking-wider text-violet-300 border-violet-400/40"
                >
                  Results locked
                </Badge>
              )}
              {isPublished && !resultsLocked && (
                <Badge variant="outline" className="font-tech text-[10px] uppercase tracking-wider">
                  Match management active
                </Badge>
              )}
              <span
                className={cn(
                  "inline-flex items-center px-3 py-1 font-tech text-[10px] uppercase tracking-wider border",
                  bracketStatusClass(bracketStatus),
                )}
              >
                {bracketStatusLabel(bracketStatus)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-card px-4 py-3">
                <p className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                  {stat.label}
                </p>
                <p
                  className={cn(
                    "mt-0.5 truncate font-display text-lg font-bold tracking-wider",
                    stat.accent && "text-amber-400",
                  )}
                  title={typeof stat.value === "string" ? stat.value : undefined}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-card/40 px-6 py-4 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-1 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
            Seeding
          </p>
          {!bracketGenerated && (
            <Button
              type="button"
              size="sm"
              disabled={!canGenerate || resultsLocked}
              onClick={onGenerate}
              className="gap-1.5 font-tech text-[10px] uppercase tracking-wider"
            >
              <GitBranch className="h-3.5 w-3.5" />
              Generate bracket
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={seedingShuffleDisabled}
            title={shuffleTitle}
            onClick={onAutoSeed}
            className="gap-1.5 font-tech text-[10px] uppercase tracking-wider"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            Auto seed
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={seedingShuffleDisabled}
            title={shuffleTitle}
            onClick={onRandomSeed}
            className="gap-1.5 font-tech text-[10px] uppercase tracking-wider text-amber-400 hover:text-amber-300"
          >
            <Shuffle className="h-3.5 w-3.5" />
            Random seed
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPublished || resultsLocked}
            onClick={onToggleLock}
            className={cn(
              "gap-1.5 font-tech text-[10px] uppercase tracking-wider",
              seedingLocked && "border-amber-400/30 bg-amber-400/10 text-amber-300",
            )}
          >
            {seedingLocked ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <LockOpen className="h-3.5 w-3.5" />
            )}
            {seedingLocked ? "Seeding locked" : "Lock seeding"}
          </Button>
          <span className="hidden text-[10px] text-muted-foreground sm:inline">
            {assignedCount}/{teamCount} seeded
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-1 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
            Bracket
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={resultsLocked || isSaving}
            title={resultsLocked ? "Reset is disabled for completed tournaments" : undefined}
            onClick={onReset}
            className="gap-1.5 font-tech text-[10px] uppercase tracking-wider text-destructive hover:text-destructive"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canPublish || isPublished || isSaving}
            onClick={onPublish}
            className="gap-1.5 font-tech text-[10px] uppercase tracking-wider"
          >
            <Upload className="h-3.5 w-3.5" />
            {isSaving ? "Saving…" : "Publish"}
          </Button>
          {showMarkComplete && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={onMarkComplete}
              className="gap-1.5 border-emerald-400/40 bg-emerald-950/20 font-tech text-[10px] uppercase tracking-wider text-emerald-400 hover:bg-emerald-950/40"
            >
              Mark complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
