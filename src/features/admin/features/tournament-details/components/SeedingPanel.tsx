import { useMemo } from "react";
import { Shield, Swords, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TournamentTeam } from "@/features/tournaments/types";
import { bracketCapacity, byeCount, isPowerOfTwo } from "../utils/bracket-field";
import {
  roundOnePairingsForSeedingMode,
  roundOneSeedingPairings,
} from "@/features/tournaments/utils/tournament-seeding";
import { SeedingTeamPicker } from "./SeedingTeamPicker";

interface SeedingPanelProps {
  teams: TournamentTeam[];
  assignments: Array<TournamentTeam | null>;
  bracketSize: number;
  seedingMatchCount: number;
  hasSwissByeSlot: boolean;
  isSwiss?: boolean;
  isDoubleElim?: boolean;
  /** @deprecated Play-in seeding removed — byes are used instead. */
  directSeedCount?: number;
  /** @deprecated Play-in seeding removed — byes are used instead. */
  playInMatchCount?: number;
  disabled?: boolean;
  onTeamSelect: (slotIdx: number, teamId: string | null) => void;
}

function SeedingProtectedSlot({ seed }: { seed: number }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
        <Shield className="h-3 w-3 opacity-50" strokeWidth={1.5} aria-hidden />
        Seed {seed} · Protected
      </label>
      <div
        className="flex h-10 w-full items-center gap-2 border border-dashed border-border/80 bg-muted/15 px-3 text-muted-foreground"
        title="Round-one bye — no opponent"
      >
        <Shield className="h-3.5 w-3.5 shrink-0 opacity-40" strokeWidth={1.5} aria-hidden />
        <span className="font-tech text-[10px] uppercase tracking-wider">Round-one bye</span>
      </div>
    </div>
  );
}

