import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AdaptiveModal,
  AdaptiveModalBody,
  AdaptiveModalContent,
  AdaptiveModalDescription,
  AdaptiveModalFooter,
  AdaptiveModalHeader,
  AdaptiveModalTitle,
} from "@/components/ui/adaptive-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { matchesAdminSearch } from "@/features/admin/utils/search";
import type { AdminMember } from "@/features/admin/features/members/types";
import { useAddTeamMember } from "../hooks";
import type { Team } from "../types";
import { getMembersAvailableForRoster } from "../utils";
import { MemberAvatar } from "@/features/member/components/MemberAvatar";

interface AddTeamMemberDialogProps {
  open: boolean;
  team: Team | null;
  allMembers: AdminMember[];
  allTeams: Team[];
  onClose: () => void;
  onUpdated: (team: Team) => void;
}

export function AddTeamMemberDialog({
  open,
  team,
  allMembers,
  allTeams,
  onClose,
  onUpdated,
}: AddTeamMemberDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [partialErrors, setPartialErrors] = useState<{ memberId: string; message: string }[]>([]);
  const { submitMany, isSubmitting, error, resetError } = useAddTeamMember();

  const availableMembers = useMemo(() => {
    return getMembersAvailableForRoster(allMembers, allTeams).filter((member) =>
      matchesAdminSearch(searchQuery, member.username, member.discordUsername),
    );
  }, [allMembers, allTeams, searchQuery]);

  const memberById = useMemo(
    () => new Map(availableMembers.map((member) => [member.id, member])),
    [availableMembers],
  );

  const selectedCount = selectedMemberIds.size;

  useEffect(() => {
    if (!open) return;
    setSelectedMemberIds(new Set());
    setSearchQuery("");
    setPartialErrors([]);
    resetError();
  }, [open, resetError]);

  function toggleMember(memberId: string, checked: boolean) {
    setPartialErrors([]);
    resetError();
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(memberId);
      else next.delete(memberId);
      return next;
    });
  }

  function handleSelectAll() {
    setPartialErrors([]);
    resetError();
    setSelectedMemberIds(new Set(availableMembers.map((member) => member.id)));
  }

  function handleClearSelection() {
    setPartialErrors([]);
    resetError();
    setSelectedMemberIds(new Set());
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!team || selectedCount === 0) return;

    try {
      const result = await submitMany(team.id, [...selectedMemberIds]);
      if (result.added.length > 0) {
        onUpdated(result.team);
      }

      if (result.failed.length > 0) {
        setPartialErrors(
          result.failed.map((failure) => {
            const member = memberById.get(failure.memberId);
            const label = member ? member.username : failure.memberId;
            return {
              memberId: failure.memberId,
              message: `${label}: ${failure.message}`,
            };
          }),
        );
        setSelectedMemberIds(new Set(result.failed.map((failure) => failure.memberId)));
        return;
      }

      onClose();
    } catch {
      // error surfaced in UI
    }
  }

  if (!team) return null;

  return (
    <AdaptiveModal open={open} onOpenChange={(next) => !next && !isSubmitting && onClose()}>
      <AdaptiveModalContent className="border-border bg-card sm:max-w-lg" mobileSize="full">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <AdaptiveModalHeader>
            <AdaptiveModalTitle>Add to Roster</AdaptiveModalTitle>
            <AdaptiveModalDescription>
              Add registered members to{" "}
              <span className="font-medium text-foreground">
                {team.name} [{team.tag}]
              </span>
              . Members are not tied to a game — any available player can join this {team.game}{" "}
              roster.
            </AdaptiveModalDescription>
          </AdaptiveModalHeader>

          <AdaptiveModalBody className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm text-muted-foreground">
                {selectedCount} selected · {availableMembers.length} available
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="touch-target min-h-11 font-tech text-[10px] uppercase tracking-wider sm:min-h-7"
                  onClick={handleSelectAll}
                  disabled={isSubmitting || availableMembers.length === 0}
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="touch-target min-h-11 font-tech text-[10px] uppercase tracking-wider sm:min-h-7"
                  onClick={handleClearSelection}
                  disabled={isSubmitting || selectedCount === 0}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username or Discord…"
                disabled={isSubmitting}
                className="min-h-11 bg-background/50 pl-9"
              />
            </div>

            <div className="min-h-0 flex-1 space-y-1 rounded-md border border-border sm:max-h-64 sm:overflow-y-auto">
              <div className="space-y-1 p-3">
                {availableMembers.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {searchQuery.trim()
                      ? "No members match your search."
                      : "No eligible members available."}
                  </p>
                ) : (
                  availableMembers.map((member) => {
                    const checked = selectedMemberIds.has(member.id);
                    return (
                      <label
                        key={member.id}
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-transparent px-2 py-2.5 hover:border-border hover:bg-secondary/30"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => toggleMember(member.id, value === true)}
                          disabled={isSubmitting}
                        />
                        <MemberAvatar
                          avatarUrl={member.avatarUrl}
                          initials={member.username.slice(0, 2).toUpperCase()}
                          name={member.username}
                          className="h-8 w-8 shrink-0 text-[10px] font-tech tracking-wider-2"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{member.username}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            @{member.discordUsername}
                          </p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {partialErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-4">
                    {partialErrors.map((failure) => (
                      <li key={failure.memberId}>{failure.message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </AdaptiveModalBody>

          <AdaptiveModalFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || selectedCount === 0}
              className="font-tech uppercase tracking-wider"
            >
              {isSubmitting
                ? "Adding…"
                : `Add ${selectedCount || ""} Member${selectedCount === 1 ? "" : "s"}`.trim()}
            </Button>
          </AdaptiveModalFooter>
        </form>
      </AdaptiveModalContent>
    </AdaptiveModal>
  );
}
