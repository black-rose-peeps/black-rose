import { useState, useMemo, useEffect, useCallback } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BracketEngine } from "../types/bracket-engine";
import type { BracketStatus } from "../../../types";
import { EliminationResultsBoard } from "@/features/tournaments/components/EliminationResultsBoard";
import type { BracketRound, PrizeTier, TournamentTeam } from "@/features/tournaments/types";
import {
  buildPodiumPlacements,
  deriveManagedPlacements,
} from "@/features/tournaments/utils/tournament-placements";
import {
  isDoubleEliminationFormat,
  isSingleEliminationFormat,
  isSwissFormat,
} from "@/features/tournaments/constants/formats";
import { isTournamentConcluded } from "@/features/tournaments/utils/tournament-status";
import { BracketActionDialog } from "./BracketActionDialog";
import { BracketManagerHeader } from "./BracketManagerHeader";
import { BracketManagerSubTabs } from "./BracketManagerSubTabs";
import { ManagedBracketView } from "./ManagedBracketView";
import { PlayoffPairingDialog } from "./PlayoffPairingDialog";
import { SeedingPanel } from "./SeedingPanel";
import { SeedingFormatOption } from "./SeedingFormatOption";
import { ThirdPlaceMatchOption } from "./ThirdPlaceMatchOption";
import { GrandFinalOption } from "./GrandFinalOption";
import { SwissBracketView } from "./SwissBracketView";
import type {
  BestOfFormat,
  BracketRoundMeta,
  ManagedMatch,
  PlayoffRound1Pairing,
} from "../utils/managed-bracket";
import { applyGlobalMatchLabels } from "@/features/tournaments/utils/bracket-global-match-labels";
import { applyOpeningRoundMatchLabels } from "../utils/managed-bracket-build-helpers";
import {
  buildDoubleElimMatches,
  buildSingleElimMatches,
  applyBracketProgression,
  canIncludeSingleElimThirdPlace,
  clearMatchResult,
  defaultRoundFormats,
  reapplyFormatToRound,
  setMatchWinner,
  updateMatchScores,
  winsRequired,
} from "../utils/managed-bracket";
import { buildRecommendedRoundFormats } from "./RoundFormatPanel";
import {
  applySwissMatchUpdates,
  buildSwissRound1,
  canStartSwissPlayoffs,
  catchUpSwissRounds,
  clearSwissMatchResult,
  formatSwissPoolLabel,
  getQualifiedTeams,
  getSwissPhase,
  recomputeSwissStateFromMatches,
  startSwissPlayoffs,
  updateSwissMatchScores,
  type SwissBracketState,
} from "../utils/managed-swiss-bracket";
import {
  byeCount,
  eliminationRoundCount,
  isEvenBracketFieldSize,
  orderedTeamNamesFromAssignments,
} from "../utils/bracket-field";
import { assignmentsFromBracketMatches } from "@/features/tournaments/utils/tournament-seeding";
import { buildSeedByTeam } from "@/features/tournaments/utils/swiss-tiebreaks";
import { isOpeningPlayInRound } from "@/features/tournaments/utils/bracket-display";
import { buildMatchSlotHints } from "@/features/tournaments/utils/bracket-slot-hints";
import { publishBracket, clearPublishedBracket, syncLocalBracket } from "@/lib/bracket-store";
import { fetchBracketState, saveDraftBracket } from "../services/bracket.service";
import type { PersistedBracketPayload } from "../services/bracket.service";
import { updateTournamentStatus } from "@/features/admin/features/tournaments/services/tournaments.service";
import {
  DEFAULT_GRAND_FINAL_MODE,
  resolveStoredGrandFinalMode,
  type GrandFinalMode,
} from "@/features/admin/features/tournament-details/utils/grand-final";
import {
  buildProtectedRandomAssignments,
  buildRandomSeedingAssignments,
  buildRegistrationOrderAssignments,
  buildTierSeedingAssignments,
  defaultProtectedSeedCount,
  DEFAULT_SEEDING_FORMAT,
  resolveSeedingAssignments,
  validateSeedingReadiness,
  type SeedingFormat,
  type SeedingTier,
} from "@/features/tournaments/utils/seeding-format";
import type { MockTournament } from "@/lib/mock-data";
import { FeatureEmptyState } from "@/features/shared/components/FeaturePanelShell";

/** Convert admin ManagedMatch[] + roundMetas into the public BracketRound[] shape. */
function relabelEliminationMatches(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
  format: string,
  teamCount: number,
): void {
  if (isSwissFormat(format)) return;
  applyOpeningRoundMatchLabels(matches, roundMetas, teamCount);
  if (isDoubleEliminationFormat(format)) {
    applyGlobalMatchLabels(matches, roundMetas, "double");
    return;
  }
  if (isSingleEliminationFormat(format)) {
    applyGlobalMatchLabels(matches, roundMetas, "single");
  }
}

function managedMatchesToPublicRounds(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
  swiss?: SwissBracketState,
): BracketRound[] {
  const slotHints = buildMatchSlotHints(matches, roundMetas);

  return roundMetas.map((meta) => {
    const roundNumber = meta.id.startsWith("sw-r")
      ? Number.parseInt(meta.id.slice(4), 10)
      : Number.NaN;
    const swissByes =
      meta.side === "swiss" && !Number.isNaN(roundNumber)
        ? swiss?.byesByRound?.[String(roundNumber)]
        : undefined;

    return {
      id: meta.id,
      label: meta.label,
      swissByes: swissByes?.length ? swissByes : undefined,
      matches: meta.matchIds
        .map((id) => matches.find((m) => m.id === id))
        .filter((m): m is ManagedMatch => !!m)
        .map((m) => {
          const hints = slotHints.get(m.id);
          return {
            id: m.id,
            label: m.label,
            round: m.swissPool
              ? `${m.roundLabel} · ${formatSwissPoolLabel(m.swissPool)}`
              : m.roundLabel,
            teamA: m.teamA,
            teamB: m.teamB,
            scoreA: m.scoreA,
            scoreB: m.scoreB,
            winner: m.winner ?? undefined,
            winnerAdvancesTo: m.winnerNext?.matchId,
            loserAdvancesTo: m.loserNext?.matchId,
            teamAHint: hints?.teamA,
            teamBHint: hints?.teamB,
          };
        }),
    };
  });
}

