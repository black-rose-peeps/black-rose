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
import { DEFAULT_CREATE_MEMBER_FORM, MEMBER_VERIFICATION_STATUSES } from "../constants";
import { useCreateMember } from "../hooks";
import type { AdminMember, CreateMemberFormValues } from "../types";
import { formValuesToCreateInput, hasFormErrors, validateCreateMemberForm } from "../utils";

interface CreateMemberModalProps {
  open: boolean;
  onClose: () => void;
  existingMembers: AdminMember[];
  onCreated: (member: AdminMember) => void;
}

export function CreateMemberModal({
  open,
  onClose,
  existingMembers,
  onCreated,
}: CreateMemberModalProps) {
  const [values, setValues] = useState<CreateMemberFormValues>(DEFAULT_CREATE_MEMBER_FORM);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CreateMemberFormValues, string>>
  >({});
  const { submit, isSubmitting, error, resetError } = useCreateMember();

  useEffect(() => {
    if (!open) return;
    setValues(DEFAULT_CREATE_MEMBER_FORM);
    setFieldErrors({});
    resetError();
  }, [open, resetError]);

  function updateField<K extends keyof CreateMemberFormValues>(
    key: K,
    value: CreateMemberFormValues[K],
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

    const errors = validateCreateMemberForm(values, existingMembers);
    setFieldErrors(errors);
    if (hasFormErrors(errors)) return;

    try {
      const member = await submit(formValuesToCreateInput(values));
      onCreated(member);
      onClose();
    } catch {
      // Shown via `error` from useCreateMember
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-wider">Register Member</DialogTitle>
          <DialogDescription>
            Manually register a player so they can be added to team rosters once verified.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="member-username">Username</Label>
              <Input
                id="member-username"
                value={values.username}
                onChange={(e) => updateField("username", e.target.value)}
                placeholder="e.g. CoyHa"
                autoComplete="off"
                disabled={isSubmitting}
                className="bg-background/50"
              />
              {fieldErrors.username && (
                <p className="text-xs text-destructive">{fieldErrors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-discord-username">Discord Username</Label>
              <Input
                id="member-discord-username"
                value={values.discordUsername}
                onChange={(e) => updateField("discordUsername", e.target.value)}
                placeholder="e.g. coyha"
                autoComplete="off"
                disabled={isSubmitting}
                className="bg-background/50"
              />
              {fieldErrors.discordUsername && (
                <p className="text-xs text-destructive">{fieldErrors.discordUsername}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-discord-id">
                Discord ID <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="member-discord-id"
                value={values.discordId}
                onChange={(e) => updateField("discordId", e.target.value)}
                placeholder="17–20 digit snowflake"
                inputMode="numeric"
                autoComplete="off"
                disabled={isSubmitting}
                className="bg-background/50"
              />
              {fieldErrors.discordId && (
                <p className="text-xs text-destructive">{fieldErrors.discordId}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="member-status">Verification</Label>
              <Select
                value={values.status}
                onValueChange={(status) =>
                  updateField("status", status as CreateMemberFormValues["status"])
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="member-status" className="bg-background/50">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {MEMBER_VERIFICATION_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
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
              {isSubmitting ? "Saving…" : "Register Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
