import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BracketFormatToolbar,
  BracketRoundFormatControl,
  BracketRoundScheduleControl,
  BracketRoundScheduleDisplay,
  BracketScheduleToolbar,
} from "@/features/tournaments/components/bracket";
import { SwissFormatIntro } from "@/features/tournaments/components/SwissFormatIntro";
import { SwissPhaseBanner } from "@/features/tournaments/components/SwissPhaseBanner";
import { isTournamentConcluded } from "@/features/tournaments/utils/tournament-status";
import { buildSeedByTeam } from "@/features/tournaments/utils/swiss-tiebreaks";
import {
  swissStandingsLabel,
  swissStandingsThroughRound,
} from "@/features/tournaments/utils/swiss-standings";
import type { TournamentTeam } from "@/features/tournaments/types";
import type {
  BestOfFormat,
  BracketRoundMeta,
  ManagedMatch,
  RoundSchedule,
} from "../utils/managed-bracket";
import { winsRequired } from "../utils/managed-bracket";
import { getLockedFormatRoundIds } from "./RoundFormatPanel";
import {
  formatSwissPoolLabel,
  getCurrentSwissRound,
  getQualifiedTeams,
  getSwissPhase,
  getSwissStandingsDetailed,
  getSwissTeamStatus,
  isSwissRoundCompleteWithByes,
  type SwissBracketState,
} from "../utils/managed-swiss-bracket";

interface SwissBracketViewProps {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
  roundFormats: Record<string, BestOfFormat>;
  roundSchedules: Record<string, RoundSchedule>;
  teams: TournamentTeam[];
  swiss: SwissBracketState;
  tournamentStatus?: string;
  readOnly?: boolean;
  canStartPlayoffs?: boolean;
  onStartPlayoffs?: () => void;
  onFormatChange: (roundId: string, format: BestOfFormat) => void;
  onScheduleChange: (roundId: string, schedule: RoundSchedule | undefined) => void;
  onApplyRecommendedFormats?: () => void;
  onScoreChange: (matchId: string, scoreA: number, scoreB: number) => void;
  onPickWinner: (matchId: string, winner: string) => void;
}

