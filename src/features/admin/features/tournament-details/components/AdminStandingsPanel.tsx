import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { fetchBracketState, type PersistedBracketPayload } from "../services/bracket.service";
import {
  buildPodiumPlacements,
  deriveManagedPlacements,
  type TournamentPlacement,
} from "@/features/tournaments/utils/tournament-placements";
import { seedByRegistrationId } from "@/features/tournaments/utils/tournament-team-seeds";
import { TournamentStandingsView } from "@/features/tournaments/components/standings/TournamentStandingsView";
import type { BracketRound } from "@/features/tournaments/types";
import type { MockTeam } from "@/lib/mock-data";
import { isBracketSeedingStatus } from "@/features/admin/features/participants/constants/registration-status";

interface AdminStandingsPanelProps {
  tournamentId: string;
  format: string;
  teams: MockTeam[];
  tournamentStatus: string;
  prizeBreakdown?: Array<{ place: string; prize: string }>;
}

function payloadHasData(payload: PersistedBracketPayload | null | undefined): boolean {
  if (!payload) return false;
  return payload.rounds.some((round) => round.matches.length > 0);
}

export function AdminStandingsPanel({
  tournamentId,
  format,
  teams,
  tournamentStatus,
  prizeBreakdown = [],
}: AdminStandingsPanelProps) {
  const [payload, setPayload] = useState<PersistedBracketPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const bracketTeams = useMemo(
    () => teams.filter((team) => isBracketSeedingStatus(team.status, tournamentStatus)),
    [teams, tournamentStatus],
  );

  const teamNames = useMemo(() => bracketTeams.map((team) => team.name), [bracketTeams]);
  const teamTags = useMemo(
    () => new Map(bracketTeams.map((team) => [team.name, team.tag])),
    [bracketTeams],
  );

  const seedByTeam = useMemo(() => {
    const assignmentIds = payload?.admin?.assignmentTeamIds ?? [];
    const seedById = seedByRegistrationId(assignmentIds);
    const map = new Map<string, number>();
    for (const team of bracketTeams) {
      const seed = seedById.get(team.id);
      if (seed != null) map.set(team.name, seed);
    }
    return map;
  }, [payload, bracketTeams]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const state = await fetchBracketState(tournamentId);
        if (!cancelled) {
          setPayload(state?.payload ?? null);
        }
      } catch (err) {
        console.error("[AdminStandingsPanel] Failed to load bracket state:", err);
        if (!cancelled) setPayload(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`admin-standings:${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournament_bracket_state",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const bracket: BracketRound[] = payload?.rounds ?? [];
  const managedMatches = payload?.admin?.managedMatches ?? [];

  const placements = useMemo((): TournamentPlacement[] => {
    if (payload?.placements?.length) {
      return buildPodiumPlacements(prizeBreakdown, payload.placements);
    }
    if (!managedMatches.length) return [];
    const raw = deriveManagedPlacements(
      format,
      managedMatches,
      payload?.admin?.swiss,
      teamNames,
      payload?.admin?.grandFinalMode,
    );
    return buildPodiumPlacements(prizeBreakdown, raw);
  }, [payload, managedMatches, format, prizeBreakdown, teamNames]);

  return (
    <TournamentStandingsView
      format={format}
      bracket={payloadHasData(payload) ? bracket : []}
      teamNames={teamNames}
      teamTags={teamTags}
      seedByTeam={seedByTeam}
      placements={placements}
      isLoading={isLoading}
      eyebrowSuffix="Admin Console"
      isAdmin
    />
  );
}
