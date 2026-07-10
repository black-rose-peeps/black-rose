import { type FormEvent, useEffect, useState } from "react";
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
import { useUpdateMember } from "../hooks/useUpdateMember";
import type { AdminMember, CreateMemberFormValues } from "../types";
import {
  formValuesToCreateInput,
  hasFormErrors,
  memberToFormValues,
  validateCreateMemberForm,
} from "../utils";

interface EditMemberModalProps {
  open: boolean;
  member: AdminMember | null;
  existingMembers: AdminMember[];
  onClose: () => void;
  onUpdated: (member: AdminMember) => void;
}

export function EditMemberModal({
  open,
  member,
  existingMembers,
  onClose,
  onUpdated,
}: EditMemberModalProps) {
  const [values, setValues] = useState<CreateMemberFormValues>(DEFAULT_CREATE_MEMBER_FORM);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CreateMemberFormValues, string>>
  >({});
  const { submit, isSubmitting, error, resetError } = useUpdateMember();

  useEffect(() => {
    if (!open || !member) return;
    setValues(memberToFormValues(member));
    setFieldErrors({});
    resetError();
  }, [open, member, resetError]);

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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!member) return;

    const errors = validateCreateMemberForm(values, existingMembers, member.id);
    setFieldErrors(errors);
    if (hasFormErrors(errors)) return;

    try {
      const updated = await submit(member.id, formValuesToCreateInput(values));
      onUpdated(updated);
      onClose();
    } catch {
      // error shown in UI
    }
  }

  if (!member) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-wider">Edit Member</DialogTitle>
          <DialogDescription>
            Update {member.username}&apos;s profile and verification.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-member-username">Username</Label>
              <Input
                id="edit-member-username"
                value={values.username}
                onChange={(e) => updateField("username", e.target.value)}
                disabled={isSubmitting}
                className="bg-background/50"
              />
              {fieldErrors.username && (
                <p className="text-xs text-destructive">{fieldErrors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-member-discord-username">Discord Username</Label>
              <Input
                id="edit-member-discord-username"
                value={values.discordUsername}
                onChange={(e) => updateField("discordUsername", e.target.value)}
                disabled={isSubmitting}
                className="bg-background/50"
              />
              {fieldErrors.discordUsername && (
                <p className="text-xs text-destructive">{fieldErrors.discordUsername}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-member-discord-id">Discord ID</Label>
              <Input
                id="edit-member-discord-id"
                value={values.discordId}
                onChange={(e) => updateField("discordId", e.target.value)}
                disabled={isSubmitting}
                className="bg-background/50"
              />
              {fieldErrors.discordId && (
                <p className="text-xs text-destructive">{fieldErrors.discordId}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-member-status">Verification</Label>
              <Select
                value={values.status}
                onValueChange={(status) =>
                  updateField("status", status as CreateMemberFormValues["status"])
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="edit-member-status" className="bg-background/50">
                  <SelectValue />
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
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