function buildPersistedPayload(
  managedMatches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
  roundFormats: Record<string, BestOfFormat>,
  assignments: Array<TournamentTeam | null>,
  options: {
    format: string;
    prizeBreakdown?: PrizeTier[];
    swiss?: SwissBracketState;
    teamNames: string[];
    includeThirdPlaceMatch?: boolean;
    grandFinalMode?: GrandFinalMode;
    seedingFormat?: SeedingFormat;
    teamTiers?: Record<string, SeedingTier | undefined>;
    protectedSeedCount?: number;
  },
): PersistedBracketPayload {
  const placements = buildPodiumPlacements(
    options.prizeBreakdown ?? [],
    deriveManagedPlacements(
      options.format,
      managedMatches,
      options.swiss,
      options.teamNames,
      options.grandFinalMode,
    ),
  );

  return {
    rounds: managedMatchesToPublicRounds(managedMatches, roundMetas, options.swiss),
    prizeBreakdown: options.prizeBreakdown,
    placements,
    admin: {
      managedMatches,
      roundMetas,
      roundFormats,
      assignmentTeamIds: assignments.map((t) => t?.id ?? null),
      swiss: options.swiss,
      includeThirdPlaceMatch: options.includeThirdPlaceMatch,
      grandFinalMode: options.grandFinalMode,
      seedingFormat: options.seedingFormat,
      teamTiers: options.teamTiers,
      protectedSeedCount: options.protectedSeedCount,
    },
  };
}

function buildManagedState(
  teamNames: string[],
  format: string,
  includeThirdPlaceMatch = false,
  grandFinalMode: GrandFinalMode = DEFAULT_GRAND_FINAL_MODE,
) {
  if (isSwissFormat(format)) {
    const built = buildSwissRound1(teamNames);
    return {
      matches: built.matches,
      roundMetas: built.roundMetas,
      roundFormats: defaultRoundFormats(built.roundMetas),
      swiss: built.swiss,
    };
  }
  const built = isDoubleEliminationFormat(format)
    ? buildDoubleElimMatches(teamNames, { grandFinalMode })
    : buildSingleElimMatches(teamNames, { includeThirdPlaceMatch });
  return {
    matches: built.matches,
    roundMetas: built.roundMetas,
    roundFormats: defaultRoundFormats(built.roundMetas),
    swiss: undefined as SwissBracketState | undefined,
  };
}

interface BracketManagerProps {
  tournamentId: string;
  tournamentName: string;
  game: string;
  region: string;
  startDate: string;
  format: string;
  teamCap: number;
  teams: TournamentTeam[];
  initialBracket?: BracketRound[] | null;
  tournamentStatus: MockTournament["status"];
  prizeBreakdown?: PrizeTier[];
  onTournamentStatusChange?: (status: MockTournament["status"]) => void;
}

function deriveBracketState(
  initialBracket: BracketRound[] | null | undefined,
  teams: TournamentTeam[],
  bracketSize: number,
  format: string,
): {
  assignments: Array<TournamentTeam | null>;
  status: BracketStatus;
  bracketGenerated: boolean;
  bracketLocked: boolean;
} {
  const rounds = initialBracket ?? [];
  const assignments: Array<TournamentTeam | null> = Array(bracketSize).fill(null);
  const findTeam = (name: string | null | undefined) =>
    name ? (teams.find((t) => t.name === name) ?? null) : null;

  const firstRound =
    rounds.find((round) => round.id === "ub-r1" || round.id === "se-r0") ??
    rounds.find((round) => !isOpeningPlayInRound(round.label)) ??
    rounds[0];

  const hydrated = assignmentsFromBracketMatches(
    bracketSize,
    {
      upperRoundOne: firstRound?.matches,
      firstRoundMatches: firstRound?.matches,
    },
    findTeam,
  );
  for (let i = 0; i < bracketSize; i++) {
    assignments[i] = hydrated[i];
  }

  const assignedCount = assignments.filter(Boolean).length;
  const hasInitialBracket = rounds.length > 0 && assignedCount > 0;

  return {
    assignments,
    status: hasInitialBracket ? "draft" : "not_generated",
    bracketGenerated: hasInitialBracket,
    bracketLocked: false,
  };
}

