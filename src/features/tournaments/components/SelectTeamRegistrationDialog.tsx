import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdaptiveModal,
  AdaptiveModalBody,
  AdaptiveModalContent,
  AdaptiveModalDescription,
  AdaptiveModalHeader,
  AdaptiveModalTitle,
} from "@/components/ui/adaptive-modal";
import { GAME_COLOR } from "@/features/teams/constants";
import {
  countActiveRosterMembers,
  getRequiredRosterSizeForTournament,
  meetsTournamentRosterRequirement,
  tournamentRosterRequirementError,
} from "@/features/tournaments/utils/team-tournament-eligibility";
import {
  fetchCaptainTeamsForTournament,
  requestCaptainTeamRegistration,
} from "@/features/tournaments/services/team-registration.service";
import { fetchRosterIdentityGapsForTeams } from "@/features/member/services/member-identity.service";
import { gameIdentityConfig } from "@/features/member/utils/game-identity";
import { tournamentRosterIdentityError } from "@/features/member/utils/roster-identity";
import type { RosterIdentityGap } from "@/features/member/utils/roster-identity";
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
  const [identityGapsByTeamId, setIdentityGapsByTeamId] = useState<
    Map<string, RosterIdentityGap[]>
  >(() => new Map());
  const hasLoadedTeams = useRef(false);

  useEffect(() => {
    hasLoadedTeams.current = false;
    setTeams([]);
    setSelectedTeamId("");
    setIdentityGapsByTeamId(new Map());
  }, [tournamentId, captainUserId]);

  useEffect(() => {
    if (!open) {
      setError(null);
      return;
    }

    let cancelled = false;
    if (!hasLoadedTeams.current) setLoading(true);

    fetchCaptainTeamsForTournament(captainUserId, tournamentId)
      .then(async (eligible) => {
        if (cancelled) return;
        const compatible = eligible.filter(
          (team) => team.game === "Multi" || team.game === tournamentGame,
        );
        const gaps = await fetchRosterIdentityGapsForTeams(compatible, tournamentGame);
        if (cancelled) return;
        setTeams(compatible);
        setIdentityGapsByTeamId(gaps);
        const firstEligible = compatible.find((team) => {
          if (!meetsTournamentRosterRequirement(team, tournamentGame)) return false;
          const gapsForTeam = gaps.get(team.id) ?? [];
          return gapsForTeam.length === 0;
        });
        setSelectedTeamId(firstEligible?.id ?? compatible[0]?.id ?? "");
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
  const requiredRosterSize = getRequiredRosterSizeForTournament(tournamentGame);
  const selectedTeamGaps = selectedTeam ? (identityGapsByTeamId.get(selectedTeam.id) ?? []) : [];
  const selectedTeamRosterError = selectedTeam
    ? tournamentRosterRequirementError(selectedTeam, tournamentGame)
    : null;
  const selectedTeamIdentityError = selectedTeam
    ? tournamentRosterIdentityError(selectedTeam, tournamentGame, selectedTeamGaps)
    : null;
  const gameIdentityLabel = gameIdentityConfig(tournamentGame)?.panelLabel ?? tournamentGame;
  const anyRosterEligible = teams.some((team) =>
    meetsTournamentRosterRequirement(team, tournamentGame),
  );

  return (
    <AdaptiveModal open={open} onOpenChange={onOpenChange}>
      <AdaptiveModalContent className="flex max-w-lg flex-col gap-0 border-white/12 bg-[oklch(0.08_0_0)] p-0">
        <AdaptiveModalHeader>
          <AdaptiveModalTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-muted-foreground" />
            Register for Tournament
          </AdaptiveModalTitle>
          <AdaptiveModalDescription>
            Choose which team to submit for{" "}
            <span className="text-foreground">{tournamentName}</span>.
            {requiredRosterSize ? (
              <>
                {" "}
                {tournamentGame} tournaments require at least {requiredRosterSize} active roster
                members.
              </>
            ) : null}{" "}
            An admin will review your registration before your team is confirmed.
          </AdaptiveModalDescription>
        </AdaptiveModalHeader>

        <AdaptiveModalBody className="flex flex-col gap-4">
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
          ) : !anyRosterEligible && requiredRosterSize ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {tournamentGame} tournaments require at least {requiredRosterSize} active roster
                members. Invite your teammates on the team page before registering.
              </p>
              <Button
                asChild
                variant="outline"
                className="rounded-none border-white/15 bg-transparent font-tech text-ui-readable uppercase"
              >
                <Link to="/teams" search={{ create: false }}>
                  Manage Teams
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <ul className="space-y-2">
                {teams.map((team) => {
                  const activeCount = countActiveRosterMembers(team);
                  const isSelected = team.id === selectedTeamId;
                  const rosterError = tournamentRosterRequirementError(team, tournamentGame);
                  const identityGaps = identityGapsByTeamId.get(team.id) ?? [];
                  const identityError = tournamentRosterIdentityError(
                    team,
                    tournamentGame,
                    identityGaps,
                  );
                  const rosterEligible = !rosterError && !identityError;

                  return (
                    <li key={team.id}>
                      <button
                        type="button"
                        onClick={() => rosterEligible && setSelectedTeamId(team.id)}
                        disabled={!rosterEligible}
                        className={cn(
                          "flex w-full items-center gap-4 border px-4 py-4 text-left transition",
                          !rosterEligible && "cursor-not-allowed opacity-60",
                          isSelected && rosterEligible
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
                            {requiredRosterSize ? ` · ${requiredRosterSize} required` : ""}
                          </p>
                          {rosterError && (
                            <p className="mt-1 text-xs text-amber-400/90">{rosterError}</p>
                          )}
                          {!rosterError && identityError && (
                            <p className="mt-1 text-xs text-amber-400/90">{identityError}</p>
                          )}
                        </div>
                        {isSelected && rosterEligible && (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {selectedTeam && selectedTeamRosterError && (
                <p className="text-xs text-amber-400/90">{selectedTeamRosterError}</p>
              )}

              {selectedTeam && !selectedTeamRosterError && selectedTeamIdentityError && (
                <div className="flex flex-col gap-3 border border-amber-400/25 bg-amber-400/5 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                    <div>
                      <p className="text-xs leading-relaxed text-amber-100/90">
                        {selectedTeamIdentityError}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Ask each player to sign in and set their {gameIdentityLabel} in-game ID on
                        the Player tab of their profile.
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-1 border-t border-amber-400/15 pt-3 text-xs text-muted-foreground">
                    {selectedTeamGaps.map((gap) => (
                      <li key={gap.userId}>
                        <span className="text-foreground">{gap.displayName || gap.username}</span>
                        {" · "}
                        missing {gameIdentityLabel} ID
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedTeam && !selectedTeamRosterError && !selectedTeamIdentityError && (
                <p className="text-xs text-muted-foreground">
                  Submitting <span className="text-foreground">{selectedTeam.name}</span> [
                  {selectedTeam.tag}] for admin approval.
                </p>
              )}

              <Button
                type="button"
                disabled={
                  !selectedTeamId ||
                  submitting ||
                  Boolean(selectedTeamRosterError) ||
                  Boolean(selectedTeamIdentityError)
                }
                onClick={() => void handleRegister()}
                className="clip-cta h-11 w-full rounded-none bg-white font-tech text-ui-readable uppercase text-black hover:bg-white/90 disabled:opacity-70"
              >
                {submitting ? "Submitting…" : "Submit Registration"}
              </Button>
            </>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </AdaptiveModalBody>
      </AdaptiveModalContent>
    </AdaptiveModal>
  );
}
