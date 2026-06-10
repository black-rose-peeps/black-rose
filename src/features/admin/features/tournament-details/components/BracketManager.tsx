import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { BracketEngine } from "../types/bracket-engine";
import type { BracketStatus } from "../../../types";
import { EliminationResultsBoard } from "@/features/tournaments/components/EliminationResultsBoard";
import type { BracketRound, PrizeTier, TournamentTeam } from "@/features/tournaments/types";
import {
  buildPodiumPlacements,
  deriveManagedPlacements,
} from "@/features/tournaments/utils/tournament-placements";
import { isDoubleEliminationFormat, isSwissFormat } from "@/features/tournaments/constants/formats";
import { isTournamentConcluded } from "@/features/tournaments/utils/tournament-status";
import { BracketActionDialog } from "./BracketActionDialog";
import { BracketManagerHeader } from "./BracketManagerHeader";
import { ManagedBracketView } from "./ManagedBracketView";
import { PlayoffPairingDialog } from "./PlayoffPairingDialog";
import { SeedingPanel } from "./SeedingPanel";
import { SwissBracketView } from "./SwissBracketView";
import type {
  BestOfFormat,
  BracketRoundMeta,
  ManagedMatch,
  PlayoffRound1Pairing,
} from "../utils/managed-bracket";
import {
  buildDoubleElimMatches,
  buildSingleElimMatches,
  clearMatchResult,
  defaultRoundFormats,
  setMatchWinner,
  updateMatchScores,
  winsRequired,
} from "../utils/managed-bracket";
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
import { eliminationRoundCount } from "../utils/bracket-field";
import { publishBracket, clearPublishedBracket, syncLocalBracket } from "@/lib/bracket-store";
import { fetchBracketState } from "../services/bracket.service";
import type { PersistedBracketPayload } from "../services/bracket.service";
import { updateTournamentStatus } from "@/features/admin/features/tournaments/services/tournaments.service";
import type { MockTournament } from "@/lib/mock-data";

/** Convert admin ManagedMatch[] + roundMetas into the public BracketRound[] shape. */
function managedMatchesToPublicRounds(
  matches: ManagedMatch[],
  roundMetas: BracketRoundMeta[],
): BracketRound[] {
  return roundMetas.map((meta) => ({
    label: meta.label,
    matches: meta.matchIds
      .map((id) => matches.find((m) => m.id === id))
      .filter((m): m is ManagedMatch => !!m)
      .map((m) => ({
        id: m.id,
        round: m.swissPool
          ? `${m.roundLabel} · ${formatSwissPoolLabel(m.swissPool)}`
          : m.roundLabel,
        teamA: m.teamA,
        teamB: m.teamB,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        winner: m.winner ?? undefined,
      })),
  }));
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
  },
): PersistedBracketPayload {
  const placements = buildPodiumPlacements(
    options.prizeBreakdown ?? [],
    deriveManagedPlacements(options.format, managedMatches, options.swiss, options.teamNames),
  );

  return {
    rounds: managedMatchesToPublicRounds(managedMatches, roundMetas),
    prizeBreakdown: options.prizeBreakdown,
    placements,
    admin: {
      managedMatches,
      roundMetas,
      roundFormats,
      assignmentTeamIds: assignments.map((t) => t?.id ?? null),
      swiss: options.swiss,
    },
  };
}

function buildManagedState(teamNames: string[], format: string) {
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
    ? buildDoubleElimMatches(teamNames)
    : buildSingleElimMatches(teamNames);
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
  initialBracket: BracketRound[];
  tournamentStatus: MockTournament["status"];
  prizeBreakdown?: PrizeTier[];
  onTournamentStatusChange?: (status: MockTournament["status"]) => void;
}

