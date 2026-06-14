import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GAME_COLOR } from "@/features/teams/constants";
import {
  createTournamentRegistrationRequest,
  fetchMemberTeamsForTournamentRequest,
} from "@/features/tournaments/services/tournament-registration-requests.service";
import { cn } from "@/lib/utils";
import type { Team } from "@/features/teams/types";
import { SelectTeamRegistrationSkeleton } from "./SelectTeamRegistrationSkeleton";

interface RequestTournamentRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  tournamentName: string;
  tournamentGame: string;
  memberId: string;
  onRequested: () => void;
}

export function RequestTournamentRegistrationDialog({
  open,
  onOpenChange,
  tournamentId,
  tournamentName,
  tournamentGame,
  memberId,
  onRequested,
}: RequestTournamentRegistrationDialogProps) {
  const [entries, setEntries] = useState<
    Array<{ team: Team; existingRequest: { id: string } | null }>
  >([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setError(null);
      return;
    }

    let cancelled = false;
    if (!hasLoadedRef.current) setLoading(true);

    fetchMemberTeamsForTournamentRequest(memberId, tournamentId, tournamentGame)
      .then((result) => {
        if (cancelled) return;
        setEntries(result);
        setSelectedTeamId(result[0]?.team.id ?? "");
        hasLoadedRef.current = true;
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load your teams.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, memberId, tournamentId, tournamentGame]);

  async function handleConfirm() {
    if (!selectedTeamId) return;
    setSubmitting(true);
    setError(null);
    try {
      await createTournamentRegistrationRequest({
        tournamentId,
        rosterTeamId: selectedTeamId,
        requesterUserId: memberId,
      });
      onRequested();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send request.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedEntry = entries.find((entry) => entry.team.id === selectedTeamId);
  const selectedTeam = selectedEntry?.team;
  const alreadyRequested = Boolean(selectedEntry?.existingRequest);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-none border-white/12 bg-[oklch(0.08_0_0)] p-0 gap-0">
        <DialogHeader className="border-b border-white/8 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 font-display text-2xl tracking-display">
            <Trophy className="h-5 w-5 text-muted-foreground" />
            Ask Captain to Register
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Only your team captain can submit a tournament registration. Confirm below to notify
            them that you want to join{" "}
            <span className="text-foreground">{tournamentName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          {loading ? (
            <SelectTeamRegistrationSkeleton />
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              You are not on an eligible team for this {tournamentGame} tournament.
            </p>
          ) : (
            <>
              <ul className="space-y-2">
                {entries.map(({ team, existingRequest }) => {
                  const activeCount = team.members.filter(
                    (m) => m.status === "captain" || m.status === "active",
                  ).length;
                  const isSelected = team.id === selectedTeamId;

                  return (
                    <li key={team.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedTeamId(team.id)}
                        className={cn(
                          "flex w-full items-center gap-4 border px-4 py-4 text-left transition",
                          isSelected
                            ? "border-white/25 bg-white/8"
                            : "border-white/8 bg-white/2 hover:border-white/15 hover:bg-white/5",
                        )}
                      >
                        <div className="grid h-12 w-12 shrink-0 place-items-center border border-white/15 bg-white/5 font-display text-sm tracking-display">
                          {team.tag}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-sm">{team.name}</p>
                          <p
                            className={cn(
                              "mt-0.5 font-tech text-label-readable uppercase",
                              GAME_COLOR[team.game],
                            )}
                          >
                            {team.game}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {activeCount} active member{activeCount === 1 ? "" : "s"}
                            {existingRequest ? " · request already sent" : ""}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {selectedTeam && (
                <p className="text-xs text-muted-foreground">
                  Your captain will get a notification to register{" "}
                  <span className="text-foreground">{selectedTeam.name}</span> [
                  {selectedTeam.tag}] for admin approval.
                </p>
              )}

              <Button
                type="button"
                disabled={!selectedTeamId || submitting || alreadyRequested}
                onClick={() => void handleConfirm()}
                className="clip-cta h-11 w-full rounded-none bg-white font-tech text-ui-readable uppercase text-black hover:bg-white/90 disabled:opacity-70"
              >
                {submitting
                  ? "Sending…"
                  : alreadyRequested
                    ? "Request already sent"
                    : "Notify Captain"}
              </Button>
            </>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <DialogFooter className="border-t border-white/8 px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-none font-tech text-ui-readable uppercase"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
