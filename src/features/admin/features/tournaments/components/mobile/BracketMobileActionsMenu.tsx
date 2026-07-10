import {
  ArrowDownToLine,
  GitBranch,
  Lock,
  LockOpen,
  MoreHorizontal,
  RotateCcw,
  Shuffle,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BracketMobileActionsMenuProps {
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
  assignedCount: number;
  teamCount: number;
  onGenerate: () => void;
  onRandomSeed: () => void;
  onAutoSeed: () => void;
  onToggleLock: () => void;
  onReset: () => void;
  onPublish: () => void;
  onMarkComplete: () => void;
}

/** Consolidates dense bracket toolbar actions into a mobile actions menu. */
export function BracketMobileActionsMenu({
  bracketGenerated,
  canGenerate,
  canPublish,
  isPublished,
  isSaving,
  resultsLocked,
  seedingLocked,
  seedingShuffleDisabled,
  showMarkComplete,
  assignedCount,
  teamCount,
  onGenerate,
  onRandomSeed,
  onAutoSeed,
  onToggleLock,
  onReset,
  onPublish,
  onMarkComplete,
}: BracketMobileActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="touch-target min-h-11 gap-1.5 font-tech text-[10px] uppercase tracking-wider md:hidden"
        >
          <MoreHorizontal className="h-4 w-4" />
          Bracket actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
          Seeding · {assignedCount}/{teamCount}
        </DropdownMenuLabel>
        {!bracketGenerated ? (
          <DropdownMenuItem disabled={!canGenerate || resultsLocked} onClick={onGenerate}>
            <GitBranch className="mr-2 h-4 w-4" />
            Generate bracket
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem disabled={seedingShuffleDisabled} onClick={onAutoSeed}>
          <ArrowDownToLine className="mr-2 h-4 w-4" />
          Auto seed
        </DropdownMenuItem>
        <DropdownMenuItem disabled={seedingShuffleDisabled} onClick={onRandomSeed}>
          <Shuffle className="mr-2 h-4 w-4" />
          Random seed
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isPublished || resultsLocked} onClick={onToggleLock}>
          {seedingLocked ? (
            <Lock className="mr-2 h-4 w-4" />
          ) : (
            <LockOpen className="mr-2 h-4 w-4" />
          )}
          {seedingLocked ? "Unlock seeding" : "Lock seeding"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
          Bracket
        </DropdownMenuLabel>
        <DropdownMenuItem disabled={resultsLocked || isSaving} onClick={onReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset bracket
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canPublish || isPublished || isSaving} onClick={onPublish}>
          <Upload className="mr-2 h-4 w-4" />
          {isSaving ? "Saving…" : "Publish"}
        </DropdownMenuItem>
        {showMarkComplete ? (
          <DropdownMenuItem disabled={isSaving} onClick={onMarkComplete}>
            Mark complete
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
