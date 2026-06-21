/**
 * Public read-only Swiss-system bracket viewer.
 * Mirrors the admin SwissBracketView: standings table + round navigator + match cards.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SwissFormatIntro } from "../../components/SwissFormatIntro";
import { SwissPhaseBanner } from "../../components/SwissPhaseBanner";
import { isTournamentConcluded } from "../../utils/tournament-status";
import {
  computeSwissStandingsDetailedFromBracket,
  filterSwissGroupRounds,
  formatSwissPoolLabel,
  getCurrentSwissRoundFromBracket,
  isPublicSwissRoundComplete,
  isSwissPlayoffRound,
  parseSwissPoolKey,
  parseSwissRoundNumber,
  swissStandingsLabel,
  swissStandingsThroughRound,
  SWISS_LOSSES_TO_ELIMINATE,
  SWISS_WINS_TO_ADVANCE,
} from "../../utils/swiss-standings";
import type { BracketMatch, BracketRound } from "../../types";
import { BracketTab } from "./BracketTab";
import { PublicBracketTeamSlot } from "./PublicBracketTeamSlot";

interface SwissBracketTabProps {
  bracket: BracketRound[];
  format: string;
  teamTags?: Map<string, string>;
  teamNames?: string[];
  seedByTeam?: Map<string, number>;
  tournamentStatus?: string;
}

export function SwissBracketTab({
  bracket,
  format,
  teamTags,
  teamNames,
  seedByTeam,
  tournamentStatus,
}: SwissBracketTabProps) {
  const swissRounds = filterSwissGroupRounds(bracket);
  const playoffRounds = bracket.filter((round) => isSwissPlayoffRound(round));
  const playoffsStarted = playoffRounds.length > 0;
  const currentRound = getCurrentSwissRoundFromBracket(swissRounds);
  const totalRounds = swissRounds.length;
  const [selectedRound, setSelectedRound] = useState(currentRound);
  const prevCurrentRoundRef = useRef(currentRound);

  useEffect(() => {
    setSelectedRound((round) => Math.min(Math.max(1, round), Math.max(1, totalRounds)));
  }, [totalRounds]);

  useEffect(() => {
    const prevCurrent = prevCurrentRoundRef.current;
    prevCurrentRoundRef.current = currentRound;

    if (currentRound > prevCurrent && selectedRound === prevCurrent) {
      setSelectedRound(currentRound);
    }
  }, [currentRound, selectedRound]);

  const activeRound = Math.min(Math.max(1, selectedRound), Math.max(1, totalRounds));
  const activeRoundData = swissRounds.find((round) => parseSwissRoundNumber(round) === activeRound);
  const roundMatches = activeRoundData?.matches ?? [];
  const roundByes = activeRoundData?.swissByes ?? [];
  const activeRoundComplete = activeRoundData
    ? isPublicSwissRoundComplete(activeRoundData)
    : false;
  const hasDecidedInActiveRound =
    roundMatches.some((match) => !!match.winner && match.teamA && match.teamB) ||
    roundByes.length > 0;
  const standingsThroughRound = swissStandingsThroughRound(activeRound);

  const standings = playoffsStarted
    ? computeSwissStandingsDetailedFromBracket(swissRounds, { teamNames, seedByTeam })
    : computeSwissStandingsDetailedFromBracket(swissRounds, {
        throughRound: standingsThroughRound,
        teamNames,
        seedByTeam,
      });

  const statusByTeam = new Map(standings.map((entry) => [entry.team, entry.status]));

  const standingsLabel = swissStandingsLabel({
    playoffsStarted,
    activeRound,
    activeRoundComplete,
    hasDecidedInActiveRound,
  });

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
        <span className="h-px w-8 bg-border" />
        {format} Bracket
        <span className="h-px flex-1 bg-border" />
      </div>

      <SwissFormatIntro
        winsToAdvance={SWISS_WINS_TO_ADVANCE}
        lossesToEliminate={SWISS_LOSSES_TO_ELIMINATE}
      />

      {playoffsStarted && (
        <SwissPhaseBanner
          variant="playoffs-public"
          completed={tournamentStatus ? isTournamentConcluded(tournamentStatus) : false}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,1.4fr)]">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-base font-bold uppercase tracking-[0.18em]">
              Standings
            </h3>
            <span className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
              {standingsLabel}
            </span>
          </div>

          <div className="overflow-hidden border border-border bg-card">
            <div className="custom-scrollbar max-h-[640px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur">
                  <tr className="text-left font-tech text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2.5 text-center">#</th>
                    <th className="px-3 py-2.5">Team</th>
                    <th className="px-2 py-2.5 text-center">W</th>
                    <th className="px-2 py-2.5 text-center">L</th>
                    <th className="px-2 py-2.5 text-center">MP</th>
                    <th className="px-2 py-2.5 text-center">BH</th>
                    <th className="px-2 py-2.5 text-center">OMW%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {standings.map((entry) => {
                    const top = entry.rank <= 4;
                    const tag = teamTags?.get(entry.team);
                    return (
                      <tr
                        key={entry.team}
                        className={cn(
                          "transition-colors hover:bg-muted/40",
                          entry.status === "advanced" && "border-l-2 border-l-emerald-400/50",
                          entry.status === "eliminated" && "border-l-2 border-l-red-400/40 opacity-75",
                        )}
                      >
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={cn(
                              "inline-grid h-6 w-6 place-items-center font-mono text-xs font-bold",
                              top
                                ? "border border-amber-400/35 bg-amber-400/10 text-amber-300"
                                : "text-muted-foreground",
                            )}
                          >
                            {entry.rank}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="grid h-6 w-6 shrink-0 place-items-center border border-border bg-muted/80 font-tech text-[9px] font-bold uppercase">
                              {(tag ?? entry.team.slice(0, 3)).slice(0, 3)}
                            </span>
                            <span className="truncate font-semibold">{entry.team}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-center font-mono tabular-nums text-emerald-400">
                          {entry.record.wins}
                        </td>
                        <td className="px-2 py-2.5 text-center font-mono tabular-nums text-muted-foreground">
                          {entry.record.losses}
                        </td>
                        <td className="px-2 py-2.5 text-center font-mono text-xs font-bold tabular-nums">
                          {entry.matchPoints}
                        </td>
                        <td className="px-2 py-2.5 text-center font-mono text-xs tabular-nums text-muted-foreground">
                          {entry.buchholz.toFixed(1)}
                        </td>
                        <td className="px-2 py-2.5 text-center font-mono text-xs tabular-nums text-muted-foreground">
                          {(entry.omw * 100).toFixed(0)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-base font-bold uppercase tracking-[0.18em]">
              Round {activeRound} Pairings
            </h3>

            {totalRounds > 0 && (
              <div className="flex items-center gap-1 border border-border bg-card p-1">
                <button
                  type="button"
                  onClick={() => setSelectedRound((round) => Math.max(1, round - 1))}
                  disabled={activeRound === 1}
                  className="grid h-8 w-8 place-items-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                  aria-label="Previous round"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {swissRounds.map((round) => {
                  const roundNumber = parseSwissRoundNumber(round);
                  return (
                    <button
                      key={round.id ?? round.label}
                      type="button"
                      onClick={() => setSelectedRound(roundNumber)}
                      className={cn(
                        "h-8 min-w-8 px-2 font-mono text-xs font-bold transition-colors",
                        activeRound === roundNumber
                          ? "bg-primary text-primary-foreground"
                          : roundNumber === currentRound
                            ? "text-amber-400"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {roundNumber}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setSelectedRound((round) => Math.min(totalRounds, round + 1))}
                  disabled={activeRound === totalRounds}
                  className="grid h-8 w-8 place-items-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                  aria-label="Next round"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div
            key={activeRound}
            className="grid animate-in fade-in-0 slide-in-from-bottom-2 gap-3 duration-300 sm:grid-cols-2"
          >
            {roundMatches.map((match) => (
              <PublicSwissMatchCard
                key={match.id}
                match={match}
                teamTags={teamTags}
                statusByTeam={statusByTeam}
              />
            ))}
            {roundByes.length > 0 && (
              <div className="border border-dashed border-border bg-card/30 p-3 sm:col-span-2">
                <p className="mb-2 font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                  Bye
                </p>
                <div className="flex flex-wrap gap-2">
                  {roundByes.map((team) => (
                    <Badge key={team} variant="outline" className="font-tech text-[10px]">
                      {teamTags?.get(team) ? `${teamTags.get(team)} · ${team}` : team}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {roundMatches.length === 0 && roundByes.length === 0 && (
              <p className="text-sm text-muted-foreground sm:col-span-2">
                No pairings for this round yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {playoffRounds.length > 0 && (
        <section className="space-y-6 border-t border-white/8 pt-10">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-border" />
            <div>
              <p className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
                Championship
              </p>
              <h3 className="font-display text-xl tracking-display">Playoff Bracket</h3>
            </div>
          </div>
          <BracketTab bracket={playoffRounds} format="Single Elimination" teamTags={teamTags} />
        </section>
      )}
    </div>
  );
}

function PublicSwissMatchCard({
  match,
  teamTags,
  statusByTeam,
}: {
  match: BracketMatch;
  teamTags?: Map<string, string>;
  statusByTeam: Map<string, "active" | "advanced" | "eliminated">;
}) {
  const decided = !!match.winner;
  const hasScores = match.scoreA !== undefined && match.scoreB !== undefined;
  const poolKey = parseSwissPoolKey(match.round);

  return (
    <div
      className={cn(
        "match-card border border-border bg-card",
        decided && "ring-1 ring-emerald-400/30",
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-2 py-1">
        <span className="text-[10px] font-tech uppercase tracking-wider text-muted-foreground">
          {match.label ?? match.round}
        </span>
        <div className="flex items-center gap-2">
          {poolKey !== "0-0" && (
            <Badge variant="outline" className="font-tech text-[9px] uppercase">
              {formatSwissPoolLabel(poolKey)}
            </Badge>
          )}
          {decided && (
            <span className="text-[9px] font-tech text-emerald-400/70 uppercase tracking-wider">
              Final
            </span>
          )}
        </div>
      </div>

      <PublicBracketTeamSlot
        name={match.teamA}
        tag={match.teamA ? teamTags?.get(match.teamA) : undefined}
        score={match.scoreA}
        isWinner={decided && match.winner === match.teamA}
        isLoser={decided && !!match.teamA && match.winner !== match.teamA}
        hasScores={hasScores}
        swissStatus={match.teamA ? statusByTeam.get(match.teamA) : undefined}
      />
      <PublicBracketTeamSlot
        name={match.teamB}
        tag={match.teamB ? teamTags?.get(match.teamB) : undefined}
        score={match.scoreB}
        isWinner={decided && match.winner === match.teamB}
        isLoser={decided && !!match.teamB && match.winner !== match.teamB}
        hasScores={hasScores}
        swissStatus={match.teamB ? statusByTeam.get(match.teamB) : undefined}
      />
    </div>
  );
}