export function BracketManager({
  tournamentId,
  tournamentName,
  game,
  region,
  startDate,
  format,
  teamCap,
  teams,
  initialBracket,
  tournamentStatus,
  prizeBreakdown = [],
  onTournamentStatusChange,
}: BracketManagerProps) {
  const fieldSize = teams.length;

  const bracketEngine = useMemo(() => {
    const teamNames = teams.map((t) => t.name);
    return new BracketEngine(teamNames, Math.max(fieldSize, 2));
  }, [teams, fieldSize]);

  const isSwiss = isSwissFormat(format);
  const isDoubleElim = isDoubleEliminationFormat(format);
  const isSingleElim = isSingleEliminationFormat(format);
  const bracketSize = fieldSize;
  const canIncludeThirdPlaceMatch = isSingleElim && canIncludeSingleElimThirdPlace(bracketSize);
  const firstRoundMatches = Math.floor(bracketSize / 2);
  const hasSwissByeSlot = isSwiss && bracketSize % 2 === 1;
  const seedingMatchCount = hasSwissByeSlot ? firstRoundMatches + 1 : firstRoundMatches;
  const totalRounds = isSwiss ? 5 : eliminationRoundCount(Math.max(fieldSize, 2));

  const [status, setStatus] = useState<BracketStatus>("not_generated");
  const [activeTab, setActiveTab] = useState<"seeding" | "bracket" | "validation">("seeding");
  const [bracketGenerated, setBracketGenerated] = useState(false);
  const [bracketLocked, setBracketLocked] = useState(false);
  const [managedMatches, setManagedMatches] = useState<ManagedMatch[]>([]);
  const [roundMetas, setRoundMetas] = useState<BracketRoundMeta[]>([]);
  const [roundFormats, setRoundFormats] = useState<Record<string, BestOfFormat>>({});
  const [assignments, setAssignments] = useState<Array<TournamentTeam | null>>(() =>
    Array(bracketSize).fill(null),
  );
  const [includeThirdPlaceMatch, setIncludeThirdPlaceMatch] = useState(false);
  const [grandFinalMode, setGrandFinalMode] = useState<GrandFinalMode>(DEFAULT_GRAND_FINAL_MODE);
  const [seedingFormat, setSeedingFormat] = useState<SeedingFormat>(DEFAULT_SEEDING_FORMAT);
  const [teamTiers, setTeamTiers] = useState<Record<string, SeedingTier | undefined>>({});
  const [protectedSeedCount, setProtectedSeedCount] = useState(() =>
    defaultProtectedSeedCount(bracketSize),
  );

  useEffect(() => {
    setProtectedSeedCount(defaultProtectedSeedCount(bracketSize));
  }, [bracketSize]);

  useEffect(() => {
    const teamIdSet = new Set(teams.map((team) => team.id));
    setAssignments((prev) => {
      const next = Array(bracketSize).fill(null) as Array<TournamentTeam | null>;
      let slot = 0;
      for (const assigned of prev) {
        if (!assigned || !teamIdSet.has(assigned.id)) continue;
        if (slot >= bracketSize) break;
        next[slot++] = assigned;
      }
      return next;
    });
  }, [bracketSize, teams]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadedFromDb, setLoadedFromDb] = useState(false);
  const [swissState, setSwissState] = useState<SwissBracketState | null>(null);
  const [playoffDialogOpen, setPlayoffDialogOpen] = useState(false);
  const [bracketDialog, setBracketDialog] = useState<
    | {
        kind: "confirm";
        title: string;
        description: string;
        confirmLabel: string;
        destructive?: boolean;
        onConfirm: () => void;
      }
    | { kind: "info"; title: string; description: string }
    | null
  >(null);

  const seedingLocked = bracketLocked;
  const isPublished = status === "published";
  const resultsLocked = isTournamentConcluded(tournamentStatus);
  const hasBracketProgress = useMemo(
    () => managedMatches.some((match) => match.confirmed || match.winner !== null),
    [managedMatches],
  );
  const seedingDisabled = seedingLocked || resultsLocked;
  const seedingShuffleDisabled = seedingDisabled || (bracketGenerated && hasBracketProgress);
  const isTournamentCompleted = tournamentStatus === "Completed";
  const teamNames = useMemo(() => teams.map((team) => team.name), [teams]);
  const adminSeedingOptions = useMemo(
    () =>
      isSwiss
        ? {}
        : {
            seedingFormat,
            teamTiers,
            protectedSeedCount,
          },
    [isSwiss, seedingFormat, teamTiers, protectedSeedCount],
  );
  const persistDraftSnapshot = useCallback(
    (
      matches: ManagedMatch[],
      metas: BracketRoundMeta[],
      formats: Record<string, BestOfFormat>,
      currentAssignments: Array<TournamentTeam | null>,
      swiss: SwissBracketState | null | undefined,
      locked: boolean,
    ) => {
      const payload = buildPersistedPayload(matches, metas, formats, currentAssignments, {
        format,
        prizeBreakdown,
        swiss: swiss ?? undefined,
        teamNames: orderedTeamNamesFromAssignments(currentAssignments, bracketSize),
        includeThirdPlaceMatch: canIncludeThirdPlaceMatch ? includeThirdPlaceMatch : undefined,
        grandFinalMode: isDoubleElim ? grandFinalMode : undefined,
        ...adminSeedingOptions,
      });
      void saveDraftBracket(tournamentId, payload, locked).catch((err) => {
        console.error("[BracketManager] Draft bracket save failed:", err);
      });
    },
    [
      tournamentId,
      format,
      prizeBreakdown,
      bracketSize,
      canIncludeThirdPlaceMatch,
      includeThirdPlaceMatch,
      isDoubleElim,
      grandFinalMode,
      adminSeedingOptions,
    ],
  );
  const seedByTeam = useMemo(() => buildSeedByTeam(teamNames, teams), [teamNames, teams]);
  const currentPlacements = useMemo(
    () =>
      buildPodiumPlacements(
        prizeBreakdown,
        deriveManagedPlacements(
          format,
          managedMatches,
          swissState,
          teamNames,
          isDoubleElim ? grandFinalMode : undefined,
        ),
      ),
    [format, managedMatches, swissState, teamNames, prizeBreakdown, isDoubleElim, grandFinalMode],
  );

  // Restore published bracket from Supabase (survives refresh; shared with public).
  useEffect(() => {
    let cancelled = false;

    fetchBracketState(tournamentId)
      .then((state) => {
        if (cancelled) return;
        if (
          state?.payload?.admin?.managedMatches?.length &&
          (state.status === "published" || state.status === "draft")
        ) {
          const admin = state.payload.admin;
          const isPublishedRestore = state.status === "published";
          const teamNames = teams.map((team) => team.name);
          let restoredMatches = admin.managedMatches;
          let restoredMetas = admin.roundMetas;
          let restoredSwiss =
            admin.swiss ??
            (isSwissFormat(format)
              ? recomputeSwissStateFromMatches(admin.managedMatches, teamNames)
              : null);

          if (isSwissFormat(format) && restoredSwiss) {
            if (restoredMetas.some((meta) => meta.side === "playoff")) {
              restoredSwiss = {
                ...restoredSwiss,
                phase: restoredSwiss.phase ?? "playoffs",
                playoffsSeededTeams:
                  restoredSwiss.playoffsSeededTeams ??
                  getQualifiedTeams(teamNames, restoredSwiss, restoredMatches, seedByTeam),
                groupStageRecords: restoredSwiss.groupStageRecords ?? { ...restoredSwiss.records },
              };
            }

            const caught = catchUpSwissRounds(
              restoredMatches,
              restoredMetas,
              restoredSwiss,
              teamNames,
            );
            restoredMatches = caught.matches;
            restoredMetas = caught.roundMetas;
            restoredSwiss = caught.swiss;
          }

          const mergedFormats = { ...defaultRoundFormats(restoredMetas), ...admin.roundFormats };

          if (!isSwissFormat(format)) {
            const savedFieldSize = Math.max(admin.assignmentTeamIds.length, teams.length);
            relabelEliminationMatches(restoredMatches, restoredMetas, format, savedFieldSize);
          }

          setManagedMatches(restoredMatches);
          setRoundMetas(restoredMetas);
          setRoundFormats(mergedFormats);
          setSwissState(restoredSwiss);

          if (
            isSwissFormat(format) &&
            restoredSwiss &&
            (restoredMatches.length !== admin.managedMatches.length ||
              restoredMetas.length !== admin.roundMetas.length)
          ) {
            const payload = buildPersistedPayload(
              restoredMatches,
              restoredMetas,
              mergedFormats,
              admin.assignmentTeamIds.map((id) =>
                id ? (teams.find((t) => t.id === id) ?? null) : null,
              ),
              {
                format,
                prizeBreakdown,
                swiss: restoredSwiss,
                teamNames,
                includeThirdPlaceMatch:
                  admin.includeThirdPlaceMatch ??
                  admin.roundMetas.some((meta) => meta.id === "se-3rd"),
                grandFinalMode: resolveStoredGrandFinalMode(
                  admin.roundMetas.map((meta) => meta.id),
                  admin.grandFinalMode,
                ),
                seedingFormat: admin.seedingFormat,
                teamTiers: admin.teamTiers,
                protectedSeedCount: admin.protectedSeedCount,
              },
            );
            void publishBracket(tournamentId, payload).catch((err) => {
              console.error("[BracketManager] Swiss catch-up sync failed:", err);
            });
            syncLocalBracket(tournamentId, payload.rounds);
          }

          setAssignments(
            admin.assignmentTeamIds.map((id) =>
              id ? (teams.find((t) => t.id === id) ?? null) : null,
            ),
          );
          setIncludeThirdPlaceMatch(
            admin.includeThirdPlaceMatch ?? admin.roundMetas.some((meta) => meta.id === "se-3rd"),
          );
          setGrandFinalMode(
            resolveStoredGrandFinalMode(
              admin.roundMetas.map((meta) => meta.id),
              admin.grandFinalMode,
            ),
          );
          setSeedingFormat(admin.seedingFormat ?? DEFAULT_SEEDING_FORMAT);
          setTeamTiers(admin.teamTiers ?? {});
          setProtectedSeedCount(
            admin.protectedSeedCount ?? defaultProtectedSeedCount(bracketSize),
          );
          setBracketGenerated(true);
          setBracketLocked(isPublishedRestore || state.seedingLocked);
          setStatus(isPublishedRestore ? "published" : "draft");
          if (isPublishedRestore) {
            syncLocalBracket(tournamentId, state.payload.rounds);
          }
        }
      })
      .catch((err) => {
        console.error("[BracketManager] Failed to load bracket state:", err);
      })
      .finally(() => {
        if (!cancelled) setLoadedFromDb(true);
      });

    return () => {
      cancelled = true;
    };
  }, [tournamentId, teams]);

  // Hydrate from mock/static initialBracket only — never wipe a bracket the admin
  // just generated locally (Supabase tournaments have empty initialBracket).
  useEffect(() => {
    if (!loadedFromDb || status === "published") return;
    if (bracketGenerated && managedMatches.length > 0) return;

    const derived = deriveBracketState(initialBracket, teams, bracketSize, format);
    setStatus(derived.status);
    setAssignments(derived.assignments);
    setBracketGenerated(derived.bracketGenerated);
    setBracketLocked(derived.bracketLocked);

    bracketEngine.reset();
    if (derived.bracketGenerated) {
      const teamNames = orderedTeamNamesFromAssignments(derived.assignments, bracketSize);
      if (teamNames.length > 0) {
        bracketEngine.autoSeed(teamNames);
        const managed = buildManagedState(
          teamNames,
          format,
          includeThirdPlaceMatch,
          grandFinalMode,
        );
        setManagedMatches(managed.matches);
        setRoundMetas(managed.roundMetas);
        setRoundFormats(managed.roundFormats);
        setSwissState(managed.swiss ?? null);
      }
    } else {
      setManagedMatches([]);
      setRoundMetas([]);
      setRoundFormats({});
      setSwissState(null);
    }
  }, [
    initialBracket,
    teams,
    bracketSize,
    bracketEngine,
    format,
    isDoubleElim,
    loadedFromDb,
    status,
    bracketGenerated,
    managedMatches.length,
    includeThirdPlaceMatch,
    grandFinalMode,
  ]);

  const directSeeds =
    !isSwiss && isEvenBracketFieldSize(bracketSize) ? byeCount(bracketSize) : undefined;

  const validation = bracketEngine.validateBracketIntegrity();
  const assignedCount = assignments.slice(0, bracketSize).filter(Boolean).length;
  const parityOk = teams.length % 2 === 0 || (isSwiss && hasSwissByeSlot);
  const allAssigned = teams.length >= 2 && parityOk && assignedCount === teams.length;

  const seedingInput = useMemo(
    () => ({
      format: seedingFormat,
      teams,
      assignments,
      tierByTeamId: teamTiers,
      protectedSeedCount,
    }),
    [seedingFormat, teams, assignments, teamTiers, protectedSeedCount],
  );

  const seedingReadiness = useMemo(() => {
    if (isSwiss) {
      return allAssigned
        ? { ready: true, title: "", description: "" }
        : {
            ready: false,
            title: "Seeding incomplete",
            description: `Assign all ${teams.length} registered teams in the seeding panel before generating the bracket.`,
          };
    }
    return validateSeedingReadiness(seedingInput);
  }, [allAssigned, isSwiss, seedingInput, teams.length]);

  const canGenerateBracket = parityOk && teams.length >= 2 && seedingReadiness.ready;
  const managedBracketReady = managedMatches.length > 0 && roundMetas.length > 0;
  const canPublish =
    status === "draft" &&
    bracketGenerated &&
    allAssigned &&
    (isSwiss || managedBracketReady || validation.canPublish);

  function handleGenerate() {
    if (resultsLocked) return;
    if (!canGenerateBracket) {
      setBracketDialog({
        kind: "info",
        title: seedingReadiness.title || "Seeding incomplete",
        description:
          seedingReadiness.description ||
          `Complete seeding requirements before generating the bracket.`,
      });
      setActiveTab("seeding");
      return;
    }

    const resolvedAssignments = isSwiss
      ? assignments.slice(0, bracketSize)
      : resolveSeedingAssignments(seedingInput);

    setAssignments(resolvedAssignments);

    const teamNames = orderedTeamNamesFromAssignments(resolvedAssignments, bracketSize);
    bracketEngine.autoSeed(teamNames);

    const managed = buildManagedState(
      teamNames,
      format,
      includeThirdPlaceMatch,
      grandFinalMode,
    );
    setManagedMatches(managed.matches);
    setRoundMetas(managed.roundMetas);
    setRoundFormats(managed.roundFormats);
    setSwissState(managed.swiss ?? null);
    setBracketGenerated(true);
    setStatus("draft");
    setActiveTab("bracket");
    persistDraftSnapshot(
      managed.matches,
      managed.roundMetas,
      managed.roundFormats,
      resolvedAssignments,
      managed.swiss ?? null,
      false,
    );
  }

  function syncBracketToSeeding(nextAssignments: Array<TournamentTeam | null>) {
    setAssignments(nextAssignments);

    if (!bracketGenerated) return;

    const assignedTeams = nextAssignments.filter(Boolean) as TournamentTeam[];
    if (assignedTeams.length !== teams.length) return;

    const names = orderedTeamNamesFromAssignments(nextAssignments, bracketSize);
    bracketEngine.autoSeed(names);
    const managed = buildManagedState(names, format, includeThirdPlaceMatch, grandFinalMode);
    setManagedMatches(managed.matches);
    setRoundMetas(managed.roundMetas);
    setRoundFormats(managed.roundFormats);
    setSwissState(managed.swiss ?? null);
    setBracketGenerated(true);
    setStatus("draft");
    persistDraftSnapshot(
      managed.matches,
      managed.roundMetas,
      managed.roundFormats,
      nextAssignments,
      managed.swiss ?? null,
      false,
    );
  }

  function handleAutoSeed() {
    if (seedingShuffleDisabled) return;
    if (seedingFormat === "tier") {
      handleApplyTierSeeding();
      return;
    }
    syncBracketToSeeding(buildRegistrationOrderAssignments(teams));
  }

  function handleRandomSeed() {
    if (seedingShuffleDisabled) return;
    syncBracketToSeeding(buildRandomSeedingAssignments(teams));
  }

  function handleSeedingFormatChange(next: SeedingFormat) {
    if (seedingShuffleDisabled || next === seedingFormat) return;
    setSeedingFormat(next);
  }

  function handleTierChange(teamId: string, tier: SeedingTier) {
    if (seedingShuffleDisabled) return;
    setTeamTiers((prev) => ({ ...prev, [teamId]: tier }));
  }

  function handleApplyTierSeeding() {
    if (seedingShuffleDisabled) return;
    syncBracketToSeeding(buildTierSeedingAssignments(teams, teamTiers));
  }

  function handleRandomFillRemaining() {
    if (seedingShuffleDisabled) return;
    syncBracketToSeeding(
      buildProtectedRandomAssignments(teams, assignments, protectedSeedCount),
    );
  }

  function handleProtectedSeedCountChange(count: number) {
    if (seedingShuffleDisabled) return;
    setProtectedSeedCount(count);
  }

  function handleIncludeThirdPlaceMatchToggle() {
    if (!canIncludeThirdPlaceMatch || seedingShuffleDisabled) return;
    const next = !includeThirdPlaceMatch;
    setIncludeThirdPlaceMatch(next);
    if (!bracketGenerated) return;

    const assignedTeams = assignments.filter(Boolean) as TournamentTeam[];
    if (assignedTeams.length !== teams.length) return;

    const names = orderedTeamNamesFromAssignments(assignments, bracketSize);
    bracketEngine.autoSeed(names);
    const managed = buildManagedState(names, format, next, grandFinalMode);
    setManagedMatches(managed.matches);
    setRoundMetas(managed.roundMetas);
    setRoundFormats(managed.roundFormats);
    setSwissState(managed.swiss ?? null);
    setBracketGenerated(true);
    setStatus("draft");
    persistDraftSnapshot(
      managed.matches,
      managed.roundMetas,
      managed.roundFormats,
      assignments,
      managed.swiss ?? null,
      false,
    );
  }

  function handleGrandFinalModeChange(next: GrandFinalMode) {
    if (!isDoubleElim || seedingShuffleDisabled || next === grandFinalMode) return;
    setGrandFinalMode(next);
    if (!bracketGenerated) return;

    const assignedTeams = assignments.filter(Boolean) as TournamentTeam[];
    if (assignedTeams.length !== teams.length) return;

    const names = orderedTeamNamesFromAssignments(assignments, bracketSize);
    bracketEngine.autoSeed(names);
    const managed = buildManagedState(names, format, includeThirdPlaceMatch, next);
    setManagedMatches(managed.matches);
    setRoundMetas(managed.roundMetas);
    setRoundFormats(managed.roundFormats);
    setSwissState(managed.swiss ?? null);
    setBracketGenerated(true);
    setStatus("draft");
    persistDraftSnapshot(
      managed.matches,
      managed.roundMetas,
      managed.roundFormats,
      assignments,
      managed.swiss ?? null,
      false,
    );
  }

  useEffect(() => {
    if (!canIncludeThirdPlaceMatch && includeThirdPlaceMatch) {
      setIncludeThirdPlaceMatch(false);
    }
  }, [canIncludeThirdPlaceMatch, includeThirdPlaceMatch]);

  function requestReset() {
    if (resultsLocked) {
      setBracketDialog({
        kind: "info",
        title: "Reset unavailable",
        description: "This tournament is completed. Reset is disabled to preserve final results.",
      });
      return;
    }
    if (isPublished) {
      setBracketDialog({
        kind: "confirm",
        title: "Reset published bracket?",
        description:
          "This clears every match result, removes the live bracket from the public page, and returns you to seeding.",
        confirmLabel: "Reset bracket",
        destructive: true,
        onConfirm: () => void executeReset(),
      });
      return;
    }
    if (seedingLocked) {
      setBracketDialog({
        kind: "info",
        title: "Unlock seeding first",
        description: "Unlock seeding before resetting a draft bracket.",
      });
      return;
    }
    setBracketDialog({
      kind: "confirm",
      title: "Reset bracket?",
      description: "All match results and bracket progress will be lost. This cannot be undone.",
      confirmLabel: "Reset bracket",
      destructive: true,
      onConfirm: () => void executeReset(),
    });
  }

  async function executeReset() {
    setIsSaving(true);
    setSaveError(null);
    try {
      await clearPublishedBracket(tournamentId);
      setAssignments(Array(bracketSize).fill(null));
      setBracketGenerated(false);
      setBracketLocked(false);
      setManagedMatches([]);
      setRoundMetas([]);
      setRoundFormats({});
      setSwissState(null);
      setStatus("not_generated");
      bracketEngine.reset();
      setActiveTab("seeding");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to reset bracket.");
    } finally {
      setIsSaving(false);
    }
  }

  function toggleLock() {
    if (isPublished || resultsLocked) return;
    setBracketLocked(!bracketLocked);
  }

  function requestMarkComplete() {
    setBracketDialog({
      kind: "confirm",
      title: "Mark tournament completed?",
      description:
        "The bracket stays published on the public site. Match results and seeding will be locked — unlock by changing status back to Live if corrections are needed.",
      confirmLabel: "Mark completed",
      onConfirm: () => void executeMarkComplete(),
    });
  }

  async function executeMarkComplete() {
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateTournamentStatus(tournamentId, "Completed");
      onTournamentStatusChange?.("Completed");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to mark tournament as completed.");
    } finally {
      setIsSaving(false);
    }
  }

  function requestPublish() {
    if (!canPublish) {
      setBracketDialog({
        kind: "info",
        title: "Not ready to publish",
        description: "Complete all validation requirements before publishing the bracket.",
      });
      return;
    }

    setBracketDialog({
      kind: "confirm",
      title: "Publish bracket?",
      description:
        "Once published, the tournament goes live on the public site. Scores and winners will sync in real time for viewers.",
      confirmLabel: "Publish & go live",
      onConfirm: () => void executePublish(),
    });
  }

  async function executePublish() {
    const payload = buildPersistedPayload(managedMatches, roundMetas, roundFormats, assignments, {
      format,
      prizeBreakdown,
      swiss: swissState ?? undefined,
      teamNames,
      includeThirdPlaceMatch: canIncludeThirdPlaceMatch ? includeThirdPlaceMatch : undefined,
      grandFinalMode: isDoubleElim ? grandFinalMode : undefined,
      ...adminSeedingOptions,
    });

    setIsSaving(true);
    setSaveError(null);
    try {
      await publishBracket(tournamentId, payload, { isInitialPublish: true });
      setStatus("published");
      setBracketLocked(true);
      setActiveTab("bracket");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to publish bracket.");
      return;
    }

    try {
      await updateTournamentStatus(tournamentId, "Live");
      onTournamentStatusChange?.("Live");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to set tournament status to Live.";
      setSaveError(
        `Bracket published, but tournament status was not updated: ${message}. Retry from admin or update status manually.`,
      );
      console.error("[BracketManager] updateTournamentStatus failed after publish:", err);
    } finally {
      setIsSaving(false);
    }
  }

  const pushLiveUpdate = useCallback(
    (
      updatedMatches: ManagedMatch[],
      updatedRoundMetas = roundMetas,
      updatedSwiss = swissState ?? undefined,
      updatedRoundFormats = roundFormats,
    ) => {
      if (!isPublished) return;
      const payload = buildPersistedPayload(
        updatedMatches,
        updatedRoundMetas,
        updatedRoundFormats,
        assignments,
        {
          format,
          prizeBreakdown,
          swiss: updatedSwiss,
          teamNames,
          includeThirdPlaceMatch: canIncludeThirdPlaceMatch ? includeThirdPlaceMatch : undefined,
          grandFinalMode: isDoubleElim ? grandFinalMode : undefined,
          ...adminSeedingOptions,
        },
      );
      void publishBracket(tournamentId, payload, tournamentName).catch((err) => {
        console.error("[BracketManager] Live bracket sync failed:", err);
        setSaveError(err instanceof Error ? err.message : "Failed to sync bracket.");
      });
    },
    [
      isPublished,
      roundMetas,
      roundFormats,
      assignments,
      swissState,
      tournamentId,
      format,
      prizeBreakdown,
      teamNames,
      includeThirdPlaceMatch,
      canIncludeThirdPlaceMatch,
      isDoubleElim,
      grandFinalMode,
      adminSeedingOptions,
    ],
  );

  const commitEliminationUpdate = useCallback(
    (
      updatedMatches: ManagedMatch[],
      options?: {
        roundMetas?: BracketRoundMeta[];
        roundFormats?: Record<string, BestOfFormat>;
      },
    ) => {
      const progressed = applyBracketProgression(
        updatedMatches,
        options?.roundMetas ?? roundMetas,
        grandFinalMode,
      );
      let nextFormats = options?.roundFormats ?? roundFormats;

      if (
        progressed.roundMetas.some((meta) => meta.id === "gf-reset") &&
        !nextFormats["gf-reset"]
      ) {
        nextFormats = {
          ...nextFormats,
          "gf-reset": nextFormats.gf ?? "BO5",
        };
      }
      if (!progressed.roundMetas.some((meta) => meta.id === "gf-reset")) {
        nextFormats = { ...nextFormats };
        delete nextFormats["gf-reset"];
      }

      setManagedMatches(progressed.matches);
      setRoundMetas(progressed.roundMetas);
      setRoundFormats(nextFormats);
      pushLiveUpdate(
        progressed.matches,
        progressed.roundMetas,
        swissState ?? undefined,
        nextFormats,
      );
    },
    [roundMetas, roundFormats, swissState, pushLiveUpdate, grandFinalMode],
  );

  const commitSwissUpdate = useCallback(
    (updatedMatches: ManagedMatch[], nextSwiss: SwissBracketState, editedMatchId?: string) => {
      const editedRound = editedMatchId
        ? updatedMatches.find((match) => match.id === editedMatchId)?.swissRound
        : undefined;
      const applied = applySwissMatchUpdates(
        updatedMatches,
        roundMetas,
        nextSwiss,
        teamNames,
        editedRound,
      );
      const mergedFormats = { ...defaultRoundFormats(applied.roundMetas), ...roundFormats };
      setSwissState(applied.swiss);
      setRoundMetas(applied.roundMetas);
      setRoundFormats(mergedFormats);
      setManagedMatches(applied.matches);
      pushLiveUpdate(applied.matches, applied.roundMetas, applied.swiss, mergedFormats);
    },
    [roundMetas, roundFormats, teamNames, pushLiveUpdate],
  );

  const openPlayoffDialog = useCallback(() => {
    if (resultsLocked) return;
    if (!swissState || !canStartSwissPlayoffs(teamNames, swissState, managedMatches)) return;
    setPlayoffDialogOpen(true);
  }, [swissState, teamNames, managedMatches, resultsLocked]);

  const applyPlayoffPairings = useCallback(
    (round1Pairings: PlayoffRound1Pairing[], includeThirdPlaceMatch = false) => {
      if (!swissState) return;

      try {
        const next = startSwissPlayoffs(
          managedMatches,
          roundMetas,
          swissState,
          teamNames,
          round1Pairings,
          { includeThirdPlaceMatch, seedByTeam },
        );
        const playoffMetas = next.roundMetas.filter((meta) => meta.side === "playoff");
        const mergedFormats = {
          ...roundFormats,
          ...defaultRoundFormats(playoffMetas),
        };
        setManagedMatches(next.matches);
        setRoundMetas(next.roundMetas);
        setSwissState(next.swiss);
        setRoundFormats(mergedFormats);
        pushLiveUpdate(next.matches, next.roundMetas, next.swiss, mergedFormats);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Failed to start playoffs.");
      }
    },
    [swissState, teamNames, managedMatches, roundMetas, roundFormats, pushLiveUpdate, seedByTeam],
  );

  const handleMatchScore = useCallback(
    (matchId: string, scoreA: number, scoreB: number) => {
      if (resultsLocked) return;
      const match = managedMatches.find((m) => m.id === matchId);
      if (!match) return;
      const fmt = roundFormats[match.roundId] ?? "BO3";

      if (isSwiss && swissState && match.bracketSide === "swiss") {
        const { matches: updated, swiss: nextSwiss } = updateSwissMatchScores(
          managedMatches,
          swissState,
          teamNames,
          matchId,
          scoreA,
          scoreB,
          fmt,
        );
        commitSwissUpdate(updated, nextSwiss, matchId);
        return;
      }

      const updated = updateMatchScores(managedMatches, matchId, scoreA, scoreB, fmt);
      commitEliminationUpdate(updated);
    },
    [
      managedMatches,
      roundFormats,
      commitEliminationUpdate,
      isSwiss,
      swissState,
      teamNames,
      commitSwissUpdate,
      resultsLocked,
    ],
  );

  const handlePickWinner = useCallback(
    (matchId: string, winner: string) => {
      if (resultsLocked) return;
      const match = managedMatches.find((m) => m.id === matchId);
      if (!match) return;
      const fmt = roundFormats[match.roundId] ?? "BO3";

      if (isSwiss && swissState && match.bracketSide === "swiss") {
        if (match.winner === winner) {
          const { matches: updated, swiss: nextSwiss } = clearSwissMatchResult(
            managedMatches,
            swissState,
            teamNames,
            matchId,
          );
          commitSwissUpdate(updated, nextSwiss, matchId);
          return;
        }

        const required = winsRequired(fmt);
        const scoreA = winner === match.teamA ? required : 0;
        const scoreB = winner === match.teamB ? required : 0;
        const { matches: updated, swiss: nextSwiss } = updateSwissMatchScores(
          managedMatches,
          swissState,
          teamNames,
          matchId,
          scoreA,
          scoreB,
          fmt,
        );
        commitSwissUpdate(updated, nextSwiss, matchId);
        return;
      }

      const updated =
        match.winner === winner
          ? clearMatchResult(managedMatches, matchId)
          : setMatchWinner(managedMatches, matchId, winner, fmt);
      commitEliminationUpdate(updated);
    },
    [
      managedMatches,
      roundFormats,
      commitEliminationUpdate,
      isSwiss,
      swissState,
      teamNames,
      commitSwissUpdate,
      resultsLocked,
    ],
  );

  const handleApplyRecommendedFormats = useCallback(() => {
    if (resultsLocked) return;
    const recommended = buildRecommendedRoundFormats(roundMetas);
    const lockedRoundIds = new Set(
      managedMatches.filter((match) => match.confirmed).map((match) => match.roundId),
    );

    let updatedMatches = managedMatches;
    for (const [roundId, format] of Object.entries(recommended)) {
      if (lockedRoundIds.has(roundId)) continue;
      if (roundFormats[roundId] === format) continue;
      updatedMatches = reapplyFormatToRound(updatedMatches, roundId, format);
    }

    const mergedFormats = { ...recommended, ...roundFormats };
    for (const roundId of lockedRoundIds) {
      mergedFormats[roundId] = roundFormats[roundId] ?? mergedFormats[roundId] ?? "BO3";
    }

    commitEliminationUpdate(updatedMatches, { roundFormats: mergedFormats });
  }, [resultsLocked, roundMetas, managedMatches, roundFormats, commitEliminationUpdate]);

  const handleRoundFormat = useCallback(
    (roundId: string, format: BestOfFormat) => {
      if (resultsLocked) return;
      const hasConfirmed = managedMatches.some((m) => m.roundId === roundId && m.confirmed);
      if (hasConfirmed) {
        setBracketDialog({
          kind: "info",
          title: "Format locked",
          description:
            "One or more matches in this round already have confirmed results. Clear those results before changing the format.",
        });
        return;
      }

      const nextFormats = { ...roundFormats, [roundId]: format };
      const updatedMatches = reapplyFormatToRound(managedMatches, roundId, format);
      commitEliminationUpdate(updatedMatches, { roundFormats: nextFormats });
    },
    [managedMatches, resultsLocked, roundFormats, commitEliminationUpdate],
  );

  function onTeamSelect(slotIdx: number, teamId: string | null) {
    if (seedingShuffleDisabled) return;

    const team = teamId ? teams.find((t) => t.id === teamId) || null : null;

    // Check for duplicates
    const newAssignments = [...assignments];
    if (team && newAssignments.some((t, idx) => idx !== slotIdx && t?.id === team.id)) {
      setBracketDialog({
        kind: "info",
        title: "Duplicate team",
        description: "Each team can only occupy one seeding slot.",
      });
      return;
    }

    newAssignments[slotIdx] = team;
    syncBracketToSeeding(newAssignments);
  }

  return (
    <div className="flex flex-col text-foreground pb-6">
      {saveError && (
        <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive md:px-8">
          {saveError}
        </div>
      )}
      <BracketManagerHeader
        game={game}
        region={region}
        format={format}
        startDate={startDate}
        teamCount={teams.length}
        teamCap={teamCap}
        assignedCount={assignedCount}
        stats={[
          { label: "Format", value: format },
          { label: "Field", value: bracketSize, accent: true },
          { label: "Seeded", value: `${assignedCount}/${teams.length}` },
          { label: "Cap", value: teamCap },
          { label: "Rounds", value: totalRounds },
        ]}
        bracketStatus={status}
        bracketGenerated={bracketGenerated}
        canGenerate={canGenerateBracket}
        canPublish={canPublish}
        isPublished={isPublished}
        isSaving={isSaving}
        resultsLocked={resultsLocked}
        seedingLocked={seedingLocked}
        seedingShuffleDisabled={seedingShuffleDisabled}
        hasBracketProgress={hasBracketProgress}
        showMarkComplete={isPublished && tournamentStatus === "Live"}
        onGenerate={handleGenerate}
        onRandomSeed={handleRandomSeed}
        onAutoSeed={handleAutoSeed}
        onToggleLock={toggleLock}
        onReset={requestReset}
        onPublish={requestPublish}
        onMarkComplete={requestMarkComplete}
        subTabs={
          <BracketManagerSubTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            bracketGenerated={bracketGenerated}
          />
        }
      />

      {/* Tab Content */}
      <div className="flex-1">
        {/* Team Seeding Tab */}
        {activeTab === "seeding" && (
          <div className="space-y-0">
            {!isSwiss && (
              <div className="border-b border-white/6 px-4 py-6 md:px-6">
                <SeedingFormatOption
                  value={seedingFormat}
                  onChange={handleSeedingFormatChange}
                  disabled={seedingShuffleDisabled}
                  disabledReason={
                    seedingShuffleDisabled
                      ? hasBracketProgress
                        ? "Locked — clear match results to change"
                        : seedingLocked
                          ? "Locked while bracket is published"
                          : undefined
                      : undefined
                  }
                />
              </div>
            )}
            {isDoubleElim && (
              <div className="border-b border-white/6 px-4 py-6 md:px-6">
                <GrandFinalOption
                  value={grandFinalMode}
                  onChange={handleGrandFinalModeChange}
                  disabled={seedingShuffleDisabled}
                  disabledReason={
                    seedingShuffleDisabled
                      ? hasBracketProgress
                        ? "Locked — clear match results to change"
                        : seedingLocked
                          ? "Locked while bracket is published"
                          : undefined
                      : undefined
                  }
                />
              </div>
            )}
            {canIncludeThirdPlaceMatch && (
              <div className="border-b border-white/6 px-4 py-6 md:px-6">
                <ThirdPlaceMatchOption
                  enabled={includeThirdPlaceMatch}
                  onToggle={handleIncludeThirdPlaceMatchToggle}
                  disabled={seedingShuffleDisabled}
                  disabledReason={
                    seedingShuffleDisabled
                      ? hasBracketProgress
                        ? "Locked — clear match results to change"
                        : seedingLocked
                          ? "Locked while bracket is published"
                          : undefined
                      : undefined
                  }
                />
              </div>
            )}
            <SeedingPanel
              teams={teams}
              assignments={assignments}
              bracketSize={bracketSize}
              seedingMatchCount={seedingMatchCount}
              hasSwissByeSlot={hasSwissByeSlot}
              isSwiss={isSwiss}
              isDoubleElim={isDoubleElim}
              seedingFormat={seedingFormat}
              protectedSeedCount={protectedSeedCount}
              tierByTeamId={teamTiers}
              onProtectedSeedCountChange={handleProtectedSeedCountChange}
              onApplyTierSeeding={handleApplyTierSeeding}
              onRandomFillRemaining={handleRandomFillRemaining}
              onTierChange={handleTierChange}
              directSeedCount={directSeeds}
              disabled={seedingShuffleDisabled}
              onTeamSelect={onTeamSelect}
            />
          </div>
        )}
        {/* Bracket Preview Tab */}
        {activeTab === "bracket" && (
          <div className="flex-1 px-4 py-6 md:px-6">
            {!bracketGenerated ? (
              <FeatureEmptyState
                title="No bracket generated"
                message="Assign all teams in the seeding panel, then click Generate Bracket to manage matches and results."
                action={
                  !seedingLocked ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="font-tech text-xs uppercase tracking-wider"
                      onClick={() => setActiveTab("seeding")}
                    >
                      Go to seeding
                    </Button>
                  ) : undefined
                }
              />
            ) : roundMetas.length === 0 ? (
              <FeatureEmptyState
                title="Bracket data missing"
                message="Seeding is loaded but match data was not built. Click Generate Bracket again or use Auto Seed then Generate Bracket."
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-tech text-xs uppercase tracking-wider"
                    onClick={() => setActiveTab("seeding")}
                  >
                    Go to seeding
                  </Button>
                }
              />
            ) : (
              <div className="space-y-10">
                {isSwiss && swissState ? (
                  <>
                    <SwissBracketView
                      matches={managedMatches}
                      roundMetas={roundMetas}
                      roundFormats={roundFormats}
                      teams={teams}
                      swiss={swissState}
                      tournamentStatus={tournamentStatus}
                      readOnly={resultsLocked}
                      canStartPlayoffs={
                        !resultsLocked &&
                        canStartSwissPlayoffs(teamNames, swissState, managedMatches)
                      }
                      onStartPlayoffs={openPlayoffDialog}
                      onFormatChange={handleRoundFormat}
                      onApplyRecommendedFormats={handleApplyRecommendedFormats}
                      onScoreChange={handleMatchScore}
                      onPickWinner={handlePickWinner}
                    />
                    {getSwissPhase(swissState) === "playoffs" && (
                      <div className="space-y-5">
                        <div className="relative overflow-hidden border border-white/10 bg-[oklch(0.08_0_0)]">
                          <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />
                          <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-linear-to-b from-amber-300/60 via-white/10 to-transparent" />
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />

                          <div className="relative px-5 py-4">
                            <p className="font-tech text-[10px] uppercase tracking-wider-2 text-white/40">
                              Championship Bracket
                            </p>
                            <h3 className="mt-1 font-display text-xl tracking-display text-white">
                              Playoff Stage
                            </h3>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
                              Single elimination among Swiss qualifiers. Record match results below
                              to advance teams and determine final placements.
                              {swissState.playoffThirdPlaceMatch && (
                                <span className="mt-1 block text-orange-300/75">
                                  3rd place match is active for semifinal losers.
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <ManagedBracketView
                          matches={managedMatches}
                          roundMetas={roundMetas.filter((meta) => meta.side === "playoff")}
                          roundFormats={roundFormats}
                          teams={teams}
                          isDoubleElim={false}
                          readOnly={resultsLocked}
                          onFormatChange={handleRoundFormat}
                          onApplyRecommendedFormats={handleApplyRecommendedFormats}
                          onScoreChange={handleMatchScore}
                          onPickWinner={handlePickWinner}
                        />
                      </div>
                    )}
                    {getSwissPhase(swissState) === "playoffs" &&
                      prizeBreakdown.length > 0 &&
                      currentPlacements.length > 0 && (
                        <EliminationResultsBoard
                          placements={currentPlacements}
                          teamTags={new Map(teams.map((team) => [team.name, team.tag]))}
                        />
                      )}
                  </>
                ) : (
                  <ManagedBracketView
                    matches={managedMatches}
                    roundMetas={roundMetas}
                    roundFormats={roundFormats}
                    teams={teams}
                    isDoubleElim={isDoubleElim}
                    grandFinalMode={grandFinalMode}
                    readOnly={resultsLocked}
                    onFormatChange={handleRoundFormat}
                    onApplyRecommendedFormats={handleApplyRecommendedFormats}
                    onScoreChange={handleMatchScore}
                    onPickWinner={handlePickWinner}
                  />
                )}

                {!isSwiss && prizeBreakdown.length > 0 && currentPlacements.length > 0 && (
                  <EliminationResultsBoard
                    placements={currentPlacements}
                    teamTags={new Map(teams.map((team) => [team.name, team.tag]))}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Validation Tab */}
        {activeTab === "validation" && (
          <div className="px-4 py-6 md:px-6">
            <div className="overflow-hidden border border-white/8 bg-[oklch(0.06_0_0)]">
              <div className="border-b border-white/8 bg-white/2 px-5 py-4">
                <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-white/45">
                  Pre-publish
                </p>
                <h3 className="mt-1 font-display text-lg tracking-display text-white">
                  Validation checklist
                </h3>
                <p className="mt-1 text-sm text-white/45">
                  Confirm seeding and bracket structure before publishing to the public page.
                </p>
              </div>

              <div className="space-y-2 px-5 py-5">
                <ValidationItem
                  label="No duplicate teams"
                  passed={
                    !assignments.some(
                      (team, idx) =>
                        team && assignments.some((t, i) => i !== idx && t?.id === team.id),
                    )
                  }
                />
                <ValidationItem label="Seeding requirements met" passed={seedingReadiness.ready} />
                <ValidationItem label="All teams seeded" passed={allAssigned} />
                <ValidationItem label="Bracket structure valid" passed={bracketGenerated} />
                <ValidationItem
                  label="Team count correct"
                  passed={teams.length >= 2 && parityOk}
                />
                <ValidationItem
                  label="Seeding complete"
                  passed={seedingReadiness.ready && bracketGenerated && allAssigned}
                />
              </div>

              <div className="border-t border-white/6 px-5 py-4">
                <Button
                  type="button"
                  disabled={!canPublish || isPublished || isSaving}
                  onClick={requestPublish}
                  className="gap-1.5 font-tech text-[10px] uppercase tracking-wider"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {isSaving ? "Saving…" : "Publish bracket"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BracketActionDialog
        open={bracketDialog !== null}
        onOpenChange={(open) => {
          if (!open) setBracketDialog(null);
        }}
        title={bracketDialog?.title ?? ""}
        description={bracketDialog?.description ?? ""}
        confirmLabel={bracketDialog?.kind === "confirm" ? bracketDialog.confirmLabel : "Got it"}
        destructive={bracketDialog?.kind === "confirm" ? bracketDialog.destructive : false}
        infoOnly={bracketDialog?.kind === "info"}
        onConfirm={bracketDialog?.kind === "confirm" ? bracketDialog.onConfirm : undefined}
      />

      {swissState && (
        <PlayoffPairingDialog
          open={playoffDialogOpen}
          onOpenChange={setPlayoffDialogOpen}
          qualifiedTeams={getQualifiedTeams(teamNames, swissState, managedMatches, seedByTeam)}
          teams={teams}
          onConfirm={applyPlayoffPairings}
        />
      )}
    </div>
  );
}

function ValidationItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-3 border border-white/6 bg-white/2 px-4 py-3">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center font-mono text-xs font-bold ${
          passed ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {passed ? "✓" : "✗"}
      </span>
      <span className={passed ? "text-white/85" : "text-white/40"}>{label}</span>
    </div>
  );
}
