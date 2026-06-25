import type { ReactNode } from "react";
import {
  ArrowDownToLine,
  GitBranch,
  Lock,
  LockOpen,
  RotateCcw,
  Shuffle,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BracketStatus } from "@/features/admin/types";
import { FeaturePanelHeader } from "@/features/shared/components/FeaturePanelShell";
import { useIsMobile } from "@/hooks/use-mobile";
import { BracketMobileActionsMenu } from "@/features/admin/features/tournaments/components/mobile";

interface BracketStat {
  label: string;
  value: string | number;
  accent?: boolean;
}

interface BracketManagerHeaderProps {
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
  subTabs?: ReactNode;
}

function bracketStatusLabel(status: BracketStatus): string {
  if (status === "published") return "Published";
  if (status === "draft") return "Draft";
  return "Not generated";
}

function bracketStatusClass(status: BracketStatus): string {
  if (status === "published") return "border-emerald-400/35 bg-emerald-400/10 text-emerald-300";
  if (status === "draft") return "border-amber-400/40 bg-amber-400/10 text-amber-300";
  return "border-white/15 bg-white/[0.03] text-white/45";
}

export function BracketManagerHeader({
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
  subTabs,
}: BracketManagerHeaderProps) {
  const isMobile = useIsMobile();
  const shuffleTitle =
    bracketGenerated && hasBracketProgress
      ? "Reset the bracket to reshuffle seeds after match results exist"
      : undefined;

  const statusBadges = (
    <>
      {resultsLocked && (
        <span className="inline-flex items-center border border-violet-400/35 bg-violet-400/10 px-2.5 py-1 font-tech text-[9px] uppercase tracking-wider text-violet-300">
          Results locked
        </span>
      )}
      {isPublished && !resultsLocked && (
        <span className="inline-flex items-center border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 font-tech text-[9px] uppercase tracking-wider text-sky-300">
          Match management active
        </span>
      )}
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-1 font-tech text-[9px] uppercase tracking-wider border",
          bracketStatusClass(bracketStatus),
        )}
      >
        {bracketStatusLabel(bracketStatus)}
      </span>
    </>
  );

  return (
    <div className="relative mb-6">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.22]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative overflow-hidden border border-white/[0.08] bg-[oklch(0.07_0_0)]">
        <FeaturePanelHeader
          embedded
          eyebrow={`Admin Console · ${game} · ${region}`}
          title="Bracket Management"
          subtitle={`${format} · ${teamCount}/${teamCap} approved teams · Starts ${startDate}`}
          stats={stats}
          headerExtra={statusBadges}
        />

        <div className="relative border-t border-white/[0.06] bg-[oklch(0.06_0_0)]">
        {isMobile ? (
          <div className="flex items-center justify-end gap-2 border-b border-white/[0.06] px-4 py-3">
            <BracketMobileActionsMenu
              bracketGenerated={bracketGenerated}
              canGenerate={canGenerate}
              canPublish={canPublish}
              isPublished={isPublished}
              isSaving={isSaving}
              resultsLocked={resultsLocked}
              seedingLocked={seedingLocked}
              seedingShuffleDisabled={seedingShuffleDisabled}
              hasBracketProgress={hasBracketProgress}
              showMarkComplete={showMarkComplete}
              assignedCount={assignedCount}
              teamCount={teamCount}
              onGenerate={onGenerate}
              onRandomSeed={onRandomSeed}
              onAutoSeed={onAutoSeed}
              onToggleLock={onToggleLock}
              onReset={onReset}
              onPublish={onPublish}
              onMarkComplete={onMarkComplete}
            />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-5 py-3 sm:px-6">
              <p className="mr-1 font-tech text-[9px] uppercase tracking-[0.18em] text-white/35">
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
                className="gap-1.5 border-white/10 bg-white/[0.02] font-tech text-[10px] uppercase tracking-wider hover:bg-white/[0.05]"
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
                className="gap-1.5 border-white/10 bg-white/[0.02] font-tech text-[10px] uppercase tracking-wider text-amber-300 hover:bg-white/[0.05] hover:text-amber-200"
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
                  seedingLocked
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]",
                )}
              >
                {seedingLocked ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <LockOpen className="h-3.5 w-3.5" />
                )}
                {seedingLocked ? "Seeding locked" : "Lock seeding"}
              </Button>
              <span className="hidden text-[10px] text-white/35 sm:inline">
                {assignedCount}/{teamCount} seeded
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 px-5 py-3 sm:px-6">
              <p className="mr-1 font-tech text-[9px] uppercase tracking-[0.18em] text-white/35">
                Bracket
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={resultsLocked || isSaving}
                title={resultsLocked ? "Reset is disabled for completed tournaments" : undefined}
                onClick={onReset}
                className="gap-1.5 border-white/10 bg-white/[0.02] font-tech text-[10px] uppercase tracking-wider text-red-400 hover:bg-white/[0.05] hover:text-red-300"
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
          </>
        )}
        </div>
        {subTabs}
      </div>
    </div>
  );
}
