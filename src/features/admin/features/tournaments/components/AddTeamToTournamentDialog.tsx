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
import { fetchTeams } from "@/features/admin/features/teams/services/teams.service";
import type { Team } from "@/features/teams/types";
import type { MockTeam, MockTournament } from "@/lib/mock-data";
import { useAddTeamToTournament } from "../hooks/useAddTeamToTournament";

interface AddTeamToTournamentDialogProps {
  open: boolean;
  tournament: MockTournament;
  registeredTeams: MockTeam[];
  onClose: () => void;
  onAdded: (registration: MockTeam) => void;
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
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const { submit, isSubmitting, error, resetError } = useAddTeamToTournament(tournament.id);

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

  const atCap = registeredTeams.length >= tournament.teamCap;

  useEffect(() => {
    if (!open) return;
    setSelectedTeamId("");
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedTeamId) return;
    try {
      const registration = await submit(selectedTeamId);
      onAdded(registration);
      onClose();
    } catch {
      // error surfaced in UI
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isSubmitting && onClose()}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-wider">Add Team</DialogTitle>
          <DialogDescription>
            Register a roster from Teams into {tournament.name}. {registeredTeams.length}/
            {tournament.teamCap} slots used.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {atCap ? (
            <Alert>
              <AlertDescription>
                Team cap reached. Remove a team or raise the cap to add more.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="add-team-select">Roster team</Label>
              <Select
                value={selectedTeamId}
                onValueChange={setSelectedTeamId}
                disabled={isSubmitting || teamsLoading || eligibleTeams.length === 0}
              >
                <SelectTrigger id="add-team-select" className="bg-background/50">
                  <SelectValue
                    placeholder={
                      teamsLoading
                        ? "Loading teams…"
                        : teamsLoadError
                          ? "Could not load teams"
                          : eligibleTeams.length === 0
                            ? "No eligible teams — create one under Teams"
                            : "Select a team"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {eligibleTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      [{team.tag}] {team.name} · {team.game}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {teamsLoadError && (
            <Alert variant="destructive">
              <AlertDescription>{teamsLoadError}</AlertDescription>
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
              disabled={isSubmitting || atCap || !selectedTeamId}
              className="font-tech uppercase tracking-wider"
            >
              {isSubmitting ? "Adding…" : "Add Team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
