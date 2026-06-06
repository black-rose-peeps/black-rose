import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { ADMIN_TEAM_GAMES } from "../constants";
import { useUpdateTeam } from "../hooks/useUpdateTeam";
import type { CreateTeamFormValues, Team } from "../types";
import { hasFormErrors, teamToEditFormValues, validateEditTeamForm } from "../utils";

interface EditTeamModalProps {
  open: boolean;
  team: Team | null;
  existingTeams: Team[];
  onClose: () => void;
  onUpdated: (team: Team) => void;
}

export function EditTeamModal({ open, team, existingTeams, onClose, onUpdated }: EditTeamModalProps) {
  const [values, setValues] = useState<Pick<CreateTeamFormValues, "name" | "tag" | "game">>({
    name: "",
    tag: "",
    game: "Valorant",
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof Pick<CreateTeamFormValues, "name" | "tag">, string>>
  >({});
  const { submit, isSubmitting, error, resetError } = useUpdateTeam();

  useEffect(() => {
    if (!open || !team) return;
    setValues(teamToEditFormValues(team));
    setFieldErrors({});
    resetError();
  }, [open, team, resetError]);

  function updateField<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key as keyof typeof fieldErrors]) return prev;
      const next = { ...prev };
      delete next[key as keyof typeof fieldErrors];
      return next;
    });
    resetError();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!team) return;

    const errors = validateEditTeamForm(values, existingTeams, team.id);
    setFieldErrors(errors);
    if (hasFormErrors(errors)) return;

    try {
      const updated = await submit(team.id, {
        name: values.name.trim(),
        tag: values.tag.trim().toUpperCase(),
        game: values.game,
      });
      onUpdated(updated);
      onClose();
    } catch {
      // error shown in UI
    }
  }

  if (!team) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-wider">Edit Team</DialogTitle>
          <DialogDescription>
            Update [{team.tag}] {team.name}. Captain changes are not supported here yet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-team-name">Team Name</Label>
              <Input
                id="edit-team-name"
                value={values.name}
                onChange={(e) => updateField("name", e.target.value)}
                disabled={isSubmitting}
                className="bg-background/50"
              />
              {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-team-tag">Tag</Label>
              <Input
                id="edit-team-tag"
                value={values.tag}
                onChange={(e) => updateField("tag", e.target.value.toUpperCase())}
                disabled={isSubmitting}
                className="bg-background/50 uppercase"
              />
              {fieldErrors.tag && <p className="text-xs text-destructive">{fieldErrors.tag}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-team-game">Game</Label>
              <Select
                value={values.game}
                onValueChange={(game) => updateField("game", game as Team["game"])}
                disabled={isSubmitting}
              >
                <SelectTrigger id="edit-team-game" className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_TEAM_GAMES.map((game) => (
                    <SelectItem key={game.value} value={game.value}>
                      {game.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="font-tech uppercase tracking-wider"
            >
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
