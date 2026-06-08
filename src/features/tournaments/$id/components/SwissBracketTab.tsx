/**
 * Public read-only Swiss-system bracket viewer.
 * Mirrors the admin SwissBracketView layout (rounds → record pools → match cards).
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SwissFormatIntro } from "../../components/SwissFormatIntro";
import { SwissPhaseBanner } from "../../components/SwissPhaseBanner";
import { isTournamentConcluded } from "../../utils/tournament-status";
import { SwissResultsBoard } from "../../components/SwissResultsBoard";
import { withTeamTags } from "../../utils/team-tags";
import {
  computeSwissStandingsFromBracket,
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
  tournamentStatus?: string;
}

function parsePoolKey(matchRound: string): string {
  const poolPart = matchRound.includes(" · ") ? matchRound.split(" · ")[1] : null;
  if (!poolPart) return "0-0";
  const match = poolPart.match(/(\d+)W-(\d+)L/i);
  return match ? `${match[1]}-${match[2]}` : "0-0";
}

function formatPoolLabel(poolKey: string): string {
  const [w, l] = poolKey.split("-").map(Number);
  return `${w}W-${l}L`;
}

function isPlayoffRound(round: BracketRound): boolean {
  return /playoffs?/i.test(round.label);
}

export function SwissBracketTab({
  bracket,
  format,
  teamTags,
  tournamentStatus,
}: SwissBracketTabProps) {
  const swissRounds = bracket.filter((round) => !isPlayoffRound(round));
  const playoffRounds = bracket.filter((round) => isPlayoffRound(round));
  const standings = computeSwissStandingsFromBracket(swissRounds);
  const advanced = standings.filter((entry) => entry.status === "advanced");
  const eliminated = standings.filter((entry) => entry.status === "eliminated");
  const active = standings.filter((entry) => entry.status === "active");

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

      {playoffRounds.length > 0 && (
        <SwissPhaseBanner
          variant="playoffs-public"
          completed={tournamentStatus ? isTournamentConcluded(tournamentStatus) : false}
        />
      )}

      {swissRounds.map((round) => {
        const poolKeys = [
          ...new Set(round.matches.map((match) => parsePoolKey(match.round ?? round.label))),
        ].sort((a, b) => {
          const [aw, al] = a.split("-").map(Number);
          const [bw, bl] = b.split("-").map(Number);
          if (bw !== aw) return bw - aw;
          return al - bl;
        });

        return (
          <section key={round.label} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <h3 className="font-display text-sm uppercase tracking-wider">{round.label}</h3>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {poolKeys.map((poolKey) => {
                const poolMatches = round.matches.filter(
                  (match) => parsePoolKey(match.round ?? round.label) === poolKey,
                );

                return (
                  <Card key={`${round.label}-${poolKey}`} className="border-border bg-card/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between font-tech text-xs uppercase tracking-wider">
                        <span>{formatPoolLabel(poolKey)}</span>
                        <Badge variant="outline" className="font-tech text-[10px]">
                          {poolMatches.length} {poolMatches.length === 1 ? "match" : "matches"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {poolMatches.map((match) => (
                        <PublicSwissMatchCard
                          key={match.id}
                          match={match}
                          standings={standings}
                          teamTags={teamTags}
                        />
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}

      <SwissResultsBoard
        variant="public"
        advanced={withTeamTags(
          advanced.map((entry) => ({ team: entry.team, record: entry.record })),
          teamTags,
        )}
        eliminated={withTeamTags(
          eliminated.map((entry) => ({ team: entry.team, record: entry.record })),
          teamTags,
        )}
        active={withTeamTags(
          active.map((entry) => ({ team: entry.team, record: entry.record })),
          teamTags,
        )}
      />

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
  standings,
  teamTags,
}: {
  match: BracketMatch;
  standings: ReturnType<typeof computeSwissStandingsFromBracket>;
  teamTags?: Map<string, string>;
}) {
  const decided = !!match.winner;
  const hasScores = match.scoreA !== undefined && match.scoreB !== undefined;
  const statusByTeam = new Map(standings.map((entry) => [entry.team, entry.status]));

  return (
    <div className={cn("border border-border bg-card", decided && "ring-1 ring-emerald-400/30")}>
      {match.round && (
        <div className="flex items-center justify-between border-b border-border/60 px-2 py-1">
          <span className="text-[10px] font-tech uppercase tracking-wider text-muted-foreground">
            {match.round}
          </span>
          {decided && (
            <span className="text-[9px] font-tech text-emerald-400/70 uppercase tracking-wider">
              Final
            </span>
          )}
        </div>
      )}

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
