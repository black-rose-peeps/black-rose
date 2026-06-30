import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TOURNAMENT_RULES_FILE_ACCEPT,
  TOURNAMENT_RULES_FILE_MAX_BYTES,
} from "../constants";
import { rulesFileDisplayName } from "../services/tournament-rules-file.service";

interface TournamentRulesFileFieldProps {
  id: string;
  existingUrl?: string;
  selectedFile: File | null;
  markedForRemoval?: boolean;
  onSelectFile: (file: File | null) => void;
  onMarkForRemoval?: () => void;
  onUndoRemoval?: () => void;
  disabled?: boolean;
  error?: string;
}

export function TournamentRulesFileField({
  id,
  existingUrl,
  selectedFile,
  markedForRemoval,
  onSelectFile,
  onMarkForRemoval,
  onUndoRemoval,
  disabled,
  error,
}: TournamentRulesFileFieldProps) {
  const hasExisting = !!existingUrl && !markedForRemoval && !selectedFile;
  const maxMb = Math.round(TOURNAMENT_RULES_FILE_MAX_BYTES / (1024 * 1024));

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Official Ruleset File</Label>

      {hasExisting && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-background/40 px-3 py-2">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <a
            href={existingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate text-sm text-foreground underline-offset-2 hover:underline"
          >
            {rulesFileDisplayName(existingUrl)}
          </a>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onMarkForRemoval?.()}
          >
            Remove
          </Button>
        </div>
      )}

      {markedForRemoval && !selectedFile && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-muted-foreground">
          <span>Current rules file will be removed on save.</span>
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onUndoRemoval?.()}>
            Undo
          </Button>
        </div>
      )}

      {selectedFile && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-background/40 px-3 py-2">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm">{selectedFile.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={disabled}
            onClick={() => onSelectFile(null)}
            aria-label="Clear selected file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Input
        id={id}
        type="file"
        accept={TOURNAMENT_RULES_FILE_ACCEPT}
        disabled={disabled}
        className="cursor-pointer bg-background/50 file:mr-3 file:cursor-pointer file:border-0 file:bg-transparent file:font-tech file:text-[10px] file:uppercase file:tracking-wider"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          onSelectFile(file);
          event.target.value = "";
        }}
      />

      <p className="text-xs text-muted-foreground">
        Optional. Upload the full event rules (PDF or Word, up to {maxMb}MB). Shown on the public
        Rules tab for download.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