export function SwissBracketView({
  matches,
  roundMetas,
  roundFormats,
  roundSchedules,
  teams,
  swiss,
  tournamentStatus,
  readOnly = false,
  canStartPlayoffs = false,
  onStartPlayoffs,
  onFormatChange,
  onScheduleChange,
  onApplyRecommendedFormats,
  onScoreChange,
  onPickWinner,
}: SwissBracketViewProps) {
  const teamByName = new Map(teams.map((team) => [team.name, team]));
  const swissRounds = roundMetas.filter((round) => round.side === "swiss");
  const currentRound = getCurrentSwissRound(matches, roundMetas);
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
  const roundMeta = swissRounds.find((round) => round.id === `sw-r${activeRound}`);
  const roundMatches = roundMeta
    ? roundMeta.matchIds
        .map((id) => matches.find((match) => match.id === id))
        .filter((match): match is ManagedMatch => !!match)
    : [];
  const roundByes = swiss.byesByRound?.[String(activeRound)] ?? [];
  const activeRoundComplete = isSwissRoundCompleteWithByes(matches, activeRound, swiss);
  const hasDecidedInActiveRound =
    roundMatches.some((match) => match.confirmed && match.winner) || roundByes.length > 0;
  const standingsThroughRound = swissStandingsThroughRound(activeRound);
  const teamNames = teams.map((team) => team.name);
  const seedByTeam = useMemo(() => buildSeedByTeam(teamNames, teams), [teamNames, teams]);
  const playoffsStarted = getSwissPhase(swiss) === "playoffs";
  const standings = playoffsStarted
    ? getSwissStandingsDetailed(teamNames, swiss, matches, { seedByTeam })
    : getSwissStandingsDetailed(teamNames, swiss, matches, {
        throughRound: standingsThroughRound,
        seedByTeam,
      });
  const lockedFormatRoundIds = getLockedFormatRoundIds(matches);
  const qualifiedCount = getQualifiedTeams(teamNames, swiss, matches, seedByTeam).length;
  const tournamentCompleted = tournamentStatus ? isTournamentConcluded(tournamentStatus) : false;

  const format = roundMeta ? (roundFormats[roundMeta.id] ?? "BO3") : "BO3";

  const standingsLabel = swissStandingsLabel({
    playoffsStarted,
    activeRound,
    activeRoundComplete,
    hasDecidedInActiveRound,
  });

  return (
    <div className="space-y-8">
      <SwissFormatIntro
        winsToAdvance={swiss.winsToAdvance}
        lossesToEliminate={swiss.lossesToEliminate}
      />

      {canStartPlayoffs && onStartPlayoffs && (
        <SwissPhaseBanner
          variant="group-complete"
          qualifiedCount={qualifiedCount}
          onStartPlayoffs={onStartPlayoffs}
        />
      )}

      {playoffsStarted && (
        <SwissPhaseBanner
          variant="playoffs-live"
          completed={tournamentCompleted}
          thirdPlaceMatch={swiss.playoffThirdPlaceMatch}
        />
      )}

      {!readOnly && onApplyRecommendedFormats && (
        <>
          <BracketFormatToolbar onApplyRecommended={onApplyRecommendedFormats} />
          <BracketScheduleToolbar />
        </>
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
                    const team = teamByName.get(entry.team);
                    const top = entry.rank <= 4;
                    return (
                      <tr
                        key={entry.team}
                        className={cn(
                          "transition-colors hover:bg-muted/40",
                          entry.status === "advanced" && "border-l-2 border-l-emerald-400/50",
                          entry.status === "eliminated" &&
                            "border-l-2 border-l-red-400/40 opacity-75",
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
                              {(team?.tag ?? entry.team.slice(0, 3)).slice(0, 3)}
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
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-display text-base font-bold uppercase tracking-[0.18em]">
                Round {activeRound} Pairings
              </h3>
              {roundMeta &&
                (!readOnly ? (
                  <div className="flex flex-col gap-2">
                    <BracketRoundFormatControl
                      value={format}
                      disabled={lockedFormatRoundIds.has(roundMeta.id)}
                      onChange={(next) => onFormatChange(roundMeta.id, next)}
                    />
                    <BracketRoundScheduleControl
                      value={roundSchedules[roundMeta.id]}
                      onChange={(next) => onScheduleChange(roundMeta.id, next)}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <span className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                      {format}
                    </span>
                    <BracketRoundScheduleDisplay
                      schedule={roundSchedules[roundMeta.id]}
                      variant="card"
                    />
                  </div>
                ))}
            </div>

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
                  const roundNumber = Number.parseInt(round.id.replace("sw-r", ""), 10);
                  return (
                    <button
                      key={round.id}
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
              <SwissMatchCard
                key={match.id}
                match={match}
                format={format}
                teamByName={teamByName}
                swiss={swiss}
                readOnly={readOnly}
                onScoreChange={onScoreChange}
                onPickWinner={onPickWinner}
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
                      {team}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SwissMatchCard({
  match,
  format,
  teamByName,
  swiss,
  readOnly,
  onScoreChange,
  onPickWinner,
}: {
  match: ManagedMatch;
  format: BestOfFormat;
  teamByName: Map<string, TournamentTeam>;
  swiss: SwissBracketState;
  readOnly?: boolean;
  onScoreChange: (matchId: string, scoreA: number, scoreB: number) => void;
  onPickWinner: (matchId: string, winner: string) => void;
}) {
  const required = winsRequired(format);
  const matchDecided = match.confirmed && match.winner !== null;

  return (
    <div
      data-bracket-interactive
      onPointerDown={(event) => event.stopPropagation()}
      className={cn(
        "match-card border border-border bg-background/60",
        matchDecided && "ring-1 ring-emerald-400/30",
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-2 py-1">
        <span className="text-[10px] font-tech uppercase tracking-wider text-muted-foreground">
          {match.label}
        </span>
        {match.swissPool && (
          <Badge variant="outline" className="font-tech text-[9px] uppercase">
            {formatSwissPoolLabel(match.swissPool)}
          </Badge>
        )}
      </div>
      <SwissTeamRow
        name={match.teamA}
        score={match.scoreA}
        required={required}
        status={match.teamA ? getSwissTeamStatus(match.teamA, swiss) : "active"}
        isWinner={!!match.teamA && match.winner === match.teamA}
        isLoser={matchDecided && !!match.teamA && match.winner !== match.teamA}
        team={match.teamA ? teamByName.get(match.teamA) : undefined}
        disabled={readOnly || !match.teamA || !match.teamB}
        onIncrement={() => onScoreChange(match.id, match.scoreA + 1, match.scoreB)}
        onDecrement={() => onScoreChange(match.id, Math.max(0, match.scoreA - 1), match.scoreB)}
        onSelectWinner={() => match.teamA && onPickWinner(match.id, match.teamA)}
      />
      <SwissTeamRow
        name={match.teamB}
        score={match.scoreB}
        required={required}
        status={match.teamB ? getSwissTeamStatus(match.teamB, swiss) : "active"}
        isWinner={!!match.teamB && match.winner === match.teamB}
        isLoser={matchDecided && !!match.teamB && match.winner !== match.teamB}
        team={match.teamB ? teamByName.get(match.teamB) : undefined}
        disabled={readOnly || !match.teamA || !match.teamB}
        onIncrement={() => onScoreChange(match.id, match.scoreA, match.scoreB + 1)}
        onDecrement={() => onScoreChange(match.id, match.scoreA, Math.max(0, match.scoreB - 1))}
        onSelectWinner={() => match.teamB && onPickWinner(match.id, match.teamB)}
      />
    </div>
  );
}

function SwissTeamRow({
  name,
  score,
  required,
  status,
  isWinner,
  isLoser,
  team,
  disabled,
  onIncrement,
  onDecrement,
  onSelectWinner,
}: {
  name: string | null;
  score: number;
  required: number;
  status: "active" | "advanced" | "eliminated";
  isWinner: boolean;
  isLoser?: boolean;
  team?: TournamentTeam;
  disabled: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onSelectWinner: () => void;
}) {
  const isTbd = !name;
  const display = name ?? "TBD";
  const abbr = isTbd ? "?" : (team?.tag ?? name!.slice(0, 2).toUpperCase());
  const controlsDisabled = disabled || isTbd;

  return (
    <div
      className={cn(
        "flex items-center gap-1 border-b border-border/40 px-2 py-1.5 last:border-0",
        isWinner && "bg-emerald-400/10",
        isLoser && "bg-muted/15 opacity-80",
        status === "advanced" && "border-l-2 border-l-emerald-400/50",
        status === "eliminated" && "border-l-2 border-l-red-400/40 opacity-70",
      )}
    >
      <button
        type="button"
        onClick={onSelectWinner}
        disabled={controlsDisabled}
        aria-label={
          isTbd ? "Set winner" : isWinner ? `Clear winner (${display})` : `Set ${display} as winner`
        }
        className={cn(
          "h-2 w-2 shrink-0 rounded-full border",
          isWinner
            ? "border-emerald-400 bg-emerald-400"
            : "border-muted-foreground/40 hover:bg-muted/30",
          controlsDisabled && "opacity-40",
        )}
        title={name ? (isWinner ? `Clear winner (${name})` : `Set ${name} as winner`) : undefined}
      />
      <span className="w-6 text-center text-[10px] font-tech text-muted-foreground">{abbr}</span>
      <span className="min-w-0 flex-1 truncate text-xs font-medium">{display}</span>
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={controlsDisabled || score <= 0}
          aria-label={isTbd ? "Decrease score" : `Decrease score for ${display}`}
          onClick={onDecrement}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-5 text-center text-xs font-bold tabular-nums">
          {isTbd ? "—" : score}
          {!isTbd && <span className="text-[9px] text-muted-foreground">/{required}</span>}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={controlsDisabled || score >= required}
          aria-label={isTbd ? "Increase score" : `Increase score for ${display}`}
          onClick={onIncrement}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
