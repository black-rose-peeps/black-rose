import { useEffect, useMemo, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTeams } from "@/features/admin/features/teams/services/teams.service";
import type { Team } from "@/features/teams/types";
import type { MockTeam, MockTournament } from "@/lib/mock-data";
import { useAddTeamToTournament } from "../hooks/useAddTeamToTournament";

interface AddTeamToTournamentDialogProps {
  open: boolean;
  tournament: MockTournament;
  registeredTeams: MockTeam[];
  onClose: () => void;
  onAdded: (registrations: MockTeam[]) => void;
}

export function AddTeamToTournamentDialog({
  open,
  tournament,
  registeredTeams,
  onClose,
  onAdded,
}: AddTeamToTournamentDialogProps) {
  const [rosterTeams, setRosterTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsLoadError, setTeamsLoadError] = useState<string | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [partialErrors, setPartialErrors] = useState<string[]>([]);
  const { submitMany, isSubmitting, error, resetError } = useAddTeamToTournament(tournament.id);

  const registeredRosterIds = useMemo(
    () =>
      new Set(registeredTeams.map((r) => r.rosterTeamId).filter((id): id is string => Boolean(id))),
    [registeredTeams],
  );

  const eligibleTeams = useMemo(() => {
    return rosterTeams.filter((team) => {
      if (registeredRosterIds.has(team.id)) return false;
      if (team.game !== "Multi" && team.game !== tournament.game) return false;
      if (team.activeTournamentId && team.activeTournamentId !== tournament.id) {
        return false;
      }
      return true;
    });
  }, [rosterTeams, registeredRosterIds, tournament.game, tournament.id]);

  const slotsRemaining = Math.max(0, tournament.teamCap - registeredTeams.length);
  const atCap = slotsRemaining === 0;
  const selectedCount = selectedTeamIds.size;
  const teamById = useMemo(
    () => new Map(eligibleTeams.map((team) => [team.id, team])),
    [eligibleTeams],
  );

  useEffect(() => {
    if (!open) return;
    setSelectedTeamIds(new Set());
    setPartialErrors([]);
    resetError();
    setTeamsLoadError(null);
    setTeamsLoading(true);
    fetchTeams()
      .then(setRosterTeams)
      .catch((err) => {
        setRosterTeams([]);
        setTeamsLoadError(err instanceof Error ? err.message : "Failed to load teams.");
      })
      .finally(() => setTeamsLoading(false));
  }, [open, resetError]);

  function toggleTeam(teamId: string, checked: boolean) {
    setPartialErrors([]);
    resetError();
    setSelectedTeamIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        if (next.size >= slotsRemaining) return prev;
        next.add(teamId);
      } else {
        next.delete(teamId);
      }
      return next;
    });
  }

  function handleSelectAll() {
    setPartialErrors([]);
    resetError();
    const ids = eligibleTeams.slice(0, slotsRemaining).map((team) => team.id);
    setSelectedTeamIds(new Set(ids));
  }

  function handleClearSelection() {
    setPartialErrors([]);
    resetError();
    setSelectedTeamIds(new Set());
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (selectedCount === 0) return;

    try {
      const result = await submitMany([...selectedTeamIds]);
      if (result.added.length > 0) {
        onAdded(result.added);
      }

      if (result.failed.length > 0) {
        const messages = result.failed.map((failure) => {
          const team = teamById.get(failure.rosterTeamId);
          const label = team ? `[${team.tag}] ${team.name}` : failure.rosterTeamId;
          return `${label}: ${failure.message}`;
        });
        setPartialErrors(messages);
        setSelectedTeamIds(new Set(result.failed.map((f) => f.rosterTeamId)));
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
          <DialogTitle className="font-display text-xl tracking-wider">Add Teams</DialogTitle>
          <DialogDescription>
            Select one or more rosters from Teams to register in {tournament.name}.{" "}
            {registeredTeams.length}/{tournament.teamCap} slots used
            {!atCap && ` · ${slotsRemaining} slot${slotsRemaining === 1 ? "" : "s"} left`}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {atCap ? (
            <Alert>
              <AlertDescription>
                Team cap reached. Remove a team or raise the cap to add more.
              </AlertDescription>
            </Alert>
          ) : teamsLoading ? (
            <div className="space-y-2">
              <Label>Eligible teams</Label>
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
                <Label>Eligible teams</Label>
                {eligibleTeams.length > 0 && (
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
                      disabled={isSubmitting || eligibleTeams.length === 0}
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

              {eligibleTeams.length === 0 ? (
                <p className="rounded-md border border-dashed border-border bg-background/50 px-3 py-6 text-center text-sm text-muted-foreground">
                  {teamsLoadError
                    ? "Could not load teams."
                    : "No eligible teams — create one under Teams or free up rosters already in another event."}
                </p>
              ) : (
                <ScrollArea className="h-64 rounded-md border border-border bg-background/50">
                  <div className="space-y-1 p-2">
                    {eligibleTeams.map((team) => {
                      const checked = selectedTeamIds.has(team.id);
                      const disabled =
                        isSubmitting || (!checked && selectedCount >= slotsRemaining);

                      return (
                        <label
                          key={team.id}
                          htmlFor={`add-team-${team.id}`}
                          className={`flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 transition hover:bg-secondary/50 ${
                            disabled && !checked ? "cursor-not-allowed opacity-50" : ""
                          }`}
                        >
                          <Checkbox
                            id={`add-team-${team.id}`}
                            checked={checked}
                            disabled={disabled}
                            onCheckedChange={(value) => toggleTeam(team.id, value === true)}
                            className="mt-0.5"
                          />
                          <span className="min-w-0 flex-1 text-sm leading-snug">
                            <span className="font-medium text-foreground">
                              [{team.tag}] {team.name}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {team.game}
                              {team.members.length > 0 &&
                                ` · ${team.members.filter((m) => m.status === "captain" || m.status === "active").length} players`}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              {selectedCount >= slotsRemaining && eligibleTeams.length > slotsRemaining && (
                <p className="text-xs text-muted-foreground">
                  Only {slotsRemaining} more team{slotsRemaining === 1 ? "" : "s"} can be added
                  before the cap is reached.
                </p>
              )}
            </div>
          )}

          {teamsLoadError && (
            <Alert variant="destructive">
              <AlertDescription>{teamsLoadError}</AlertDescription>
            </Alert>
          )}

          {partialErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <p className="mb-1 font-medium">Some teams could not be added:</p>
                <ul className="list-inside list-disc space-y-0.5 text-sm">
                  {partialErrors.map((message) => (
                    <li key={message}>{message}</li>
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
              disabled={isSubmitting || atCap || selectedCount === 0 || teamsLoading}
              className="font-tech uppercase tracking-wider"
            >
              {isSubmitting
                ? `Adding ${selectedCount}…`
                : selectedCount > 1
                  ? `Add ${selectedCount} Teams`
                  : "Add Team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
