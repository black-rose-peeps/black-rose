import { useMemo } from "react";
import { Swords, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TournamentTeam } from "@/features/tournaments/types";
import { isPowerOfTwo } from "../utils/bracket-field";
import {
  firstRoundSeedPairings,
  formatSeedLabel,
  playInSeedPairings,
  projectedUpperRoundOnePairings,
} from "@/features/tournaments/utils/tournament-seeding";
import { SeedingTeamPicker } from "./SeedingTeamPicker";

interface SeedingPanelProps {
  teams: TournamentTeam[];
  assignments: Array<TournamentTeam | null>;
  bracketSize: number;
  seedingMatchCount: number;
  hasSwissByeSlot: boolean;
  /** Double-elim play-in: teams that start directly in upper bracket. */
  directSeedCount?: number;
  /** Double-elim play-in: opening play-in match count. */
  playInMatchCount?: number;
  disabled?: boolean;
  onTeamSelect: (slotIdx: number, teamId: string | null) => void;
}

function SeedingMatchCard({
  matchIndex,
  teamAIdx,
  teamBIdx,
  teamA,
  teamB,
  isByeSlot,
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
  isByeSlot: boolean;
  seedLabel?: string;
  teams: TournamentTeam[];
  usedTeamIds: Set<string>;
  disabled?: boolean;
  onTeamSelect: (slotIdx: number, teamId: string | null) => void;
}) {
  const isComplete = isByeSlot ? !!teamA : teamA && teamB;

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
            "font-tech text-[10px] uppercase tracking-wider",
            isComplete ? "text-amber-300/80" : "text-muted-foreground",
          )}
        >
          {seedLabel ??
            (isByeSlot
              ? `Seed ${teamAIdx + 1} — BYE`
              : `Seeds ${teamAIdx + 1} – ${teamBIdx + 1}`)}
        </span>
      </div>

      <div
        className={cn(
          "relative p-4",
          isByeSlot ? "space-y-3" : "grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end",
        )}
      >
        <SeedingTeamPicker
          label="Team A"
          seed={teamAIdx + 1}
          value={teamA}
          teams={teams}
          usedTeamIds={usedTeamIds}
          onChange={(teamId) => onTeamSelect(teamAIdx, teamId)}
          disabled={disabled}
        />

        {isByeSlot ? (
          <div className="flex items-center justify-center border border-amber-400/20 bg-amber-400/5 py-3 font-display text-xs font-bold uppercase tracking-widest text-amber-400/80">
            Bye — advances without opponent
          </div>
        ) : (
          <>
            <div className="place-self-center py-1 font-display text-lg tracking-wider text-muted-foreground/40 md:pb-2">
              vs
            </div>
            <SeedingTeamPicker
              label="Team B"
              seed={teamBIdx + 1}
              value={teamB}
              teams={teams}
              usedTeamIds={usedTeamIds}
              onChange={(teamId) => onTeamSelect(teamBIdx, teamId)}
              disabled={disabled}
            />
          </>
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
  return (
    <div className="border border-border bg-card p-4">
      <SeedingTeamPicker
        label={`Protected seed`}
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

function UpperRoundOnePreviewCard({
  matchIndex,
  seedA,
  seedB,
  playInMatchIndexA,
  playInMatchIndexB,
  assignments,
}: {
  matchIndex: number;
  seedA: number | "play-in";
  seedB: number | "play-in";
  playInMatchIndexA?: number;
  playInMatchIndexB?: number;
  assignments: Array<TournamentTeam | null>;
}) {
  const nameFor = (seed: number | "play-in", playInIdx?: number) => {
    if (seed === "play-in") return formatSeedLabel(seed, playInIdx);
    return assignments[seed - 1]?.name ?? formatSeedLabel(seed);
  };

  return (
    <div className="border border-border/70 bg-secondary/10 px-4 py-3">
      <p className="mb-2 font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
        Upper R1 · Match {matchIndex + 1}
      </p>
      <p className="font-display text-sm tracking-wider text-foreground/90">
        {nameFor(seedA, playInMatchIndexA)}
        <span className="mx-2 text-muted-foreground/50">vs</span>
        {nameFor(seedB, playInMatchIndexB)}
      </p>
    </div>
  );
}

export function SeedingPanel({
  teams,
  assignments,
  bracketSize,
  seedingMatchCount,
  hasSwissByeSlot,
  directSeedCount = 0,
  playInMatchCount = 0,
  disabled = false,
  onTeamSelect,
}: SeedingPanelProps) {
  const hasPlayInSeeding = playInMatchCount > 0 && directSeedCount > 0;

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

  const playInMatches = useMemo(
    () =>
      hasPlayInSeeding
        ? playInSeedPairings(bracketSize).map((pairing, index) => ({
            key: `playin-${index}`,
            matchIndex: index,
            teamAIdx: pairing.seedA - 1,
            teamBIdx: pairing.seedB - 1,
            seedLabel: `Seeds ${pairing.seedA} – ${pairing.seedB}`,
          }))
        : [],
    [bracketSize, hasPlayInSeeding],
  );

  const upperPreview = useMemo(
    () => (hasPlayInSeeding ? projectedUpperRoundOnePairings(bracketSize) : []),
    [bracketSize, hasPlayInSeeding],
  );

  const readyMatches = useMemo(() => {
    if (hasPlayInSeeding) {
      let ready = 0;
      for (let seed = 1; seed <= directSeedCount; seed++) {
        if (assignments[seed - 1]) ready++;
      }
      for (const match of playInMatches) {
        if (assignments[match.teamAIdx] && assignments[match.teamBIdx]) ready++;
      }
      return ready;
    }

    let ready = 0;
    for (let i = 0; i < seedingMatchCount; i++) {
      const isByeSlot = hasSwissByeSlot && i === seedingMatchCount - 1;
      const pairing = firstRoundSeedPairings(bracketSize)[i];
      const teamAIdx = isByeSlot ? bracketSize - 1 : pairing.seedA - 1;
      const teamBIdx = pairing.seedB - 1;
      const teamA = assignments[teamAIdx];
      const teamB = isByeSlot ? null : assignments[teamBIdx];
      if (isByeSlot ? teamA : teamA && teamB) ready++;
    }
    return ready;
  }, [
    assignments,
    bracketSize,
    directSeedCount,
    hasPlayInSeeding,
    hasSwissByeSlot,
    playInMatches,
    seedingMatchCount,
  ]);

  const totalMatchCount = hasPlayInSeeding
    ? directSeedCount + playInMatchCount
    : seedingMatchCount;

  const standardMatches = hasPlayInSeeding
    ? []
    : firstRoundSeedPairings(bracketSize).map((pairing, index) => {
        const isByeSlot = hasSwissByeSlot && index === seedingMatchCount - 1;
        return {
          key: `match-${index}`,
          matchIndex: index,
          teamAIdx: isByeSlot ? bracketSize - 1 : pairing.seedA - 1,
          teamBIdx: pairing.seedB - 1,
          isByeSlot,
          seedLabel: isByeSlot
            ? `Seed ${pairing.seedA} — BYE`
            : `Seeds ${pairing.seedA} – ${pairing.seedB}`,
        };
      });

  return (
    <div className="border-b border-border p-8">
      <div className="mb-6 overflow-hidden border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
                Traditional seeding
              </p>
              <h3 className="mt-1 font-display text-lg tracking-wider">Seed assignments</h3>
            </div>
            <div className="flex flex-wrap gap-2">
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

        {hasPlayInSeeding && (
          <div className="border-b border-border bg-secondary/10 px-5 py-3 font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
            Seeds 1–{directSeedCount} skip opening play-in and enter upper bracket with protection.
            Seeds {directSeedCount + 1}–{bracketSize} play in traditional high-vs-low play-in pairings;
            winners join upper round 1 at the correct bracket positions.
          </div>
        )}

        {!hasPlayInSeeding && isPowerOfTwo(bracketSize) && (
          <div className="border-b border-border bg-secondary/10 px-5 py-3 font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
            Round 1 uses standard bracket seeding (1 vs {bracketSize}, 2 vs {bracketSize - 1}, …).
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

      {hasPlayInSeeding ? (
        <div className="space-y-8">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="font-display text-sm uppercase tracking-wider text-foreground/90">
                Protected seeds — upper bracket
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: directSeedCount }, (_, index) => (
                <ProtectedSeedSlot
                  key={`protected-${index + 1}`}
                  seed={index + 1}
                  team={assignments[index]}
                  teams={teams}
                  usedTeamIds={usedTeamIds}
                  disabled={disabled}
                  onTeamSelect={onTeamSelect}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="font-display text-sm uppercase tracking-wider text-foreground/90">
                Opening — play-in
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {playInMatches.map((match) => (
                <SeedingMatchCard
                  key={match.key}
                  matchIndex={match.matchIndex}
                  teamAIdx={match.teamAIdx}
                  teamBIdx={match.teamBIdx}
                  teamA={assignments[match.teamAIdx]}
                  teamB={assignments[match.teamBIdx]}
                  isByeSlot={false}
                  seedLabel={match.seedLabel}
                  teams={teams}
                  usedTeamIds={usedTeamIds}
                  disabled={disabled}
                  onTeamSelect={onTeamSelect}
                />
              ))}
            </div>
          </div>

          {upperPreview.length > 0 && (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="font-display text-sm uppercase tracking-wider text-foreground/90">
                  Upper bracket round 1 preview
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {upperPreview.map((preview) => (
                  <UpperRoundOnePreviewCard
                    key={`ub-preview-${preview.matchIndex}`}
                    matchIndex={preview.matchIndex}
                    seedA={preview.seedA}
                    seedB={preview.seedB}
                    playInMatchIndexA={preview.playInMatchIndexA}
                    playInMatchIndexB={preview.playInMatchIndexB}
                    assignments={assignments}
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
              teamA={assignments[match.teamAIdx]}
              teamB={match.isByeSlot ? null : assignments[match.teamBIdx]}
              isByeSlot={match.isByeSlot}
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
