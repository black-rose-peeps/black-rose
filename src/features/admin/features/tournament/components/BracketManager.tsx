import { useState, useMemo } from "react";
import { BracketEngine } from "../types/bracket-engine";
import type { BracketStatus } from "../../../types";
import type { BracketRound, TournamentTeam } from "@/features/tournaments/types";

interface BracketManagerProps {
  tournamentId: string;
  tournamentName: string;
  format: string;
  teams: TournamentTeam[];
  initialBracket: BracketRound[];
}

export function BracketManager({ tournamentName, format, teams }: BracketManagerProps) {
  // Initialize bracket engine with team names
  const bracketEngine = useMemo(() => {
    const teamNames = teams.map((t) => t.name);
    return new BracketEngine(teamNames);
  }, [teams]);

  const [status, setStatus] = useState<BracketStatus>("not_generated");
  const [activeTab, setActiveTab] = useState<"seeding" | "bracket" | "validation">("seeding");
  const [bracketGenerated, setBracketGenerated] = useState(false);
  const [bracketLocked, setBracketLocked] = useState(false);
  const [assignments, setAssignments] = useState<Array<TournamentTeam | null>>(
    Array(16).fill(null),
  );

  const validation = bracketEngine.validateBracketIntegrity();
  const assignedCount = assignments.filter(Boolean).length;
  const allAssigned = assignments.filter(Boolean).length === 16;
  const canPublish = status === "draft" && validation.canPublish && bracketGenerated && allAssigned;

  function handleGenerate() {
    if (!allAssigned) {
      alert("Assign all 16 teams before generating.");
      setActiveTab("seeding");
      return;
    }

    // Auto-seed teams into the bracket engine
    const teamNames = assignments.filter(Boolean).map((t) => t!.name);
    bracketEngine.autoSeed(teamNames);
    setBracketGenerated(true);
    setStatus("draft");
    setActiveTab("bracket");
  }

  function handleAutoSeed() {
    if (bracketLocked) return;
    const newAssignments: Array<TournamentTeam | null> = [...teams.slice(0, 16)];
    while (newAssignments.length < 16) {
      newAssignments.push(null);
    }
    setAssignments(newAssignments);
  }

  function handleRandomSeed() {
    if (bracketLocked) return;
    const shuffled = [...teams].sort(() => Math.random() - 0.5).slice(0, 16);
    const newAssignments: Array<TournamentTeam | null> = [...shuffled];
    while (newAssignments.length < 16) {
      newAssignments.push(null);
    }
    setAssignments(newAssignments);
  }
  function handleReset() {
    if (bracketLocked) {
      alert("Unlock bracket first.");
      return;
    }
    if (!confirm("Reset the bracket? All results will be lost.")) return;

    setAssignments(Array(16).fill(null));
    setBracketGenerated(false);
    setStatus("not_generated");
    bracketEngine.reset();
    setActiveTab("seeding");
  }

  function toggleLock() {
    setBracketLocked(!bracketLocked);
  }

  function handlePublish() {
    if (!canPublish) {
      alert("Complete all requirements first.");
      return;
    }
    setStatus("published");
    alert(`Bracket published for ${tournamentName}!`);
  }

  function onTeamSelect(slotIdx: number, teamId: string | null) {
    if (bracketLocked) return;

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
      // Update bracket engine if bracket is already generated
      const teamNames = newAssignments.filter(Boolean).map((t) => t!.name);
      if (teamNames.length === 16) {
        bracketEngine.autoSeed(teamNames);
      }
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
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
              <div className="font-display text-xl font-bold">SE</div>
            </div>
            <div className="px-5 py-3 border-r border-border min-w-20">
              <div className="font-display text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Teams
              </div>
              <div className="font-display text-xl font-bold text-amber-400">16</div>
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
              <div className="font-display text-xl font-bold">4</div>
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
            disabled={bracketLocked}
            className="btn font-display text-xs uppercase tracking-wider px-4 py-2 border border-border bg-transparent text-amber-400 hover:bg-amber-950/20 disabled:opacity-30"
          >
            ⟳ Random Seed
          </button>

          <div className="w-px h-5 bg-border mx-1"></div>

          <button
            onClick={handleAutoSeed}
            disabled={bracketLocked}
            className="btn font-display text-xs uppercase tracking-wider px-4 py-2 border border-border bg-transparent text-muted-foreground hover:bg-muted/10 disabled:opacity-30"
          >
            ↓ Auto Seed
          </button>

          <button
            onClick={toggleLock}
            className={`btn font-display text-xs uppercase tracking-wider px-4 py-2 border border-border ${
              bracketLocked
                ? "bg-amber-950/20 text-amber-400"
                : "bg-transparent text-muted-foreground hover:bg-muted/10"
            }`}
          >
            {bracketLocked ? "● Unlock Bracket" : "○ Lock Bracket"}
          </button>

          <div className="w-px h-5 bg-border mx-1"></div>

          <button
            onClick={handleReset}
            disabled={bracketLocked}
            className="btn font-display text-xs uppercase tracking-wider px-4 py-2 border border-border bg-transparent text-red-400 hover:bg-red-950/20 disabled:opacity-30"
          >
            ✕ Reset
          </button>

          <button
            onClick={handlePublish}
            disabled={!canPublish}
            className="btn btn-primary font-display text-xs uppercase tracking-wider px-4 py-2 border border-border bg-white text-black hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↑ Publish
          </button>

          <div className="ml-auto">
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
          Bracket Preview
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
              {Array.from({ length: 8 }, (_, i) => {
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
                        disabled={bracketLocked}
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
                        disabled={bracketLocked}
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
                <span>Bracket Preview</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>
              <button
                onClick={() => setActiveTab("seeding")}
                className="btn font-display text-xs uppercase tracking-wider px-4 py-2 border border-border bg-transparent text-muted-foreground hover:bg-muted/10"
              >
                ← Back to Seeding
              </button>
            </div>

            {!bracketGenerated ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-4xl text-border mb-2">⬡</div>
                <div className="font-display text-lg uppercase tracking-wider text-muted-foreground mb-2">
                  No Bracket Generated
                </div>
                <div className="text-sm text-muted-foreground max-w-80">
                  Assign all teams in the seeding panel, then click Generate Bracket to preview the
                  structure.
                </div>
              </div>
            ) : (
              <BracketPreview assignments={assignments} />
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
                <ValidationItem label="Team count correct" passed={assignedCount === 16} />
                <ValidationItem label="Seeding complete" passed={allAssigned && bracketGenerated} />
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={handlePublish}
                disabled={!canPublish}
                className="btn btn-primary font-display text-xs uppercase tracking-wider px-4 py-2 border border-border bg-white text-black hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ↑ Publish Bracket
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
// Supporting components
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

function BracketPreview({ assignments }: { assignments: Array<TournamentTeam | null> }) {
  const CARD_W = 200;
  const CARD_H = 88;
  const ROUND_GAP = 60;
  const MATCH_GAP = 20;
  const PAD_V = 24;

  const rounds = [
    { label: "Round 1", matches: 8 },
    { label: "Round 2", matches: 4 },
    { label: "Semifinals", matches: 2 },
    { label: "Final", matches: 1 },
  ];

  const totalR1H = rounds[0].matches * CARD_H + (rounds[0].matches - 1) * MATCH_GAP + PAD_V * 2;
  const totalW = rounds.length * (CARD_W + ROUND_GAP) + 40;

  function getTeamColor(team: TournamentTeam | null): { bg: string; color: string; abbr: string } {
    if (!team) return { bg: "#1a1a1a", color: "#333", abbr: "-" };

    // Generate colors based on team name hash for consistency
    const hash = team.name.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    const colors = [
      { bg: "#7c3aed20", color: "#7c3aed" },
      { bg: "#dc262620", color: "#dc2626" },
      { bg: "#6b728020", color: "#6b7280" },
      { bg: "#1d4ed820", color: "#1d4ed8" },
      { bg: "#05966920", color: "#059669" },
      { bg: "#d9770620", color: "#d97706" },
      { bg: "#db277720", color: "#db2777" },
      { bg: "#0891b220", color: "#0891b2" },
    ];

    const colorIndex = Math.abs(hash) % colors.length;
    const selectedColor = colors[colorIndex];

    // Create abbreviation from team name
    const words = team.name.split(" ");
    const abbr =
      words.length > 1
        ? words
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : team.name.slice(0, 2).toUpperCase();

    return { ...selectedColor, abbr };
  }
  function renderBracketTeam(team: TournamentTeam | null, seed?: number) {
    const { bg, color, abbr } = getTeamColor(team);

    if (!team) {
      return (
        <div className="flex items-center py-2 px-3 border-b border-border last:border-0 min-h-8">
          <span className="font-display text-xs font-bold text-muted-foreground w-4 text-center">
            {seed || "?"}
          </span>
          <span
            className="w-5 h-5 mx-2 flex items-center justify-center text-xs font-bold"
            style={{ background: "#1a1a1a", color: "#333" }}
          >
            -
          </span>
          <span className="font-display text-sm text-muted-foreground flex-1">TBD</span>
          <span className="font-display text-sm font-bold text-muted-foreground">-</span>
        </div>
      );
    }

    return (
      <div className="flex items-center py-2 px-3 border-b border-border last:border-0 min-h-8">
        <span className="font-display text-xs font-bold text-muted-foreground w-4 text-center">
          {seed}
        </span>
        <span
          className="w-5 h-5 mx-2 flex items-center justify-center text-xs font-bold rounded-sm"
          style={{ background: bg, color }}
        >
          {abbr}
        </span>
        <span className="font-display text-sm font-medium flex-1 truncate">{team.name}</span>
        <span className="font-display text-sm font-bold text-muted-foreground">-</span>
      </div>
    );
  }

  return (
    <div className="custom-scrollbar overflow-auto pb-4">
      <div
        className="relative min-w-full"
        style={{
          width: `${totalW}px`,
          height: `${totalR1H}px`,
          minHeight: "400px",
        }}
      >
        {/* Round Headers */}
        {rounds.map((round, ri) => {
          const x = ri * (CARD_W + ROUND_GAP) + 20;
          return (
            <div
              key={ri}
              className="absolute top-0 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground py-2 border-b border-border"
              style={{ left: `${x}px`, width: `${CARD_W}px` }}
            >
              {round.label}
            </div>
          );
        })}

        {/* Round 1 Matches */}
        {Array.from({ length: 8 }, (_, i) => {
          const teamAIdx = i * 2;
          const teamBIdx = i * 2 + 1;
          const teamA = assignments[teamAIdx];
          const teamB = assignments[teamBIdx];

          const x = 20;
          const y = PAD_V + 28 + i * (CARD_H + MATCH_GAP);

          return (
            <div
              key={i}
              className="absolute bg-card border border-border"
              style={{ left: `${x}px`, top: `${y}px`, width: `${CARD_W}px` }}
            >
              <div className="flex justify-between items-center px-3 py-1 border-b border-border">
                <span className="font-display text-xs uppercase tracking-wider text-muted-foreground">
                  Match {i + 1}
                </span>
                <span className="font-display text-xs uppercase text-muted-foreground">
                  {teamA && teamB ? "READY" : "TBD"}
                </span>
              </div>
              {renderBracketTeam(teamA, teamAIdx + 1)}
              {renderBracketTeam(teamB, teamBIdx + 1)}
            </div>
          );
        })}

        {/* Placeholder matches for other rounds */}
        {rounds.slice(1).map((round, ri) => {
          const actualRoundIndex = ri + 1;
          const x = actualRoundIndex * (CARD_W + ROUND_GAP) + 20;

          return Array.from({ length: round.matches }, (_, mi) => {
            const matchesInRound = round.matches;
            const spacing =
              matchesInRound > 1 ? (totalR1H - PAD_V * 2 - CARD_H) / (matchesInRound - 1) : 0;
            const y =
              PAD_V +
              28 +
              (matchesInRound === 1 ? (totalR1H - PAD_V * 2 - CARD_H) / 2 : mi * spacing);

            return (
              <div
                key={`${actualRoundIndex}-${mi}`}
                className="absolute bg-card border border-border"
                style={{ left: `${x}px`, top: `${y}px`, width: `${CARD_W}px` }}
              >
                <div className="flex justify-between items-center px-3 py-1 border-b border-border">
                  <span className="font-display text-xs uppercase tracking-wider text-muted-foreground">
                    {round.label} {round.matches > 1 ? mi + 1 : ""}
                  </span>
                  <span className="font-display text-xs uppercase text-muted-foreground">TBD</span>
                </div>
                {renderBracketTeam(null)}
                {renderBracketTeam(null)}
              </div>
            );
          });
        })}

        {/* Connection Lines (simplified) */}
        <svg
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        >
          {/* Add basic connection lines here if needed */}
        </svg>
      </div>
    </div>
  );
}
