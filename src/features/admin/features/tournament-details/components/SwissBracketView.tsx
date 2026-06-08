import { Minus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SwissFormatIntro } from "@/features/tournaments/components/SwissFormatIntro";
import { SwissPhaseBanner } from "@/features/tournaments/components/SwissPhaseBanner";
import { isTournamentConcluded } from "@/features/tournaments/utils/tournament-status";
import { SwissResultsBoard } from "@/features/tournaments/components/SwissResultsBoard";
import type { TournamentTeam } from "@/features/tournaments/types";
import type { BestOfFormat, BracketRoundMeta, ManagedMatch } from "../utils/managed-bracket";
import { winsRequired } from "../utils/managed-bracket";
import {
  formatSwissPoolLabel,
  getQualifiedTeams,
  getSwissPhase,
  getSwissStandings,
  getSwissTeamStatus,
  type SwissBracketState,
} from "../utils/managed-swiss-bracket";

interface SwissBracketViewProps {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
  roundFormats: Record<string, BestOfFormat>;
  teams: TournamentTeam[];
  swiss: SwissBracketState;
  tournamentStatus?: string;
  readOnly?: boolean;
  canStartPlayoffs?: boolean;
  onStartPlayoffs?: () => void;
  onFormatChange: (roundId: string, format: BestOfFormat) => void;
  onScoreChange: (matchId: string, scoreA: number, scoreB: number) => void;
  onPickWinner: (matchId: string, winner: string) => void;
}

export function SwissBracketView({
  matches,
  roundMetas,
  roundFormats,
  teams,
  swiss,
  tournamentStatus,
  readOnly = false,
  canStartPlayoffs = false,
  onStartPlayoffs,
  onFormatChange,
  onScoreChange,
  onPickWinner,
}: SwissBracketViewProps) {
  const teamByName = new Map(teams.map((team) => [team.name, team]));
  const teamNames = teams.map((team) => team.name);
  const standings = getSwissStandings(teamNames, swiss);
  const advanced = standings.filter((entry) => entry.status === "advanced");
  const eliminated = standings.filter((entry) => entry.status === "eliminated");
  const active = standings.filter((entry) => entry.status === "active");
  const swissRounds = roundMetas.filter((round) => round.side === "swiss");
  const playoffsStarted = getSwissPhase(swiss) === "playoffs";
  const qualifiedCount = getQualifiedTeams(teamNames, swiss).length;
  const tournamentCompleted = tournamentStatus
    ? isTournamentConcluded(tournamentStatus)
    : false;

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
        <SwissPhaseBanner variant="playoffs-live" completed={tournamentCompleted} />
      )}

      {swissRounds.map((round) => {
        const roundMatches = round.matchIds
          .map((id) => matches.find((match) => match.id === id))
          .filter((match): match is ManagedMatch => !!match);
        const poolKeys = [...new Set(roundMatches.map((match) => match.swissPool ?? "0-0"))].sort(
          (a, b) => {
            const [aw, al] = a.split("-").map(Number);
            const [bw, bl] = b.split("-").map(Number);
            if (bw !== aw) return bw - aw;
            return al - bl;
          },
        );
        const format = roundFormats[round.id] ?? "BO3";
        const roundNumber = Number.parseInt(round.id.replace("sw-r", ""), 10);
        const roundByes = swiss.byesByRound?.[String(roundNumber)] ?? [];

        return (
          <section key={round.id} className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
              <h3 className="font-display text-sm uppercase tracking-wider">{round.label}</h3>
              <SelectFormat
                roundId={round.id}
                value={format}
                readOnly={readOnly}
                onFormatChange={onFormatChange}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {poolKeys.map((poolKey) => {
                const poolMatches = roundMatches.filter((match) => match.swissPool === poolKey);
                return (
                  <Card key={`${round.id}-${poolKey}`} className="border-border bg-card/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between font-tech text-xs uppercase tracking-wider">
                        <span>{formatSwissPoolLabel(poolKey)}</span>
                        <Badge variant="outline" className="font-tech text-[10px]">
                          {poolMatches.length} match{poolMatches.length === 1 ? "" : "es"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {poolMatches.map((match) => (
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
                    </CardContent>
                  </Card>
                );
              })}
              {roundByes.length > 0 && (
                <Card className="border-dashed border-border bg-card/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-tech text-xs uppercase tracking-wider text-muted-foreground">
                      Bye
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {roundByes.map((team) => (
                      <div key={team} className="text-sm text-muted-foreground">
                        {team}{" "}
                        <span className="font-tech text-[10px] uppercase">(no match this round)</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        );
      })}

      <SwissResultsBoard
        variant="admin"
        advanced={advanced.map((entry) => ({
          team: entry.team,
          record: entry.record,
          tag: teamByName.get(entry.team)?.tag,
        }))}
        eliminated={eliminated.map((entry) => ({
          team: entry.team,
          record: entry.record,
          tag: teamByName.get(entry.team)?.tag,
        }))}
        active={active.map((entry) => ({
          team: entry.team,
          record: entry.record,
          tag: teamByName.get(entry.team)?.tag,
        }))}
      />
    </div>
  );
}

function SelectFormat({
  roundId,
  value,
  readOnly,
  onFormatChange,
}: {
  roundId: string;
  value: BestOfFormat;
  readOnly?: boolean;
  onFormatChange: (roundId: string, format: BestOfFormat) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-tech uppercase tracking-wider text-muted-foreground">
        Format
      </span>
      <select
        value={value}
        disabled={readOnly}
        onChange={(event) => onFormatChange(roundId, event.target.value as BestOfFormat)}
        className="h-7 rounded-md border border-border bg-background px-2 text-[10px] font-tech uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="BO1">BO1</option>
        <option value="BO3">BO3</option>
        <option value="BO5">BO5</option>
      </select>
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
      className={cn(
        "rounded-md border border-border bg-background/60",
        matchDecided && "ring-1 ring-emerald-400/30",
      )}
    >
      <div className="border-b border-border/60 px-2 py-1 text-[10px] font-tech uppercase tracking-wider text-muted-foreground">
        {match.label}
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
          onClick={onIncrement}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
