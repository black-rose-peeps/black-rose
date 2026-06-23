import { useMemo } from "react";
import { Shield, Shuffle, Swords, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TournamentTeam } from "@/features/tournaments/types";
import { bracketCapacity, byeCount, isPowerOfTwo, openingPlayableMatchCount, usesCompressedPreliminaryField } from "../utils/bracket-field";
import {
  roundOnePairingsForSeedingMode,
  roundOneSeedingPairings,
} from "@/features/tournaments/utils/tournament-seeding";
import {
  protectedSeedCountOptions,
  seedingFormatDescription,
  type SeedingFormat,
} from "@/features/tournaments/utils/seeding-format";
import { CommitteeSeedList } from "./CommitteeSeedList";
import { TierSeedingPanel } from "./TierSeedingPanel";
import { SeedingTeamPicker } from "./SeedingTeamPicker";

interface SeedingPanelProps {
  teams: TournamentTeam[];
  assignments: Array<TournamentTeam | null>;
  bracketSize: number;
  seedingMatchCount: number;
  hasSwissByeSlot: boolean;
  isSwiss?: boolean;
  isDoubleElim?: boolean;
  seedingFormat?: SeedingFormat;
  protectedSeedCount?: number;
  tierByTeamId?: Record<string, "elite" | "contender" | "open" | undefined>;
  onProtectedSeedCountChange?: (count: number) => void;
  onApplyTierSeeding?: () => void;
  onRandomFillRemaining?: () => void;
  onTierChange?: (teamId: string, tier: "elite" | "contender" | "open") => void;
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
  seedingFormat = "committee",
  protectedSeedCount = 0,
  tierByTeamId = {},
  onProtectedSeedCountChange,
  onApplyTierSeeding,
  onRandomFillRemaining,
  onTierChange,
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

  const useProtectedSeedSection = isElimination && seedingFormat === "protected_random";

  const protectedSeedNumbers = useMemo(() => {
    if (!useProtectedSeedSection) return [];
    const count = Math.min(Math.max(1, protectedSeedCount), bracketSize - 1);
    return Array.from({ length: count }, (_, index) => index + 1);
  }, [bracketSize, protectedSeedCount, useProtectedSeedSection]);

  const remainingSeedNumbers = useMemo(() => {
    if (seedingFormat !== "protected_random") return [];
    const start = protectedSeedNumbers.length;
    return Array.from({ length: bracketSize - start }, (_, index) => start + index + 1);
  }, [bracketSize, protectedSeedNumbers.length, seedingFormat]);

  const playableOpeningMatches = useMemo(
    () => standardMatches.filter((match) => match.byeSide === "none"),
    [standardMatches],
  );

  const openingMatches = playableOpeningMatches;

  const formatHelp = seedingFormatDescription(
    seedingFormat,
    bracketSize,
    protectedSeedNumbers.length || protectedSeedCount,
  );

  const compressedPreliminary = isElimination && usesCompressedPreliminaryField(bracketSize);

