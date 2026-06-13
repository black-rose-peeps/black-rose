import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GAME_COLOR } from "@/features/teams/constants";
import {
  fetchCaptainTeamsForTournament,
  requestCaptainTeamRegistration,
} from "@/features/tournaments/services/team-registration.service";
import { cn } from "@/lib/utils";
import type { Team } from "@/features/teams/types";
import { SelectTeamRegistrationSkeleton } from "./SelectTeamRegistrationSkeleton";

interface SelectTeamRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  tournamentName: string;
  tournamentGame: string;
  captainUserId: string;
  onRegistered: () => void;
}

export function SelectTeamRegistrationDialog({
  open,
  onOpenChange,
  tournamentId,
  tournamentName,
  tournamentGame,
  captainUserId,
  onRegistered,
}: SelectTeamRegistrationDialogProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedTeams = useRef(false);

  useEffect(() => {
    hasLoadedTeams.current = false;
    setTeams([]);
    setSelectedTeamId("");
  }, [tournamentId, captainUserId]);

  useEffect(() => {
    if (!open) {
      setError(null);
      return;
    }

    let cancelled = false;
    if (!hasLoadedTeams.current) setLoading(true);

    fetchCaptainTeamsForTournament(captainUserId, tournamentId)
      .then((eligible) => {
        if (cancelled) return;
        const compatible = eligible.filter(
          (team) => team.game === "Multi" || team.game === tournamentGame,
        );
        setTeams(compatible);
        setSelectedTeamId(compatible[0]?.id ?? "");
        hasLoadedTeams.current = true;
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
  }, [open, captainUserId, tournamentId, tournamentGame]);

  async function handleRegister() {
    if (!selectedTeamId) return;
    setSubmitting(true);
    setError(null);
    try {
      await requestCaptainTeamRegistration(tournamentId, selectedTeamId, captainUserId);
      onRegistered();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register team.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-none border-white/12 bg-[oklch(0.08_0_0)] p-0 gap-0">
        <DialogHeader className="border-b border-white/8 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 font-display text-2xl tracking-display">
            <Trophy className="h-5 w-5 text-muted-foreground" />
            Register for Tournament
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Choose which team to submit for{" "}
            <span className="text-foreground">{tournamentName}</span>. An admin will review your
            registration before your team is confirmed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          {loading ? (
            <SelectTeamRegistrationSkeleton />
          ) : teams.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                You don&apos;t have an eligible team for this {tournamentGame} tournament yet.
              </p>
              <Button
                asChild
                className="rounded-none bg-white font-tech text-ui-readable uppercase text-black hover:bg-white/90"
              >
                <Link to="/teams/create">Create a Team</Link>
              </Button>
            </div>
          ) : (
            <>
              <ul className="space-y-2">
                {teams.map((team) => {
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
                  Submitting <span className="text-foreground">{selectedTeam.name}</span> [
                  {selectedTeam.tag}] for admin approval.
                </p>
              )}

              <Button
                type="button"
                disabled={!selectedTeamId || submitting}
                onClick={() => void handleRegister()}
                className="clip-cta h-11 w-full rounded-none bg-white font-tech text-ui-readable uppercase text-black hover:bg-white/90 disabled:opacity-70"
              >
                {submitting ? "Submitting…" : "Submit Registration"}
              </Button>
            </>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
