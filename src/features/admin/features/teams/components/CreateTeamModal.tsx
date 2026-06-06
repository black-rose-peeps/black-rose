import { useEffect, useMemo, useState } from "react";
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
import type { AdminMember } from "@/features/admin/features/members/types";
import { ADMIN_TEAM_GAMES, DEFAULT_CREATE_TEAM_FORM } from "../constants";
import { useCreateTeam } from "../hooks";
import type { CreateTeamFormValues, Team } from "../types";
import {
  formValuesToCreateTeamInput,
  getMembersAvailableForNewTeam,
  hasFormErrors,
  validateCreateTeamForm,
} from "../utils";

interface CreateTeamModalProps {
  open: boolean;
  onClose: () => void;
  members: AdminMember[];
  existingTeams: Team[];
  onCreated: (team: Team) => void;
}

export function CreateTeamModal({
  open,
  onClose,
  members,
  existingTeams,
  onCreated,
}: CreateTeamModalProps) {
  const [values, setValues] = useState<CreateTeamFormValues>(DEFAULT_CREATE_TEAM_FORM);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CreateTeamFormValues, string>>
  >({});
  const { submit, isSubmitting, error, resetError } = useCreateTeam();

  const availableCaptains = useMemo(
    () => getMembersAvailableForNewTeam(members, existingTeams),
    [members, existingTeams],
  );

  useEffect(() => {
    if (!open) return;
    setValues(DEFAULT_CREATE_TEAM_FORM);
    setFieldErrors({});
    resetError();
  }, [open, resetError]);

  useEffect(() => {
    if (!open) return;
    if (
      values.captainMemberId &&
      !availableCaptains.some((m) => m.id === values.captainMemberId)
    ) {
      setValues((prev) => ({ ...prev, captainMemberId: "" }));
    }
  }, [open, availableCaptains, values.captainMemberId]);

  function updateField<K extends keyof CreateTeamFormValues>(
    key: K,
    value: CreateTeamFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    resetError();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const errors = validateCreateTeamForm(values, existingTeams);
    setFieldErrors(errors);
    if (hasFormErrors(errors)) return;

    try {
      const team = await submit(formValuesToCreateTeamInput(values));
      onCreated(team);
      onClose();
    } catch {
      // error state
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isSubmitting && onClose()}>
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-wider">Create Team</DialogTitle>
          <DialogDescription>
            Set up a new roster. The captain is added as the first member automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                value={values.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g. Novellino eSports"
                disabled={isSubmitting}
                className="bg-background/50"
              />
              {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-tag">Tag</Label>
              <Input
                id="team-tag"
                value={values.tag}
                onChange={(e) => updateField("tag", e.target.value.toUpperCase())}
                placeholder="NE"
                maxLength={5}
                disabled={isSubmitting}
                className="bg-background/50 font-tech uppercase"
              />
              {fieldErrors.tag && <p className="text-xs text-destructive">{fieldErrors.tag}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-game">Game</Label>
              <Select
                value={values.game}
                onValueChange={(game) => updateField("game", game as CreateTeamFormValues["game"])}
                disabled={isSubmitting}
              >
                <SelectTrigger id="team-game" className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_TEAM_GAMES.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="team-captain">Captain</Label>
              <Select
                value={values.captainMemberId}
                onValueChange={(id) => updateField("captainMemberId", id)}
                disabled={isSubmitting || availableCaptains.length === 0}
              >
                <SelectTrigger id="team-captain" className="bg-background/50">
                  <SelectValue
                    placeholder={
                      members.length === 0
                        ? "Register members first"
                        : availableCaptains.length === 0
                          ? "All members are already on a team"
                          : "Select captain"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableCaptains.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.username} · @{m.discordUsername}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.captainMemberId && (
                <p className="text-xs text-destructive">{fieldErrors.captainMemberId}</p>
              )}
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
              disabled={isSubmitting || availableCaptains.length === 0}
              className="font-tech uppercase tracking-wider"
            >
              {isSubmitting ? "Creating…" : "Create Team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
