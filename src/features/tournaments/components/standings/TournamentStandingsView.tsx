import { useMemo } from "react";
import type { BracketRound } from "../../types";
import { buildTeamStandingsSnapshot, isDoubleElimFormat } from "../../utils/team-standings";
import type { TournamentPlacement } from "../../utils/tournament-placements";
import { EliminationStandingsTable } from "./EliminationStandingsTable";
import { StandingsEmptyState, StandingsLoadingState } from "./StandingsPanelShell";

interface TournamentStandingsViewProps {
  format: string;
  bracket: BracketRound[];
  teamNames: string[];
  teamTags?: Map<string, string>;
  seedByTeam?: Map<string, number>;
  placements?: TournamentPlacement[];
  isLoading?: boolean;
  eyebrowSuffix?: string;
  isAdmin?: boolean;
}

export function TournamentStandingsView({
  format,
  bracket,
  teamNames,
  teamTags,
  seedByTeam,
  placements,
  isLoading = false,
  eyebrowSuffix = "Black Rose Arena",
  isAdmin = false,
}: TournamentStandingsViewProps) {
  const snapshot = useMemo(
    () =>
      buildTeamStandingsSnapshot({
        bracket,
        teamNames,
        seedByTeam,
        placements,
      }),
    [bracket, teamNames, seedByTeam, placements],
  );

  if (isLoading) {
    return <StandingsLoadingState />;
  }

  if (!snapshot.hasBracketData || !snapshot.eliminationStandings) {
    return (
      <StandingsEmptyState
        eyebrow={`${format} · ${eyebrowSuffix}`}
        admin={isAdmin}
        isDoubleElim={isDoubleElimFormat(format)}
      />
    );
  }

  return (
    <EliminationStandingsTable
      standings={snapshot.eliminationStandings}
      teamTags={teamTags}
      eyebrow={`${format} · ${eyebrowSuffix}`}
      isDoubleElim={isDoubleElimFormat(format)}
      subtitle={
        placements?.length
          ? "Final placements and match records"
          : isDoubleElimFormat(format)
            ? "Live double elimination records"
            : "Live elimination records"
      }
    />
  );
}
