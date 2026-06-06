import { useState, useMemo, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BracketEngine } from "../types/bracket-engine";
import type { BracketStatus } from "../../../types";
import type { BracketRound, TournamentTeam } from "@/features/tournaments/types";
import { isDoubleEliminationFormat } from "@/features/tournaments/constants/formats";
import { ManagedBracketView } from "./ManagedBracketView";
import type { BestOfFormat, BracketRoundMeta, ManagedMatch } from "../utils/managed-bracket";
import {
  buildDoubleElimMatches,
  buildSingleElimMatches,
  defaultRoundFormats,
  setMatchWinner,
  updateMatchScores,
} from "../utils/managed-bracket";
import { publishBracket, clearPublishedBracket, syncLocalBracket } from "@/lib/bracket-store";
import { fetchBracketState } from "../services/bracket.service";
import type { PersistedBracketPayload } from "../services/bracket.service";
import { updateTournamentStatus } from "@/features/admin/features/tournaments/services/tournaments.service";

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
        round: m.roundLabel,
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
): PersistedBracketPayload {
  return {
    rounds: managedMatchesToPublicRounds(managedMatches, roundMetas),
    admin: {
      managedMatches,
      roundMetas,
      roundFormats,
      assignmentTeamIds: assignments.map((t) => t?.id ?? null),
    },
  };
}

function buildManagedState(teamNames: string[], isDoubleElim: boolean) {
  const built = isDoubleElim
    ? buildDoubleElimMatches(teamNames)
    : buildSingleElimMatches(teamNames);
  return {
    matches: built.matches,
    roundMetas: built.roundMetas,
    roundFormats: defaultRoundFormats(built.roundMetas),
  };
}

