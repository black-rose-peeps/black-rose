import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchMembers } from "@/features/admin/features/members/services/members.service";
import type { AdminMember } from "@/features/admin/features/members/types";
import { matchesAdminSearch } from "@/features/admin/utils/search";
import type { MockTeam, MockTournament } from "@/lib/mock-data";
import { useAddMemberToTournament } from "../hooks/useAddMemberToTournament";
import { fetchUnavailableMemberIdsForTournament } from "../services/tournament-registrations.service";

interface AddMembersToTournamentDialogProps {
  open: boolean;
  tournament: MockTournament;
  registeredEntries: MockTeam[];
  onClose: () => void;
  onAdded: (registrations: MockTeam[]) => void;
}

export function AddMembersToTournamentDialog({
  open,
  tournament,
  registeredEntries,
  onClose,
  onAdded,
}: AddMembersToTournamentDialogProps) {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [unavailableMemberIds, setUnavailableMemberIds] = useState<Set<string>>(() => new Set());
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersLoadError, setMembersLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [partialErrors, setPartialErrors] = useState<
    { memberUserId: string; message: string }[]
  >([]);
  const { submitMany, isSubmitting, error, resetError } = useAddMemberToTournament(tournament.id);

  const registeredMemberIds = useMemo(
    () =>
      new Set(
        registeredEntries
          .map((entry) => entry.memberUserId)
          .filter((id): id is string => Boolean(id)),
      ),
    [registeredEntries],
  );

  const eligibleMembers = useMemo(() => {
    return members.filter((member) => {
      if (registeredMemberIds.has(member.id)) return false;
      if (unavailableMemberIds.has(member.id)) return false;
      return matchesAdminSearch(searchQuery, member.username, member.discordUsername);
    });
  }, [members, registeredMemberIds, unavailableMemberIds, searchQuery]);

  const slotsRemaining = Math.max(0, tournament.teamCap - registeredEntries.length);
  const atCap = slotsRemaining === 0;
  const selectedCount = selectedMemberIds.size;
  const memberById = useMemo(
    () => new Map(eligibleMembers.map((member) => [member.id, member])),
    [eligibleMembers],
  );

  useEffect(() => {
    if (!open) return;
    setSelectedMemberIds(new Set());
    setPartialErrors([]);
    setSearchQuery("");
    resetError();
    setMembersLoadError(null);
    setMembersLoading(true);
    setUnavailableMemberIds(new Set());
    Promise.all([fetchMembers(), fetchUnavailableMemberIdsForTournament(tournament.id)])
      .then(([loadedMembers, blockedIds]) => {
        setMembers(loadedMembers);
        setUnavailableMemberIds(blockedIds);
      })
      .catch((err) => {
        setMembers([]);
        setUnavailableMemberIds(new Set());
        setMembersLoadError(err instanceof Error ? err.message : "Failed to load members.");
      })
      .finally(() => setMembersLoading(false));
  }, [open, resetError, tournament.id]);

  function toggleMember(memberId: string, checked: boolean) {
    setPartialErrors([]);
    resetError();
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        if (next.size >= slotsRemaining) return prev;
        next.add(memberId);
      } else {
        next.delete(memberId);
      }
      return next;
    });
  }

  function handleSelectAll() {
    setPartialErrors([]);
    resetError();
    const ids = eligibleMembers.slice(0, slotsRemaining).map((member) => member.id);
    setSelectedMemberIds(new Set(ids));
  }

  function handleClearSelection() {
    setPartialErrors([]);
    resetError();
    setSelectedMemberIds(new Set());
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (selectedCount === 0) return;

    try {
      const result = await submitMany([...selectedMemberIds]);
      if (result.added.length > 0) {
        onAdded(result.added);
      }

      if (result.failed.length > 0) {
        setPartialErrors(
          result.failed.map((failure) => {
            const member = memberById.get(failure.memberUserId);
            const label = member ? member.username : failure.memberUserId;
            return {
              memberUserId: failure.memberUserId,
              message: `${label}: ${failure.message}`,
            };
          }),
        );
        setSelectedMemberIds(new Set(result.failed.map((f) => f.memberUserId)));
        return;
      }

      onClose();
    } catch {
      // error surfaced in UI
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isSubmitting && onClose()}>
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-wider">Add Players</DialogTitle>
          <DialogDescription>
            Register individual members in {tournament.name}. {registeredEntries.length}/
            {tournament.teamCap} slots used
            {!atCap && ` · ${slotsRemaining} slot${slotsRemaining === 1 ? "" : "s"} left`}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {atCap ? (
            <Alert>
              <AlertDescription>
                Registration cap reached. Remove a player or raise the cap to add more.
              </AlertDescription>
            </Alert>
          ) : membersLoading ? (
            <div className="space-y-2">
              <Label>Eligible members</Label>
              <div className="space-y-2 rounded-md border border-border bg-background/50 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Eligible members</Label>
                {eligibleMembers.length > 0 && (
                  <div className="flex items-center gap-2">
                    {selectedCount > 0 && (
                      <Badge variant="secondary" className="font-tech text-[10px] uppercase">
                        {selectedCount} selected
                      </Badge>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={isSubmitting || eligibleMembers.length === 0}
                      onClick={handleSelectAll}
                    >
                      Select all
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={isSubmitting || selectedCount === 0}
                      onClick={handleClearSelection}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username or Discord…"
                  disabled={isSubmitting}
                  className="bg-background/50 pl-9"
                />
              </div>

              {eligibleMembers.length === 0 ? (
                <p className="rounded-md border border-dashed border-border bg-background/50 px-3 py-6 text-center text-sm text-muted-foreground">
                  {membersLoadError
                    ? "Could not load members."
                    : searchQuery.trim()
                      ? "No members match your search."
                      : "No eligible members — players may already be in this event or active in another live or upcoming tournament."}
                </p>
              ) : (
                <ScrollArea className="h-64 rounded-md border border-border bg-background/50">
                  <div className="space-y-1 p-2">
                    {eligibleMembers.map((member) => {
                      const checked = selectedMemberIds.has(member.id);
                      const disabled =
                        isSubmitting || (!checked && selectedCount >= slotsRemaining);

                      return (
                        <label
                          key={member.id}
                          htmlFor={`add-member-${member.id}`}
                          className={`flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 transition hover:bg-secondary/50 ${
                            disabled && !checked ? "cursor-not-allowed opacity-50" : ""
                          }`}
                        >
                          <Checkbox
                            id={`add-member-${member.id}`}
                            checked={checked}
                            disabled={disabled}
                            onCheckedChange={(value) => toggleMember(member.id, value === true)}
                            className="mt-0.5"
                          />
                          <span className="min-w-0 flex-1 text-sm leading-snug">
                            <span className="font-medium text-foreground">{member.username}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              @{member.discordUsername} · {member.status}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              {selectedCount >= slotsRemaining && eligibleMembers.length > slotsRemaining && (
                <p className="text-xs text-muted-foreground">
                  Only {slotsRemaining} more player{slotsRemaining === 1 ? "" : "s"} can be added
                  before the cap is reached.
                </p>
              )}
            </div>
          )}

          {membersLoadError && (
            <Alert variant="destructive">
              <AlertDescription>{membersLoadError}</AlertDescription>
            </Alert>
          )}

          {partialErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <p className="mb-1 font-medium">Some players could not be added:</p>
                <ul className="list-inside list-disc space-y-0.5 text-sm">
                  {partialErrors.map((failure) => (
                    <li key={failure.memberUserId}>{failure.message}</li>
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

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || atCap || selectedCount === 0 || membersLoading}
              className="font-tech uppercase tracking-wider"
            >
              {isSubmitting
                ? `Adding ${selectedCount}…`
                : selectedCount > 1
                  ? `Add ${selectedCount} Players`
                  : "Add Player"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
