import React from "react";
import { Trophy, Check } from "lucide-react";
import { ProfessionalMatchCard } from "../features/tournament-details/components/ProfessionalMatchCard";
import type {
  BracketEngine,
  BracketStructure,
  BracketMatch,
} from "../features/tournament-details/types/bracket-engine";

interface ProfessionalBracketViewProps {
  bracketEngine: BracketEngine;
  onMatchUpdate: (matchId: string, update: Partial<BracketMatch>) => void;
}

export function ProfessionalBracketView({
  bracketEngine,
  onMatchUpdate,
}: ProfessionalBracketViewProps) {
  const bracketStructure = bracketEngine.getBracketStructure();
  const validation = bracketEngine.validateBracketIntegrity();

  // Generate connection lines between matches
  const generateConnectionLines = (structure: BracketStructure): React.ReactElement[] => {
    const lines: React.ReactElement[] = [];
    for (const round of structure.rounds) {
      for (const match of round.matches) {
        if (match.nextMatchId) {
          const nextMatch = structure.rounds
            .flatMap((r) => r.matches)
            .find((m) => m.matchId === match.nextMatchId);

          if (nextMatch) {
            const startX = match.position.x + 256 + 80; // card width + padding offset
            const startY = match.position.y + 56 + 100; // card height / 2 + top padding adjustment
            const endX = nextMatch.position.x + 80; // add padding offset
            const endY = nextMatch.position.y + 56 + 100; // add top padding adjustment

            const midX = startX + (endX - startX) / 2;

            lines.push(
              <g key={`line-${match.matchId}`}>
                {/* Horizontal line from match */}
                <line
                  x1={startX}
                  y1={startY}
                  x2={midX}
                  y2={startY}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="2"
                />
                {/* Vertical connector */}
                <line
                  x1={midX}
                  y1={startY}
                  x2={midX}
                  y2={endY}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="2"
                />
                {/* Horizontal line to next match */}
                <line
                  x1={midX}
                  y1={endY}
                  x2={endX}
                  y2={endY}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="2"
                />
              </g>,
            );
          }
        }
      }
    }

    return lines;
  };
  return (
    <div className="relative">
      {/* Professional Bracket Container */}
      <div className="relative overflow-auto rounded-lg border border-border bg-linear-to-br from-card via-muted/20 to-card shadow-2xl">
        {/* Bracket Header */}
        <div className="border-b border-border bg-linear-to-r from-muted/30 to-muted/10 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-display font-bold tracking-wider-2 text-foreground">
                Tournament Bracket
              </h3>
              <p className="mt-1 text-sm-readable text-muted-foreground">
                {bracketStructure.totalRounds} rounds •{" "}
                {bracketStructure.rounds.reduce((acc, r) => acc + r.matches.length, 0)} total
                matches
              </p>
            </div>
            <div className="flex items-center gap-2">
              {validation.canPublish ? (
                <div className="flex items-center gap-2 rounded-full bg-emerald-950/20 px-4 py-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm-readable font-medium text-emerald-400">
                    Ready to Publish
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-full bg-amber-950/20 px-4 py-2">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  <span className="text-sm-readable font-medium text-amber-400">In Progress</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Professional Bracket Visualization - Responsive Container */}
        <div className="relative">
          {/* Scrollable bracket container with custom styling - no horizontal scroll issues */}
          <div className="custom-scrollbar overflow-auto" style={{ maxHeight: "75vh" }}>
            <div
              className="relative p-8"
              style={{
                width: `${bracketStructure.totalRounds * 320 + 160}px`,
                minWidth: "100%",
                height: `${Math.pow(2, Math.max(0, bracketStructure.totalRounds - 1)) * 160 + 280}px`,
                minHeight: "500px",
              }}
            >
              {/* Round Labels - Properly positioned at top with enough clearance */}
              <div className="relative" style={{ paddingTop: "100px", paddingBottom: "60px" }}>
                {bracketStructure.rounds.map((round) => (
                  <div
                    key={round.roundNumber}
                    className="absolute top-8 bg-muted/90 backdrop-blur-sm border border-border rounded-lg px-4 py-2 shadow-lg z-20"
                    style={{ left: `${(round.roundNumber - 1) * 320 + 80}px` }}
                  >
                    <h4 className="text-sm-readable font-display font-bold text-foreground">
                      {round.roundName}
                    </h4>
                    <div className="text-xs-readable text-muted-foreground">
                      {round.matches.length} match{round.matches.length !== 1 ? "es" : ""}
                    </div>
                  </div>
                ))}

                {/* Connection Lines (SVG) - Positioned properly */}
                <svg
                  className="absolute pointer-events-none z-10"
                  style={{
                    width: "100%",
                    height: "100%",
                    top: "100px",
                    left: "0px",
                  }}
                >
                  {generateConnectionLines(bracketStructure)}
                </svg>

                {/* Match Cards - Positioned with proper clearance */}
                <div className="relative" style={{ paddingTop: "100px", paddingLeft: "80px" }}>
                  {bracketStructure.rounds.flatMap((round) =>
                    round.matches.map((match) => (
                      <ProfessionalMatchCard
                        key={match.matchId}
                        match={match}
                        teamOptions={[]} // Not used anymore, handled by engine
                        onChange={onMatchUpdate}
                        getAvailableTeams={(excludeMatchId?: string) =>
                          bracketEngine.getAvailableTeams(excludeMatchId)
                        }
                      />
                    )),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Bracket Legend */}
      <div className="mt-8 rounded-lg border border-border bg-linear-to-br from-muted/20 to-transparent p-6 shadow-lg">
        <h4 className="mb-4 text-lg font-display font-bold tracking-wider-2 text-foreground">
          Tournament Legend
        </h4>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/20">
              <Check className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-sm-readable font-medium text-foreground">Match Completed</div>
              <div className="text-xs-readable text-muted-foreground">
                Result confirmed & locked
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/20">
              <Trophy className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <div className="text-sm-readable font-medium text-foreground">Match Ready</div>
              <div className="text-xs-readable text-muted-foreground">
                Teams set, awaiting result
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-dashed border-white/30" />
            <div>
              <div className="text-sm-readable font-medium text-foreground">Awaiting Teams</div>
              <div className="text-xs-readable text-muted-foreground">
                Previous matches incomplete
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-400/20">
              <Trophy className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <div className="text-sm-readable font-medium text-foreground">Auto-Advance</div>
              <div className="text-xs-readable text-muted-foreground">
                Winners advance automatically
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
