import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTeam } from "@/features/admin/features/teams/services/teams.service";
import { techFieldClass } from "@/features/member/components/MemberShell";
import { GAME_OPTIONS } from "@/features/teams/constants";
import type { Team } from "@/features/teams/types";

interface EditTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team;
  onUpdated: (team: Team) => void;
}

export function EditTeamDialog({ open, onOpenChange, team, onUpdated }: EditTeamDialogProps) {
  const [name, setName] = useState(team.name);
  const [tag, setTag] = useState(team.tag);
  const [game, setGame] = useState(team.game);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(team.name);
    setTag(team.tag);
    setGame(team.game);
    setError(null);
  }, [open, team]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const updated = await updateTeam(team.id, {
        name: name.trim(),
        tag: tag.trim().toUpperCase(),
        game,
      });
      onUpdated(updated);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update team.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none border-white/12 bg-[oklch(0.08_0_0)] p-0 gap-0">
        <DialogHeader className="border-b border-white/8 px-6 py-5">
          <DialogTitle className="font-display text-2xl tracking-display">Edit Team</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Update your team name, tag, or primary game.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-5">
          <div className="space-y-2">
            <Label
              htmlFor="team-name"
              className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground"
            >
              Team Name
            </Label>
            <Input
              id="team-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              className={techFieldClass}
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="team-tag"
              className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground"
            >
              Team Tag (2–5 letters)
            </Label>
            <Input
              id="team-tag"
              required
              value={tag}
              onChange={(e) => setTag(e.target.value.toUpperCase().slice(0, 5))}
              minLength={2}
              maxLength={5}
              pattern="[A-Z]{2,5}"
              className={`${techFieldClass} font-tech uppercase tracking-wider-2`}
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="team-game"
              className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground"
            >
              Primary Game
            </Label>
            <Select
              value={game}
              onValueChange={(v) => setGame(v as Team["game"])}
              disabled={Boolean(team.activeTournamentId)}
            >
              <SelectTrigger id="team-game" className={techFieldClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none border-white/12 bg-[oklch(0.1_0_0)]">
                {GAME_OPTIONS.filter((g) => g.value !== "Multi").map((g) => (
                  <SelectItem key={g.value} value={g.value} className="font-tech text-xs">
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {team.activeTournamentId && (
              <p className="text-[10px] text-muted-foreground/60">
                Game cannot be changed while registered for a tournament.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-none border-white/15 font-tech text-[10px] uppercase tracking-wider-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="clip-cta rounded-none bg-white font-tech text-[10px] uppercase tracking-wider-2 text-black hover:bg-white/90"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
