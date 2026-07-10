import { TournamentStandingsView } from "../../components/standings/TournamentStandingsView";
import type { BracketRound } from "../../types";
import type { TournamentPlacement } from "../../utils/tournament-placements";

interface StandingsTabProps {
  format: string;
  bracket: BracketRound[];
  teamNames: string[];
  teamTags?: Map<string, string>;
  seedByTeam?: Map<string, number>;
  placements?: TournamentPlacement[];
  isLoading?: boolean;
}

export function StandingsTab(props: StandingsTabProps) {
  return <TournamentStandingsView {...props} />;
}