interface BracketManagerProps {
  tournamentId: string;
  tournamentName: string;
  format: string;
  teams: TournamentTeam[];
  initialBracket: BracketRound[];
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
  format,
  teams,
  initialBracket,
}: BracketManagerProps) {
  const bracketEngine = useMemo(() => {
    const teamNames = teams.map((t) => t.name);
    return new BracketEngine(teamNames);
  }, [teams]);

  const bracketSize = bracketEngine.getBracketStructure().totalTeams;
  const firstRoundMatches = bracketSize / 2;
  const isDoubleElim = isDoubleEliminationFormat(format);
  const formatAbbrev = isDoubleElim ? "DE" : "SE";
  const totalRounds = Math.log2(bracketSize);

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
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadedFromDb, setLoadedFromDb] = useState(false);

  const seedingLocked = bracketLocked;
  const isPublished = status === "published";

  // Restore published bracket from Supabase (survives refresh; shared with public).
  useEffect(() => {
    let cancelled = false;

    fetchBracketState(tournamentId)
      .then((state) => {
        if (cancelled) return;
        if (state?.status === "published" && state.payload?.admin?.managedMatches?.length) {
          const admin = state.payload.admin;
          setManagedMatches(admin.managedMatches);
          setRoundMetas(admin.roundMetas);
          setRoundFormats(admin.roundFormats);
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
        const managed = buildManagedState(teamNames, isDoubleElim);
        setManagedMatches(managed.matches);
        setRoundMetas(managed.roundMetas);
        setRoundFormats(managed.roundFormats);
      }
    } else {
      setManagedMatches([]);
      setRoundMetas([]);
      setRoundFormats({});
    }
  }, [
    initialBracket,
    teams,
    bracketSize,
    bracketEngine,
    isDoubleElim,
    loadedFromDb,
    status,
    bracketGenerated,
    managedMatches.length,
  ]);

  const validation = bracketEngine.validateBracketIntegrity();
  const assignedCount = assignments.filter(Boolean).length;
  const allAssigned = assignedCount === bracketSize;
  const canPublish = status === "draft" && validation.canPublish && bracketGenerated && allAssigned;

  function handleGenerate() {
    if (!allAssigned) {
      alert(`Assign all ${bracketSize} teams before generating.`);
      setActiveTab("seeding");
      return;
    }

    const teamNames = assignments.filter(Boolean).map((t) => t!.name);
    bracketEngine.autoSeed(teamNames);

    const managed = buildManagedState(teamNames, isDoubleElim);
    setManagedMatches(managed.matches);
    setRoundMetas(managed.roundMetas);
    setRoundFormats(managed.roundFormats);
    setBracketGenerated(true);
    setStatus("draft");
    setActiveTab("bracket");
  }

  function handleAutoSeed() {
    if (seedingLocked) return;
    const newAssignments: Array<TournamentTeam | null> = [...teams.slice(0, bracketSize)];
    while (newAssignments.length < bracketSize) {
      newAssignments.push(null);
    }
    setAssignments(newAssignments);
    // Invalidate managed bracket so it reflects the new seeding order
    setManagedMatches([]);
    setRoundMetas([]);
    setRoundFormats({});
    setBracketGenerated(false);
    setStatus("not_generated");
  }

  function handleRandomSeed() {
    if (seedingLocked) return;
    const shuffled = [...teams].sort(() => Math.random() - 0.5).slice(0, bracketSize);
    const newAssignments: Array<TournamentTeam | null> = [...shuffled];
    while (newAssignments.length < bracketSize) {
      newAssignments.push(null);
    }
    setAssignments(newAssignments);
    // Invalidate managed bracket so it reflects the new seeding order
    setManagedMatches([]);
    setRoundMetas([]);
    setRoundFormats({});
    setBracketGenerated(false);
    setStatus("not_generated");
  }
  async function handleReset() {
    if (isPublished) {
      if (!confirm("Reset a published bracket? This clears all match results and unpublishes.")) {
        return;
      }
    } else if (seedingLocked) {
      alert("Unlock seeding first.");
      return;
    } else if (!confirm("Reset the bracket? All results will be lost.")) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      if (isPublished) await clearPublishedBracket(tournamentId);
      setAssignments(Array(bracketSize).fill(null));
      setBracketGenerated(false);
      setBracketLocked(false);
      setManagedMatches([]);
      setRoundMetas([]);
      setRoundFormats({});
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
    if (isPublished) return;
    setBracketLocked(!bracketLocked);
  }

  async function handlePublish() {
    if (!canPublish) {
      alert("Complete all requirements first.");
      return;
    }

    const payload = buildPersistedPayload(
      managedMatches,
      roundMetas,
      roundFormats,
      assignments,
    );

    setIsSaving(true);
    setSaveError(null);
    try {
      await publishBracket(tournamentId, payload, { isInitialPublish: true });
      await updateTournamentStatus(tournamentId, "Live");
      setStatus("published");
      setBracketLocked(true);
      setActiveTab("bracket");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to publish bracket.");
    } finally {
      setIsSaving(false);
    }
  }

  const pushLiveUpdate = useCallback(
    (updatedMatches: ManagedMatch[]) => {
      if (!isPublished) return;
      const payload = buildPersistedPayload(updatedMatches, roundMetas, roundFormats, assignments);
      void publishBracket(tournamentId, payload).catch((err) => {
        console.error("[BracketManager] Live bracket sync failed:", err);
        setSaveError(err instanceof Error ? err.message : "Failed to sync bracket.");
      });
    },
    [isPublished, roundMetas, roundFormats, assignments, tournamentId],
  );

  const handleMatchScore = useCallback(
    (matchId: string, scoreA: number, scoreB: number) => {
      const match = managedMatches.find((m) => m.id === matchId);
      if (!match) return;
      const fmt = roundFormats[match.roundId] ?? "BO3";
      const updated = updateMatchScores(managedMatches, matchId, scoreA, scoreB, fmt);
      setManagedMatches(updated);
      pushLiveUpdate(updated);
    },
    [managedMatches, roundFormats, pushLiveUpdate],
  );

  const handlePickWinner = useCallback(
    (matchId: string, winner: string) => {
      const match = managedMatches.find((m) => m.id === matchId);
      if (!match) return;
      const fmt = roundFormats[match.roundId] ?? "BO3";
      const updated = setMatchWinner(managedMatches, matchId, winner, fmt);
      setManagedMatches(updated);
      pushLiveUpdate(updated);
    },
    [managedMatches, roundFormats, pushLiveUpdate],
  );

  const handleRoundFormat = useCallback(
    (roundId: string, format: BestOfFormat) => {
      // Block format change if any match in this round already has confirmed results
      const hasConfirmed = managedMatches.some((m) => m.roundId === roundId && m.confirmed);
      if (hasConfirmed) {
        alert(
          "Cannot change format: one or more matches in this round already have confirmed results. Reset those matches first.",
        );
        return;
      }
      setRoundFormats((prev) => ({ ...prev, [roundId]: format }));
    },
    [managedMatches],
  );

  function onTeamSelect(slotIdx: number, teamId: string | null) {
    if (seedingLocked) return;

    const team = teamId ? teams.find((t) => t.id === teamId) || null : null;

    // Check for duplicates
    const newAssignments = [...assignments];
    if (team && newAssignments.some((t, idx) => idx !== slotIdx && t?.id === team.id)) {
      alert("Cannot place same team in multiple slots.");
      return;
    }

    newAssignments[slotIdx] = team;
    setAssignments(newAssignments);

    if (bracketGenerated) {
      const teamNames = newAssignments.filter(Boolean).map((t) => t!.name);
      if (teamNames.length === bracketSize) {
        bracketEngine.autoSeed(teamNames);
        const managed = buildManagedState(teamNames, isDoubleElim);
        setManagedMatches(managed.matches);
        setRoundMetas(managed.roundMetas);
        setRoundFormats(managed.roundFormats);
      }
    }
  }

  return (
    <div className="flex flex-col text-foreground">
      {saveError && (
        <div className="border-b border-destructive/40 bg-destructive/10 px-8 py-3 text-sm text-destructive">
          {saveError}
        </div>
      )}
      {/* Tournament Header Section */}
      <div className="border-b border-border px-8 py-7">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="font-display text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Season 6 — Open Division
            </div>
            <div className="font-display text-3xl font-bold uppercase tracking-wider">
              {tournamentName}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {format} · {teams.length} Teams · June 14 – 16, 2026
            </div>
          </div>

          {/* Tournament Stats */}
          <div className="flex border border-border">
            <div className="px-5 py-3 border-r border-border min-w-20">
              <div className="font-display text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Format
              </div>
              <div className="font-display text-xl font-bold">{formatAbbrev}</div>
            </div>
            <div className="px-5 py-3 border-r border-border min-w-20">
              <div className="font-display text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Teams
              </div>
              <div className="font-display text-xl font-bold text-amber-400">{bracketSize}</div>
            </div>
            <div className="px-5 py-3 border-r border-border min-w-20">
              <div className="font-display text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Registered
              </div>
              <div className="font-display text-xl font-bold">{teams.length}</div>
            </div>
            <div className="px-5 py-3 border-r border-border min-w-20">
              <div className="font-display text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Assigned
              </div>
              <div className="font-display text-xl font-bold">{assignedCount}</div>
            </div>
            <div className="px-5 py-3 min-w-20">
              <div className="font-display text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Rounds
              </div>
              <div className="font-display text-xl font-bold">{totalRounds}</div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex gap-2 mt-5 flex-wrap items-center">
          {!bracketGenerated ? (
            <button
              onClick={handleGenerate}
              disabled={!allAssigned}
              className="btn btn-primary font-display text-xs uppercase tracking-wider px-4 py-2 border border-border bg-white text-black hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ⬡ Generate Bracket
            </button>
          ) : null}

          <button
            onClick={handleRandomSeed}
            disabled={seedingLocked}
            className="btn font-display text-xs uppercase tracking-wider px-4 py-2 border border-border bg-transparent text-amber-400 hover:bg-amber-950/20 disabled:opacity-30"
          >
            ⟳ Random Seed
          </button>

          <div className="w-px h-5 bg-border mx-1"></div>

          <button
            onClick={handleAutoSeed}
            disabled={seedingLocked}
            className="btn font-display text-xs uppercase tracking-wider px-4 py-2 border border-border bg-transparent text-muted-foreground hover:bg-muted/10 disabled:opacity-30"
          >
            ↓ Auto Seed
          </button>

          <button
            onClick={toggleLock}
            disabled={isPublished}
            className={`btn font-display text-xs uppercase tracking-wider px-4 py-2 border border-border ${
              seedingLocked
                ? "bg-amber-950/20 text-amber-400"
                : "bg-transparent text-muted-foreground hover:bg-muted/10"
            } disabled:opacity-30`}
          >
            {seedingLocked ? "● Seeding Locked" : "○ Lock Seeding"}
          </button>

          <div className="w-px h-5 bg-border mx-1"></div>

          <button
            onClick={handleReset}
            className="btn font-display text-xs uppercase tracking-wider px-4 py-2 border border-border bg-transparent text-red-400 hover:bg-red-950/20"
          >
            ✕ Reset
          </button>

          <button
            onClick={handlePublish}
            disabled={!canPublish || isPublished || isSaving}
            className="btn btn-primary font-display text-xs uppercase tracking-wider px-4 py-2 border border-border bg-white text-black hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving…" : "↑ Publish"}
          </button>

          <div className="ml-auto flex items-center gap-2">
            {isPublished && (
              <Badge variant="outline" className="font-tech text-[10px] uppercase tracking-wider">
                Match management active
              </Badge>
            )}
            <span
              className={`inline-block px-3 py-1 text-xs font-display uppercase tracking-wider border ${
                status === "published"
                  ? "border-white bg-white/10 text-white"
                  : status === "draft"
                    ? "border-amber-400 text-amber-400"
                    : "border-muted-foreground text-muted-foreground"
              }`}
            >
              {status === "published"
                ? "Published"
                : status === "draft"
                  ? "Draft"
                  : "Not Generated"}
            </span>
          </div>
        </div>
      </div>

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
          <div className="p-8 border-b border-border">
            <div className="flex items-center gap-3 mb-4 text-muted-foreground font-display text-sm uppercase tracking-wider">
              <span>Match Assignments — Round 1</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: firstRoundMatches }, (_, i) => {
                const teamAIdx = i * 2;
                const teamBIdx = i * 2 + 1;
                const teamA = assignments[teamAIdx];
                const teamB = assignments[teamBIdx];
                const isComplete = teamA && teamB;

                return (
                  <div
                    key={i}
                    className={`bg-card border transition-colors p-4 ${
                      isComplete
                        ? "border-amber-400/50"
                        : "border-border hover:border-border-bright"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-display text-xs uppercase tracking-wider text-muted-foreground">
                        Match {i + 1}
                      </span>
                      <span className="text-xs font-display border border-border px-2 py-1 text-muted-foreground">
                        Seed {teamAIdx + 1} – {teamBIdx + 1}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {/* Team A Select */}
                      <select
                        value={teamA?.id || ""}
                        onChange={(e) => onTeamSelect(teamAIdx, e.target.value || null)}
                        disabled={seedingLocked}
                        className="w-full bg-input border border-border text-white font-display text-sm p-2 hover:border-border-bright focus:border-gray-500 disabled:opacity-50"
                      >
                        <option value="">— Team A</option>
                        {teams.map((team) => {
                          const isUsed = assignments.some(
                            (t, idx) => idx !== teamAIdx && t?.id === team.id,
                          );
                          return (
                            <option key={team.id} value={team.id} disabled={isUsed}>
                              {team.name}
                            </option>
                          );
                        })}
                      </select>

                      <div className="text-center py-1 font-display text-xs font-bold tracking-wider text-muted-foreground">
                        VS
                      </div>

                      {/* Team B Select */}
                      <select
                        value={teamB?.id || ""}
                        onChange={(e) => onTeamSelect(teamBIdx, e.target.value || null)}
                        disabled={seedingLocked}
                        className="w-full bg-input border border-border text-white font-display text-sm p-2 hover:border-border-bright focus:border-gray-500 disabled:opacity-50"
                      >
                        <option value="">— Team B</option>
                        {teams.map((team) => {
                          const isUsed = assignments.some(
                            (t, idx) => idx !== teamBIdx && t?.id === team.id,
                          );
                          return (
                            <option key={team.id} value={team.id} disabled={isUsed}>
                              {team.name}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
              <ManagedBracketView
                matches={managedMatches}
                roundMetas={roundMetas}
                roundFormats={roundFormats}
                teams={teams}
                isDoubleElim={isDoubleElim}
                onFormatChange={handleRoundFormat}
                onScoreChange={handleMatchScore}
                onPickWinner={handlePickWinner}
              />
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
                <ValidationItem label="Team count correct" passed={assignedCount === bracketSize} />
                <ValidationItem label="Seeding complete" passed={allAssigned && bracketGenerated} />
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={handlePublish}
                disabled={!canPublish || isPublished || isSaving}
                className="btn btn-primary font-display text-xs uppercase tracking-wider px-4 py-2 border border-border bg-white text-black hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving…" : "↑ Publish Bracket"}
              </button>
            </div>
          </div>
        )}
      </div>
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