  const readyMatches = useMemo(() => {
    if (isSwiss) {
      let ready = 0;
      for (let i = 0; i < seedingMatchCount; i++) {
        const isByeSlot = hasSwissByeSlot && i === seedingMatchCount - 1;
        const pairing = roundOnePairings[i];
        if (!pairing && !isByeSlot) continue;

        if (isByeSlot) {
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
    }

    if (useProtectedSeedSection) {
      let ready = protectedSeedNumbers.filter((seed) => assignments[seed - 1]).length;
      for (const match of openingMatches) {
        const teamA = assignments[match.teamAIdx];
        const teamB = assignments[match.teamBIdx];
        if (match.byeSide === "none") {
          if (teamA && teamB) ready++;
          else if (teamA || teamB) ready++;
        } else if (match.byeSide === "teamA") {
          if (teamB) ready++;
        } else if (teamA) {
          ready++;
        }
      }
      return ready;
    }

    let ready = 0;
    for (const pairing of roundOnePairings) {
      const teamA = pairing.seedA <= bracketSize ? assignments[pairing.seedA - 1] : null;
      const teamB = pairing.seedB <= bracketSize ? assignments[pairing.seedB - 1] : null;
      if (teamA && teamB) ready++;
      else if (teamA || teamB) ready++;
    }
    return ready;
  }, [
    assignments,
    bracketSize,
    hasSwissByeSlot,
    isSwiss,
    openingMatches,
    protectedSeedNumbers,
    roundOnePairings,
    seedingMatchCount,
    useProtectedSeedSection,
  ]);

  const showCommitteeList = isElimination && seedingFormat === "committee";

  const showTierPanel = isElimination && seedingFormat === "tier";

  const showMatchPreview =
    isSwiss ||
    seedingFormat === "random" ||
    (isElimination && seedingFormat === "tier" && assignedCount > 0) ||
    (isElimination && seedingFormat === "protected_random") ||
    (isElimination && seedingFormat === "committee" && elimByes > 0);

  const openingMatchCount = openingMatches.length;

  const totalMatchCount = isSwiss
    ? seedingMatchCount
    : useProtectedSeedSection
      ? openingMatchCount + protectedSeedNumbers.length
      : roundOnePairings.length;

  const seedingBodyDisabled = disabled || seedingFormat === "random";

  const matchesForPreview = useMemo(() => {
    if (seedingFormat === "protected_random" && elimByes === 0) return standardMatches;
    if (useProtectedSeedSection) return openingMatches;
    if (elimByes > 0 && (seedingFormat === "committee" || seedingFormat === "tier")) {
      return playableOpeningMatches;
    }
    return standardMatches;
  }, [
    elimByes,
    openingMatches,
    playableOpeningMatches,
    seedingFormat,
    standardMatches,
    useProtectedSeedSection,
  ]);

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

        {isElimination && (
          <div className="border-b border-border bg-secondary/10 px-5 py-3 font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
            {formatHelp}
            {compressedPreliminary && (
              <span className="mt-1 block text-foreground/75">
                {openingPlayableMatchCount(bracketSize)} opening upper matches on a {elimCapacity}
                -slot tree; seeds 1–{elimByes} skip to upper round two.
              </span>
            )}
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

        {isElimination && seedingFormat === "protected_random" && onProtectedSeedCountChange && (
          <div className="flex flex-wrap items-center gap-3 border-b border-border bg-secondary/10 px-5 py-3">
            <span className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
              Protected top seeds
            </span>
            <Select
              value={String(protectedSeedNumbers.length)}
              onValueChange={(value) => onProtectedSeedCountChange(Number(value))}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-28 bg-background/50 font-tech text-[10px] uppercase tracking-wider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {protectedSeedCountOptions(bracketSize).map((count) => (
                  <SelectItem key={count} value={String(count)}>
                    Top {count}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {onRandomFillRemaining && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={onRandomFillRemaining}
                className="gap-1.5 font-tech text-[10px] uppercase tracking-wider text-amber-400 hover:text-amber-300"
              >
                <Shuffle className="h-3.5 w-3.5" />
                Random fill remaining
              </Button>
            )}
          </div>
        )}

        {isElimination && seedingFormat === "random" && (
          <div className="border-b border-border bg-secondary/10 px-5 py-3 font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
            Teams are shuffled into seed slots when you click{" "}
            <span className="text-foreground">Generate Bracket</span>. Use Random seed in the
            toolbar for an early preview.
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

      {showTierPanel && onApplyTierSeeding && onTierChange && (
        <TierSeedingPanel
          teams={teams}
          tierByTeamId={tierByTeamId}
          disabled={disabled}
          onTierChange={onTierChange}
          onApply={onApplyTierSeeding}
        />
      )}

      {showCommitteeList && (
        <CommitteeSeedList
          teamCount={bracketSize}
          assignments={assignments}
          teams={teams}
          disabled={disabled}
          onTeamSelect={onTeamSelect}
        />
      )}

      {useProtectedSeedSection && (
        <div className="space-y-8">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex items-center gap-2 font-display text-sm uppercase tracking-wider text-foreground/90">
                <Shield
                  className="h-3.5 w-3.5 text-muted-foreground/60"
                  strokeWidth={1.5}
                  aria-hidden
                />
                {seedingFormat === "protected_random" ? "Protected top seeds" : "Protected seeds"}
              </span>
              <span className="h-px flex-1 bg-border" />
              <span className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                {seedingFormat === "protected_random"
                  ? `Seeds 1–${protectedSeedNumbers.length}`
                  : `${protectedSeedNumbers.length} round-one bye${protectedSeedNumbers.length === 1 ? "" : "s"}`}
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

          {seedingFormat === "protected_random" && remainingSeedNumbers.length > 0 && (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="font-display text-sm uppercase tracking-wider text-foreground/90">
                  Remaining seeds
                </span>
                <span className="h-px flex-1 bg-border" />
                <span className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                  Seeds {remainingSeedNumbers[0]}–
                  {remainingSeedNumbers[remainingSeedNumbers.length - 1]}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {remainingSeedNumbers.map((seed) => (
                  <div
                    key={`remaining-seed-${seed}`}
                    className={cn(
                      "border bg-card p-4 transition-colors",
                      assignments[seed - 1] ? "border-amber-400/30" : "border-border",
                    )}
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                        Random slot
                      </span>
                      <span className="font-display text-xs tracking-wider text-muted-foreground/80">
                        Seed {seed}
                      </span>
                    </div>
                    <SeedingTeamPicker
                      label=""
                      seed={seed}
                      value={assignments[seed - 1]}
                      teams={teams}
                      usedTeamIds={usedTeamIds}
                      onChange={(teamId) => onTeamSelect(seed - 1, teamId)}
                      disabled={seedingBodyDisabled}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {showMatchPreview && matchesForPreview.length > 0 && (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="font-display text-sm uppercase tracking-wider text-foreground/90">
                  Round 1 preview
                </span>
                <span className="h-px flex-1 bg-border" />
                <span className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                  {matchesForPreview.length} match{matchesForPreview.length === 1 ? "" : "es"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {matchesForPreview.map((match, displayIndex) => (
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
                    disabled={seedingBodyDisabled}
                    onTeamSelect={onTeamSelect}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showMatchPreview && !useProtectedSeedSection && (
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
              disabled={seedingBodyDisabled}
              onTeamSelect={onTeamSelect}
            />
          ))}
        </div>
      )}

      {showTierPanel && assignedCount > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-display text-sm uppercase tracking-wider text-foreground/90">
              Seed order preview
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <CommitteeSeedList
            teamCount={bracketSize}
            assignments={assignments}
            teams={teams}
            disabled
            onTeamSelect={onTeamSelect}
          />
        </div>
      )}
    </div>
  );
}
