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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_OPTIONS } from "@/features/teams/constants";
import type { AdminMember } from "@/features/admin/features/members/types";
import { DEFAULT_ADD_TEAM_MEMBER_FORM } from "../constants";
import { useAddTeamMember } from "../hooks";
import type { AddTeamMemberFormValues, Team } from "../types";
import {
  formValuesToAddTeamMemberInput,
  hasFormErrors,
  validateAddTeamMemberForm,
} from "../utils";

interface AddTeamMemberDialogProps {
  open: boolean;
  team: Team | null;
  allMembers: AdminMember[];
  onClose: () => void;
  onUpdated: (team: Team) => void;
}

export function AddTeamMemberDialog({
  open,
  team,
  allMembers,
  onClose,
  onUpdated,
}: AddTeamMemberDialogProps) {
  const [values, setValues] = useState<AddTeamMemberFormValues>(DEFAULT_ADD_TEAM_MEMBER_FORM);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof AddTeamMemberFormValues, string>>
  >({});
  const { submit, isSubmitting, error, resetError } = useAddTeamMember();

  const availableMembers = useMemo(() => {
    if (!team) return [];
    const onTeam = new Set(
      team.members.filter((m) => m.status !== "removed").map((m) => m.userId),
    );
    return allMembers.filter((m) => !onTeam.has(m.id));
  }, [team, allMembers]);

  useEffect(() => {
    if (!open) return;
    setValues(DEFAULT_ADD_TEAM_MEMBER_FORM);
    setFieldErrors({});
    resetError();
  }, [open, resetError]);

  function updateField<K extends keyof AddTeamMemberFormValues>(
    key: K,
    value: AddTeamMemberFormValues[K],
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
    if (!team) return;

    const errors = validateAddTeamMemberForm(values);
    setFieldErrors(errors);
    if (hasFormErrors(errors)) return;

    try {
      const updated = await submit(formValuesToAddTeamMemberInput(team.id, values));
      onUpdated(updated);
      onClose();
    } catch {
      // error state
    }
  }

  if (!team) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isSubmitting && onClose()}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-wider">Add to Roster</DialogTitle>
          <DialogDescription>
            Add an existing member to{" "}
            <span className="font-medium text-foreground">
              {team.name} [{team.tag}]
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-member-select">Member</Label>
            <Select
              value={values.memberId}
              onValueChange={(id) => updateField("memberId", id)}
              disabled={isSubmitting || availableMembers.length === 0}
            >
              <SelectTrigger id="add-member-select" className="bg-background/50">
                <SelectValue
                  placeholder={
                    availableMembers.length === 0
                      ? "No available members"
                      : "Select member"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.username} · @{m.discordUsername}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.memberId && (
              <p className="text-xs text-destructive">{fieldErrors.memberId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-member-role">In-game Role</Label>
            <Select
              value={values.role}
              onValueChange={(role) =>
                updateField("role", role as AddTeamMemberFormValues["role"])
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="add-member-role" className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              disabled={isSubmitting || availableMembers.length === 0}
              className="font-tech uppercase tracking-wider"
            >
              {isSubmitting ? "Adding…" : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
