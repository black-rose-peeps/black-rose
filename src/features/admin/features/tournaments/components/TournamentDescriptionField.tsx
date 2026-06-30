import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TOURNAMENT_DESCRIPTION_MAX_LENGTH } from "../constants";

interface TournamentDescriptionFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export function TournamentDescriptionField({
  id,
  value,
  onChange,
  disabled,
  error,
}: TournamentDescriptionFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>Public Description</Label>
        <span className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
          {value.length}/{TOURNAMENT_DESCRIPTION_MAX_LENGTH}
        </span>
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={TOURNAMENT_DESCRIPTION_MAX_LENGTH}
        rows={3}
        placeholder="Short summary for the tournament detail page — format, schedule highlights, community notes, etc."
        disabled={disabled}
        className="resize-none bg-background/50"
      />
      <p className="text-xs text-muted-foreground">
        Shown under the tournament title on the public page. Optional — up to{" "}
        {TOURNAMENT_DESCRIPTION_MAX_LENGTH} characters.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