function deriveBracketState(
  initialBracket: BracketRound[],
  teams: TournamentTeam[],
  bracketSize: number,
): {
  assignments: Array<TournamentTeam | null>;
  status: BracketStatus;
  bracketGenerated: boolean;
  bracketLocked: boolean;
} {
  const assignments: Array<TournamentTeam | null> = Array(bracketSize).fill(null);
  const firstRound = initialBracket[0];

  if (firstRound?.matches?.length) {
    let slot = 0;
    for (const match of firstRound.matches) {
      if (slot >= bracketSize) break;
      assignments[slot++] = match.teamA
        ? (teams.find((t) => t.name === match.teamA) ?? null)
        : null;
      if (slot >= bracketSize) break;
      assignments[slot++] = match.teamB
        ? (teams.find((t) => t.name === match.teamB) ?? null)
        : null;
    }
  }

  const assignedCount = assignments.filter(Boolean).length;
  const hasInitialBracket = initialBracket.length > 0 && assignedCount > 0;

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
  const bracketSize = fieldSize;
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
  const seedingShuffleDisabled =
    seedingDisabled || (bracketGenerated && hasBracketProgress);
  const isTournamentCompleted = tournamentStatus === "Completed";
  const teamNames = useMemo(() => teams.map((team) => team.name), [teams]);
  const currentPlacements = useMemo(
    () =>
      buildPodiumPlacements(
        prizeBreakdown,
        deriveManagedPlacements(format, managedMatches, swissState, teamNames),
      ),
    [format, managedMatches, swissState, teamNames, prizeBreakdown],
  );

  // Restore published bracket from Supabase (survives refresh; shared with public).
  useEffect(() => {
    let cancelled = false;

    fetchBracketState(tournamentId)
      .then((state) => {
        if (cancelled) return;
        if (state?.status === "published" && state.payload?.admin?.managedMatches?.length) {
          const admin = state.payload.admin;
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
                  restoredSwiss.playoffsSeededTeams ?? getQualifiedTeams(teamNames, restoredSwiss),
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
          setBracketGenerated(true);
          setBracketLocked(true);
          setStatus("published");
          syncLocalBracket(tournamentId, state.payload.rounds);
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

    const derived = deriveBracketState(initialBracket, teams, bracketSize);
    setStatus(derived.status);
    setAssignments(derived.assignments);
    setBracketGenerated(derived.bracketGenerated);
    setBracketLocked(derived.bracketLocked);

    bracketEngine.reset();
    if (derived.bracketGenerated) {
      const teamNames = derived.assignments.filter(Boolean).map((t) => t!.name);
      if (teamNames.length > 0) {
        bracketEngine.autoSeed(teamNames);
        const managed = buildManagedState(teamNames, format);
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
  ]);

  const validation = bracketEngine.validateBracketIntegrity();
  const assignedCount = assignments.slice(0, bracketSize).filter(Boolean).length;
  const allAssigned =
    teams.length >= 2 && teams.length % 2 === 0 && assignedCount === teams.length;
  const canPublish =
    status === "draft" && bracketGenerated && allAssigned && (isSwiss || validation.canPublish);

  function handleGenerate() {
    if (resultsLocked) return;
    if (!allAssigned) {
      setBracketDialog({
        kind: "info",
        title: "Seeding incomplete",
        description: `Assign all ${teams.length} registered teams in the seeding panel before generating the bracket.`,
      });
      setActiveTab("seeding");
      return;
    }

    const teamNames = assignments.filter(Boolean).map((t) => t!.name);
    bracketEngine.autoSeed(teamNames);

    const managed = buildManagedState(teamNames, format);
    setManagedMatches(managed.matches);
    setRoundMetas(managed.roundMetas);
    setRoundFormats(managed.roundFormats);
    setSwissState(managed.swiss ?? null);
    setBracketGenerated(true);
    setStatus("draft");
    setActiveTab("bracket");
  }

  function syncBracketToSeeding(nextAssignments: Array<TournamentTeam | null>) {
    setAssignments(nextAssignments);

    if (!bracketGenerated) return;

    const assignedTeams = nextAssignments.filter(Boolean) as TournamentTeam[];
    if (assignedTeams.length !== teams.length) return;

    const names = assignedTeams.map((team) => team.name);
    bracketEngine.autoSeed(names);
    const managed = buildManagedState(names, format);
    setManagedMatches(managed.matches);
    setRoundMetas(managed.roundMetas);
    setRoundFormats(managed.roundFormats);
    setSwissState(managed.swiss ?? null);
    setBracketGenerated(true);
    setStatus("draft");
  }

  function handleAutoSeed() {
    if (seedingShuffleDisabled) return;
    syncBracketToSeeding(teams.map((team) => team));
  }

  function handleRandomSeed() {
    if (seedingShuffleDisabled) return;
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    syncBracketToSeeding(shuffled);
  }
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
        },
      );
      void publishBracket(tournamentId, payload).catch((err) => {
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
    ],
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
    if (!swissState || !canStartSwissPlayoffs(teamNames, swissState)) return;
    setPlayoffDialogOpen(true);
  }, [swissState, teamNames]);

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
          { includeThirdPlaceMatch },
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
    [swissState, teamNames, managedMatches, roundMetas, roundFormats, pushLiveUpdate],
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
      setManagedMatches(updated);
      pushLiveUpdate(updated);
    },
    [
      managedMatches,
      roundFormats,
      pushLiveUpdate,
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
      setManagedMatches(updated);
      pushLiveUpdate(updated);
    },
    [
      managedMatches,
      roundFormats,
      pushLiveUpdate,
      isSwiss,
      swissState,
      teamNames,
      commitSwissUpdate,
      resultsLocked,
    ],
  );

  const handleRoundFormat = useCallback(
    (roundId: string, format: BestOfFormat) => {
      if (resultsLocked) return;
      // Block format change if any match in this round already has confirmed results
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
      setRoundFormats((prev) => ({ ...prev, [roundId]: format }));
    },
    [managedMatches, resultsLocked],
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
    <div className="flex flex-col text-foreground">
      {saveError && (
        <div className="border-b border-destructive/40 bg-destructive/10 px-8 py-3 text-sm text-destructive">
          {saveError}
        </div>
      )}
      <BracketManagerHeader
        tournamentName={tournamentName}
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
        canGenerate={allAssigned}
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
      />

      {/* Section Tabs */}
      <div className="flex border-b border-border px-8">
        <button
          onClick={() => setActiveTab("seeding")}
          className={`px-5 py-3 font-display text-xs uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === "seeding"
              ? "text-white border-white"
              : "text-muted-foreground border-transparent hover:text-gray-400"
          }`}
        >
          Team Seeding
        </button>
        <button
          onClick={() => setActiveTab("bracket")}
          className={`px-5 py-3 font-display text-xs uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === "bracket"
              ? "text-white border-white"
              : "text-muted-foreground border-transparent hover:text-gray-400"
          }`}
        >
          {bracketGenerated ? "Manage Bracket" : "Bracket Preview"}
        </button>
        <button
          onClick={() => setActiveTab("validation")}
          className={`px-5 py-3 font-display text-xs uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === "validation"
              ? "text-white border-white"
              : "text-muted-foreground border-transparent hover:text-gray-400"
          }`}
        >
          Validation
        </button>
      </div>
      {/* Tab Content */}
      <div className="flex-1">
        {/* Team Seeding Tab */}
        {activeTab === "seeding" && (
          <SeedingPanel
            teams={teams}
            assignments={assignments}
            bracketSize={bracketSize}
            seedingMatchCount={seedingMatchCount}
            hasSwissByeSlot={hasSwissByeSlot}
            disabled={seedingShuffleDisabled}
            onTeamSelect={onTeamSelect}
          />
        )}
        {/* Bracket Preview Tab */}
        {activeTab === "bracket" && (
          <div className="p-8 flex-1">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3 text-muted-foreground font-display text-sm uppercase tracking-wider">
                <span>{isPublished ? "Live Bracket" : "Bracket Management"}</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>
              {!seedingLocked && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-tech text-xs uppercase tracking-wider"
                  onClick={() => setActiveTab("seeding")}
                >
                  ← Back to Seeding
                </Button>
              )}
            </div>

            {!bracketGenerated ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-4xl text-border mb-2">⬡</div>
                <div className="font-display text-lg uppercase tracking-wider text-muted-foreground mb-2">
                  No Bracket Generated
                </div>
                <div className="text-sm text-muted-foreground max-w-80">
                  Assign all teams in the seeding panel, then click Generate Bracket to manage
                  matches and results.
                </div>
              </div>
            ) : roundMetas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="font-display text-lg uppercase tracking-wider text-muted-foreground mb-2">
                  Bracket data missing
                </div>
                <div className="text-sm text-muted-foreground max-w-md">
                  Seeding is loaded but match data was not built. Click Generate Bracket again or
                  use Auto Seed then Generate Bracket.
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 font-tech text-xs uppercase tracking-wider"
                  onClick={() => setActiveTab("seeding")}
                >
                  Go to Seeding
                </Button>
              </div>
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
                        !resultsLocked && canStartSwissPlayoffs(teamNames, swissState)
                      }
                      onStartPlayoffs={openPlayoffDialog}
                      onFormatChange={handleRoundFormat}
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
                    readOnly={resultsLocked}
                    onFormatChange={handleRoundFormat}
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
          <div className="p-8">
            <div className="flex items-center gap-3 mb-4 text-muted-foreground font-display text-sm uppercase tracking-wider">
              <span>Validation Checklist</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            <div className="bg-card border border-border p-5">
              <div className="font-display text-xs uppercase tracking-wider text-muted-foreground mb-3">
                Pre-Publish Requirements
              </div>

              <div className="space-y-2">
                <ValidationItem
                  label="No duplicate teams"
                  passed={
                    !assignments.some(
                      (team, idx) =>
                        team && assignments.some((t, i) => i !== idx && t?.id === team.id),
                    )
                  }
                />
                <ValidationItem label="All matches populated" passed={allAssigned} />
                <ValidationItem label="Bracket structure valid" passed={bracketGenerated} />
                <ValidationItem
                  label="Team count correct"
                  passed={assignedCount === teams.length && teams.length >= 2}
                />
                <ValidationItem label="Seeding complete" passed={allAssigned && bracketGenerated} />
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={requestPublish}
                disabled={!canPublish || isPublished || isSaving}
                className="btn btn-primary font-display text-xs uppercase tracking-wider px-4 py-2 border border-border bg-white text-black hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving…" : "↑ Publish Bracket"}
              </button>
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
          qualifiedTeams={getQualifiedTeams(teamNames, swissState)}
          teams={teams}
          onConfirm={applyPlayoffPairings}
        />
      )}
    </div>
  );
}

function ValidationItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-3 font-display text-sm tracking-wider">
      <span
        className={`text-sm font-bold w-4 text-center ${
          passed ? "text-green-400" : "text-red-400"
        }`}
      >
        {passed ? "✓" : "✗"}
      </span>
      <span className={passed ? "text-white" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
