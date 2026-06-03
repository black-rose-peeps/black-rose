import { Check, Clock, Trophy, Users } from "lucide-react";
import type { BracketMatch } from "@/features/admin/features/tournament/types/bracket-engine";

interface ProfessionalMatchCardProps {
  match: BracketMatch;
  teamOptions: string[];
  onChange: (matchId: string, update: Partial<BracketMatch>) => void;
  getAvailableTeams: (excludeMatchId?: string) => string[];
}

export function ProfessionalMatchCard({
  match: m,
  teamOptions,
  onChange,
  getAvailableTeams,
}: ProfessionalMatchCardProps) {
  const isConfirmed = m.confirmed;
  const hasTeams = m.teamA !== null && m.teamB !== null;
  const hasWinner = m.winner !== null;

  function update(patch: Partial<BracketMatch>) {
    onChange(m.matchId, { ...patch });
  }

  function handleConfirm() {
    if (!m.winner) return;
    update({ confirmed: true });
  }

  function handleUnconfirm() {
    update({ confirmed: false });
  }

  // Get available teams for each slot
  const availableTeams = getAvailableTeams(m.matchId);

  // Determine match state and styling
  const getMatchState = () => {
    if (isConfirmed) return { color: "emerald", label: "Done", icon: Check };
    if (hasWinner) return { color: "amber", label: "Set", icon: Clock };
    if (hasTeams) return { color: "blue", label: "Ready", icon: Users };
    return { color: "gray", label: "TBD", icon: Clock };
  };

  const matchState = getMatchState();

  const cardClasses = `
    match-card relative w-64 h-28 overflow-hidden rounded border ${isConfirmed ? "confirmed" : ""}
    ${
      isConfirmed
        ? "border-emerald-400/40 bg-emerald-950/20 shadow-emerald-400/10"
        : hasWinner
          ? "border-amber-400/40 bg-amber-950/20"
          : hasTeams
            ? "border-blue-400/30 bg-blue-950/15"
            : "border-white/15 bg-white/5"
    }
  `;

  return (
    <div
      className={cardClasses}
      style={{ position: "absolute", left: m.position.x, top: m.position.y }}
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-black/20 px-3 py-1.5">
        <span className="text-xs-readable font-tech font-medium text-white/70">
          M{m.matchNumber}
        </span>
        <div className="flex items-center gap-1">
          <matchState.icon
            className={`h-3 w-3 ${
              matchState.color === "emerald"
                ? "text-emerald-400"
                : matchState.color === "amber"
                  ? "text-amber-400"
                  : matchState.color === "blue"
                    ? "text-blue-400"
                    : "text-white/40"
            }`}
          />
          <span
            className={`text-xs-readable font-tech ${
              matchState.color === "emerald"
                ? "text-emerald-400"
                : matchState.color === "amber"
                  ? "text-amber-400"
                  : matchState.color === "blue"
                    ? "text-blue-400"
                    : "text-white/40"
            }`}
          >
            {matchState.label}
          </span>
        </div>
      </div>

      {/* Compact Team Rows */}
      <div className="flex flex-col h-full">
        {/* Team A */}
        <CompactTeamRow
          team={m.teamA}
          score={m.scoreA}
          isWinner={m.winner === m.teamA}
          availableTeams={availableTeams}
          disabled={isConfirmed}
          onTeamChange={(team) => update({ teamA: team || null, winner: null, confirmed: false })}
          onScoreChange={(score) => {
            const winner = resolveWinner(m.teamA, m.teamB, score, m.scoreB);
            update({ scoreA: score, winner, confirmed: false });
          }}
          onSelectWinner={() => {
            if (!isConfirmed && m.teamA) update({ winner: m.teamA, confirmed: false });
          }}
        />

        {/* Team B */}
        <CompactTeamRow
          team={m.teamB}
          score={m.scoreB}
          isWinner={m.winner === m.teamB}
          availableTeams={availableTeams}
          disabled={isConfirmed}
          onTeamChange={(team) => update({ teamB: team || null, winner: null, confirmed: false })}
          onScoreChange={(score) => {
            const winner = resolveWinner(m.teamA, m.teamB, m.scoreA, score);
            update({ scoreB: score, winner, confirmed: false });
          }}
          onSelectWinner={() => {
            if (!isConfirmed && m.teamB) update({ winner: m.teamB, confirmed: false });
          }}
        />
      </div>

      {/* Confirm Button (only show if winner selected) */}
      {hasWinner && !isConfirmed && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full px-2 py-1 text-xs-readable font-tech text-emerald-400 hover:bg-emerald-400/10 transition"
          >
            Confirm
          </button>
        </div>
      )}

      {/* Edit Button (only show if confirmed) */}
      {isConfirmed && (
        <div className="absolute bottom-0 left-0 right-0 bg-emerald-950/30">
          <button
            type="button"
            onClick={handleUnconfirm}
            className="w-full px-2 py-1 text-xs-readable font-tech text-white/50 hover:text-white/80 transition"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}

// Compact Team Row Component for smaller cards
function CompactTeamRow({
  team,
  score,
  isWinner,
  availableTeams,
  disabled,
  onTeamChange,
  onScoreChange,
  onSelectWinner,
}: {
  team: string | null;
  score: number | "";
  isWinner: boolean;
  availableTeams: string[];
  disabled: boolean;
  onTeamChange: (team: string) => void;
  onScoreChange: (score: number | "") => void;
  onSelectWinner: () => void;
}) {
  // Get display name (initials for bracket, full name for dropdown)
  const getTeamInitials = (teamName: string | null): string => {
    if (!teamName) return "";
    const words = teamName.split(" ");
    if (words.length > 1) {
      return words
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 3);
    }
    return teamName.slice(0, 3).toUpperCase();
  };

  const teamOptions = [team, ...availableTeams].filter((t, i, arr) => t && arr.indexOf(t) === i);

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 ${
        isWinner ? "bg-emerald-400/10" : "hover:bg-white/5"
      } ${disabled ? "opacity-60" : ""}`}
    >
      {/* Winner indicator */}
      <div className="flex h-4 w-4 shrink-0 items-center justify-center">
        {isWinner ? (
          <Check className="h-3 w-3 text-emerald-400" />
        ) : (
          <div
            className="h-2 w-2 rounded-full border border-white/20 cursor-pointer hover:bg-white/20 transition"
            onClick={onSelectWinner}
            title="Set as winner"
          />
        )}
      </div>

      {/* Team display/selector */}
      <div className="flex-1 relative">
        {disabled || team ? (
          // Show team initials when disabled (confirmed) or when team is selected
          <div
            className={`text-xs-readable font-bold px-2 py-1 ${
              disabled ? "text-white" : "text-white cursor-pointer hover:bg-white/10"
            }`}
            onClick={() => !disabled && onTeamChange("")}
            title={disabled ? team || "No team" : `Click to change team (${team})`}
          >
            {getTeamInitials(team) || "TBD"}
          </div>
        ) : (
          // Show dropdown when editable and no team selected
          <select
            value={team || ""}
            onChange={(e) => onTeamChange(e.target.value)}
            className="w-full appearance-none bg-transparent border-none text-xs-readable text-white outline-none cursor-pointer hover:bg-white/5"
            title="Select team"
          >
            <option value="" className="bg-gray-800">
              Select Team
            </option>
            {teamOptions.map((t) =>
              t ? (
                <option key={t} value={t} className="bg-gray-800">
                  {t}
                </option>
              ) : null,
            )}
          </select>
        )}
      </div>

      {/* Score */}
      <input
        type="number"
        min={0}
        max={99}
        value={score}
        onChange={(e) => {
          const v = e.target.value;
          onScoreChange(v === "" ? "" : Number(v));
        }}
        disabled={disabled || !team}
        placeholder="0"
        className="w-8 text-center text-xs-readable bg-white/5 border border-white/20 rounded px-1 py-0.5 text-white outline-none disabled:opacity-40"
      />
    </div>
  );
}

// Helper Functions
function resolveWinner(
  teamA: string | null,
  teamB: string | null,
  scoreA: number | "",
  scoreB: number | "",
): string | null {
  if (!teamA || !teamB || scoreA === "" || scoreB === "") return null;
  if (Number(scoreA) > Number(scoreB)) return teamA;
  if (Number(scoreB) > Number(scoreA)) return teamB;
  return null; // draw — admin picks manually
}