function SeedingMatchCard({
  matchIndex,
  teamAIdx,
  teamBIdx,
  teamA,
  teamB,
  byeSide = "none",
  seedLabel,
  teams,
  usedTeamIds,
  disabled,
  onTeamSelect,
}: {
  matchIndex: number;
  teamAIdx: number;
  teamBIdx: number;
  teamA: TournamentTeam | null;
  teamB: TournamentTeam | null;
  byeSide?: "none" | "teamA" | "teamB";
  seedLabel?: string;
  teams: TournamentTeam[];
  usedTeamIds: Set<string>;
  disabled?: boolean;
  onTeamSelect: (slotIdx: number, teamId: string | null) => void;
}) {
  const isByeMatch = byeSide !== "none";
  const isComplete =
    byeSide === "none"
      ? Boolean(teamA && teamB)
      : byeSide === "teamA"
        ? Boolean(teamB)
        : Boolean(teamA);

  return (
    <div
      className={cn(
        "relative overflow-hidden border transition-colors",
        isComplete
          ? "border-amber-400/35 bg-amber-400/[0.03]"
          : "border-border bg-card hover:border-border-bright",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-linear-to-b from-white/[0.03] to-transparent" />
      <div className="relative flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="font-display text-sm tracking-wider">
          Match {String(matchIndex + 1).padStart(2, "0")}
        </p>
        <span
          className={cn(
            "flex items-center gap-1.5 font-tech text-[10px] uppercase tracking-wider",
            isComplete ? "text-amber-300/80" : "text-muted-foreground",
          )}
        >
          {isByeMatch && <Shield className="h-3 w-3 opacity-60" strokeWidth={1.5} aria-hidden />}
          {seedLabel ??
            (isByeMatch
              ? `Seed ${byeSide === "teamA" ? teamBIdx + 1 : teamAIdx + 1} protected`
              : `Seeds ${teamAIdx + 1} – ${teamBIdx + 1}`)}
        </span>
      </div>

      <div className="relative grid gap-4 p-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
        {byeSide === "teamA" ? (
          <SeedingProtectedSlot seed={teamAIdx + 1} />
        ) : (
          <SeedingTeamPicker
            label="Team A"
            seed={teamAIdx + 1}
            value={teamA}
            teams={teams}
            usedTeamIds={usedTeamIds}
            onChange={(teamId) => onTeamSelect(teamAIdx, teamId)}
            disabled={disabled}
          />
        )}

        <div className="place-self-center py-1 font-display text-lg tracking-wider text-muted-foreground/40 md:pb-2">
          {isByeMatch ? <Shield className="h-4 w-4" strokeWidth={1.5} aria-hidden /> : "vs"}
        </div>

        {byeSide === "teamB" ? (
          <SeedingProtectedSlot seed={teamBIdx + 1} />
        ) : (
          <SeedingTeamPicker
            label="Team B"
            seed={teamBIdx + 1}
            value={teamB}
            teams={teams}
            usedTeamIds={usedTeamIds}
            onChange={(teamId) => onTeamSelect(teamBIdx, teamId)}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
}

function ProtectedSeedSlot({
  seed,
  team,
  teams,
  usedTeamIds,
  disabled,
  onTeamSelect,
}: {
  seed: number;
  team: TournamentTeam | null;
  teams: TournamentTeam[];
  usedTeamIds: Set<string>;
  disabled?: boolean;
  onTeamSelect: (slotIdx: number, teamId: string | null) => void;
}) {
  const isComplete = Boolean(team);

  return (
    <div
      className={cn(
        "border bg-card p-4 transition-colors",
        isComplete ? "border-amber-400/30" : "border-border",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
          <Shield className="h-3 w-3 opacity-50" strokeWidth={1.5} aria-hidden />
          Protected seed
        </span>
        <span className="font-display text-xs tracking-wider text-muted-foreground/80">
          Seed {seed}
        </span>
      </div>
      <SeedingTeamPicker
        label=""
        seed={seed}
        value={team}
        teams={teams}
        usedTeamIds={usedTeamIds}
        onChange={(teamId) => onTeamSelect(seed - 1, teamId)}
        disabled={disabled}
      />
    </div>
  );
}

export function SeedingPanel({
  teams,
  assignments,
  bracketSize,
  seedingMatchCount,
  hasSwissByeSlot,
  isSwiss = false,
  isDoubleElim = false,
  directSeedCount = 0,
  playInMatchCount = 0,
  disabled = false,
  onTeamSelect,
}: SeedingPanelProps) {
  const isElimination = !isSwiss;
  const elimCapacity = isElimination ? bracketCapacity(bracketSize) : bracketSize;
  const elimByes = isElimination ? byeCount(bracketSize) : 0;

  const usedTeamIds = useMemo(() => {
    const ids = new Set<string>();
    for (const team of assignments) {
      if (team) ids.add(team.id);
    }
    return ids;
  }, [assignments]);

  const assignedCount = assignments.filter(Boolean).length;
  const progress = teams.length > 0 ? Math.round((assignedCount / teams.length) * 100) : 0;

  const unassignedTeams = useMemo(
    () => teams.filter((team) => !usedTeamIds.has(team.id)),
    [teams, usedTeamIds],
  );

  const roundOnePairings = useMemo(() => {
    if (isSwiss) return roundOnePairingsForSeedingMode(bracketSize);
    return roundOneSeedingPairings(bracketSize);
  }, [bracketSize, isSwiss]);

  const readyMatches = useMemo(() => {
    let ready = 0;
    const matchCount = isSwiss ? seedingMatchCount : roundOnePairings.length;
    for (let i = 0; i < matchCount; i++) {
      const isByeSlot = hasSwissByeSlot && i === seedingMatchCount - 1;
      const pairing = roundOnePairings[i];
      if (!pairing && !isByeSlot) continue;

      if (isSwiss && isByeSlot) {
        if (assignments[bracketSize - 1]) ready++;
        continue;
      }

      if (!pairing) continue;
      const teamA = pairing.seedA <= bracketSize ? assignments[pairing.seedA - 1] : null;
      const teamB = pairing.seedB <= bracketSize ? assignments[pairing.seedB - 1] : null;
      if (teamA && teamB) ready++;
      else if (teamA || teamB) ready++;
    }
    return ready;
  }, [assignments, bracketSize, hasSwissByeSlot, isSwiss, roundOnePairings, seedingMatchCount]);

  const standardMatches = useMemo(() => {
    return roundOnePairings.map((pairing, index) => {
      if (isSwiss && hasSwissByeSlot && index === roundOnePairings.length - 1) {
        return {
          key: `match-${index}`,
          matchIndex: index,
          teamAIdx: bracketSize - 1,
          teamBIdx: pairing.seedB - 1,
          byeSide: "teamB" as const,
          seedLabel: `Seed ${bracketSize} · protected`,
        };
      }

      const teamARegistered = pairing.seedA <= bracketSize;
      const teamBRegistered = pairing.seedB <= bracketSize;
      let byeSide: "none" | "teamA" | "teamB" = "none";
      if (isElimination) {
        if (teamARegistered && !teamBRegistered) byeSide = "teamB";
        else if (!teamARegistered && teamBRegistered) byeSide = "teamA";
      }

      return {
        key: `match-${index}`,
        matchIndex: index,
        teamAIdx: pairing.seedA - 1,
        teamBIdx: pairing.seedB - 1,
        byeSide,
        seedLabel:
          byeSide === "none"
            ? `Seeds ${pairing.seedA} – ${pairing.seedB}`
            : `Seed ${teamARegistered ? pairing.seedA : pairing.seedB} · protected`,
      };
    });
  }, [bracketSize, hasSwissByeSlot, isElimination, isSwiss, roundOnePairings]);

  const useProtectedSeedSection = isElimination && elimByes > 0;

  const protectedSeedNumbers = useMemo(
    () =>
      useProtectedSeedSection ? Array.from({ length: elimByes }, (_, index) => index + 1) : [],
    [useProtectedSeedSection, elimByes],
  );

  const openingMatches = useMemo(
    () =>
      useProtectedSeedSection
        ? standardMatches.filter((m) => m.byeSide === "none")
        : standardMatches,
    [standardMatches, useProtectedSeedSection],
  );

  const openingMatchCount = openingMatches.length;

  const totalMatchCount = isSwiss
    ? seedingMatchCount
    : useProtectedSeedSection
      ? openingMatchCount + elimByes
      : roundOnePairings.length;

  return (
    <div className="border-b border-border p-8">
      <div className="mb-6 overflow-hidden border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
                Bracket seeding
              </p>
              <h3 className="mt-1 font-display text-lg tracking-wider">Seed assignments</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 border border-border bg-secondary/30 px-2.5 py-1 font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                <Users2 className="h-3.5 w-3.5" />
                {assignedCount}/{teams.length} teams
              </span>
              <span className="inline-flex items-center gap-1.5 border border-border bg-secondary/30 px-2.5 py-1 font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                <Swords className="h-3.5 w-3.5" />
                {readyMatches}/{totalMatchCount} slots ready
              </span>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden bg-secondary">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  progress === 100 ? "bg-amber-400" : "bg-foreground/70",
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {isElimination && elimByes > 0 && (
          <div className="border-b border-border bg-secondary/10 px-5 py-3 font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
            {bracketSize} teams → {elimCapacity}-team bracket. Assign protected seeds (round-one
            byes) first, then fill opening matches.
          </div>
        )}

        {isSwiss && isPowerOfTwo(bracketSize) && (
          <div className="border-b border-border bg-secondary/10 px-5 py-3 font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
            Round 1 uses standard bracket seeding (1 vs {bracketSize}, 2 vs {bracketSize - 1}, …).
          </div>
        )}

        {isSwiss && !isPowerOfTwo(bracketSize) && (
          <div className="border-b border-border bg-secondary/10 px-5 py-3 font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
            Round 1 uses high-vs-low pairings (1 vs {bracketSize}, 2 vs {bracketSize - 1}, …).
          </div>
        )}

        {isElimination && elimByes === 0 && (
          <div className="border-b border-border bg-secondary/10 px-5 py-3 font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
            Round 1 uses standard bracket seeding (1 vs {elimCapacity}, 2 vs {elimCapacity - 1}, …).
          </div>
        )}

        {unassignedTeams.length > 0 && (
          <div className="border-b border-border bg-secondary/10 px-5 py-3">
            <p className="mb-2 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
              Unassigned ({unassignedTeams.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {unassignedTeams.map((team) => (
                <span
                  key={team.id}
                  className="inline-flex max-w-full items-center gap-2 border border-border bg-background/60 px-2 py-1"
                  title={team.name}
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center border border-border bg-secondary text-[8px] font-tech">
                    {team.tag}
                  </span>
                  <span className="truncate font-display text-xs tracking-wider">{team.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {assignedCount === teams.length && teams.length > 0 && (
          <div className="border-b border-amber-400/30 bg-amber-400/5 px-5 py-3 font-tech text-[10px] uppercase tracking-wider text-amber-300/90">
            All teams assigned — you can generate the bracket.
          </div>
        )}
      </div>

      {useProtectedSeedSection ? (
        <div className="space-y-8">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex items-center gap-2 font-display text-sm uppercase tracking-wider text-foreground/90">
                <Shield
                  className="h-3.5 w-3.5 text-muted-foreground/60"
                  strokeWidth={1.5}
                  aria-hidden
                />
                Protected seeds
              </span>
              <span className="h-px flex-1 bg-border" />
              <span className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                {protectedSeedNumbers.length} round-one bye
                {protectedSeedNumbers.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {protectedSeedNumbers.map((seed) => (
                <ProtectedSeedSlot
                  key={`protected-seed-${seed}`}
                  seed={seed}
                  team={assignments[seed - 1]}
                  teams={teams}
                  usedTeamIds={usedTeamIds}
                  disabled={disabled}
                  onTeamSelect={onTeamSelect}
                />
              ))}
            </div>
          </div>

          {openingMatches.length > 0 && (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="font-display text-sm uppercase tracking-wider text-foreground/90">
                  Round 1 matches
                </span>
                <span className="h-px flex-1 bg-border" />
                <span className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                  {openingMatches.length} opening match{openingMatches.length === 1 ? "" : "es"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {openingMatches.map((match, displayIndex) => (
                  <SeedingMatchCard
                    key={match.key}
                    matchIndex={displayIndex}
                    teamAIdx={match.teamAIdx}
                    teamBIdx={match.teamBIdx}
                    teamA={assignments[match.teamAIdx]}
                    teamB={assignments[match.teamBIdx]}
                    byeSide={match.byeSide}
                    seedLabel={match.seedLabel}
                    teams={teams}
                    usedTeamIds={usedTeamIds}
                    disabled={disabled}
                    onTeamSelect={onTeamSelect}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {standardMatches.map((match) => (
            <SeedingMatchCard
              key={match.key}
              matchIndex={match.matchIndex}
              teamAIdx={match.teamAIdx}
              teamBIdx={match.teamBIdx}
              teamA={match.byeSide === "teamA" ? null : assignments[match.teamAIdx]}
              teamB={match.byeSide === "teamB" ? null : assignments[match.teamBIdx]}
              byeSide={match.byeSide}
              seedLabel={match.seedLabel}
              teams={teams}
              usedTeamIds={usedTeamIds}
              disabled={disabled}
              onTeamSelect={onTeamSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
