import { isDoubleEliminationFormat } from "../constants/formats";
import type { BracketRound } from "../types";
import type { TournamentPlacement } from "./tournament-placements";
import type { ManagedMatch } from "@/features/admin/features/tournament-details/utils/managed-bracket";
import { publicToLayoutMatches } from "./bracket-connectors";
import { buildLayoutHiddenSet } from "./bracket-layout-visibility";
import {
  assignDenseGroupRanks,
  matchResultsSignature,
} from "./competition-ranks";

export type TeamStandingStatus = "active" | "eliminated" | "advanced" | "champion";

export interface TeamMatchHistoryEntry {
  roundLabel: string;
  matchLabel?: string;
  opponent: string | null;
  result: "W" | "L" | "Bye";
  score?: string;
  sortKey: number;
}

export interface EliminationStandingEntry {
  team: string;
  wins: number;
  losses: number;
  rank: number;
  status: TeamStandingStatus;
  placement?: number;
  placementLabel?: string;
  matchHistory: TeamMatchHistoryEntry[];
}

export interface TeamStandingsSnapshot {
  eliminationStandings?: EliminationStandingEntry[];
  hasBracketData: boolean;
}

interface FlatMatch {
  id: string;
  roundLabel: string;
  matchLabel?: string;
  teamA: string | null;
  teamB: string | null;
  winner?: string | null;
  scoreA?: number;
  scoreB?: number;
  sortKey: number;
  confirmed?: boolean;
}

/** Protected-seed / round-one bye slots — not a played match. */
function isStructuralByeMatch(match: FlatMatch): boolean {
  if (match.matchLabel && /^Seed \d+ · protected$/i.test(match.matchLabel)) return true;

  const teamA = match.teamA?.trim() || null;
  const teamB = match.teamB?.trim() || null;
  const hasWinner = Boolean(match.winner?.trim());

  return hasWinner && ((!teamA && teamB) || (teamA && !teamB));
}

function isPlayedStandingsMatch(match: FlatMatch, hiddenMatchIds: Set<string>): boolean {
  if (!match.winner?.trim()) return false;
  if (match.confirmed === false) return false;
  if (hiddenMatchIds.has(match.id)) return false;
  if (isStructuralByeMatch(match)) return false;

  const teamA = match.teamA?.trim() || null;
  const teamB = match.teamB?.trim() || null;
  return Boolean(teamA && teamB);
}

function buildHiddenMatchIdsFromRounds(rounds: BracketRound[]): Set<string> {
  const layoutMatches = publicToLayoutMatches(rounds);
  return buildLayoutHiddenSet(layoutMatches);
}

function formatScore(scoreA?: number, scoreB?: number): string | undefined {
  if (scoreA === undefined || scoreB === undefined) return undefined;
  return `${scoreA}-${scoreB}`;
}

function flattenPublicMatches(rounds: BracketRound[]): FlatMatch[] {
  const matches: FlatMatch[] = [];
  rounds.forEach((round, roundIndex) => {
    round.matches.forEach((match, matchIndex) => {
      matches.push({
        id: match.id,
        roundLabel: round.label,
        matchLabel: match.label,
        teamA: match.teamA,
        teamB: match.teamB,
        winner: match.winner,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        sortKey: roundIndex * 1000 + matchIndex,
      });
    });
  });
  return matches;
}

function flattenManagedMatches(matches: ManagedMatch[]): FlatMatch[] {
  return matches.map((match, index) => ({
    id: match.id,
    roundLabel: match.roundLabel,
    matchLabel: match.label,
    teamA: match.teamA,
    teamB: match.teamB,
    winner: match.confirmed ? match.winner : null,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    sortKey: index,
    confirmed: match.confirmed,
  }));
}

function collectTeams(registeredTeams: string[], matches: FlatMatch[]): string[] {
  const teams = new Set(registeredTeams);
  for (const match of matches) {
    if (match.teamA) teams.add(match.teamA);
    if (match.teamB) teams.add(match.teamB);
  }
  return [...teams];
}

function teamsInPendingMatches(
  matches: FlatMatch[],
  hiddenMatchIds: Set<string>,
): Set<string> {
  const pending = new Set<string>();
  for (const match of matches) {
    if (hiddenMatchIds.has(match.id)) continue;
    if (match.winner) continue;
    if (match.teamA) pending.add(match.teamA);
    if (match.teamB) pending.add(match.teamB);
  }
  return pending;
}

function buildMatchHistoryForTeam(
  team: string,
  matches: FlatMatch[],
  hiddenMatchIds: Set<string>,
): TeamMatchHistoryEntry[] {
  const history: TeamMatchHistoryEntry[] = [];

  for (const match of matches) {
    const isTeamA = match.teamA === team;
    const isTeamB = match.teamB === team;
    if (!isTeamA && !isTeamB) continue;
    if (!isPlayedStandingsMatch(match, hiddenMatchIds)) continue;

    const opponent = isTeamA ? match.teamB : match.teamA;
    const won = match.winner === team;
    const score =
      match.scoreA !== undefined && match.scoreB !== undefined
        ? won
          ? isTeamA
            ? `${match.scoreA}-${match.scoreB}`
            : `${match.scoreB}-${match.scoreA}`
          : isTeamA
            ? `${match.scoreA}-${match.scoreB}`
            : `${match.scoreB}-${match.scoreA}`
        : undefined;

    history.push({
      roundLabel: match.roundLabel,
      matchLabel: match.matchLabel,
      opponent,
      result: won ? "W" : "L",
      score,
      sortKey: match.sortKey,
    });
  }

  return history.sort((a, b) => a.sortKey - b.sortKey);
}

function resolveEliminationStatus(
  team: string,
  wins: number,
  losses: number,
  pendingTeams: Set<string>,
  placement?: TournamentPlacement,
): TeamStandingStatus {
  if (placement?.rank === 1) return "champion";
  if (pendingTeams.has(team)) return "active";
  if (losses > 0 || wins > 0) return "eliminated";
  return "active";
}

function matchHistorySignature(history: TeamMatchHistoryEntry[]): string {
  return matchResultsSignature(history.map((entry) => entry.result));
}

function eliminationStandingsTieKey(entry: EliminationStandingEntry): string {
  if (entry.placement != null) return `placement:${entry.placement}`;
  return `${entry.wins}|${entry.losses}`;
}

function sortEliminationStandings(
  entries: EliminationStandingEntry[],
  seedByTeam?: Map<string, number>,
): EliminationStandingEntry[] {
  const sorted = [...entries].sort((a, b) => {
    const aPlaced = a.placement ?? Number.POSITIVE_INFINITY;
    const bPlaced = b.placement ?? Number.POSITIVE_INFINITY;
    if (aPlaced !== bPlaced) return aPlaced - bPlaced;

    const statusRank = (status: TeamStandingStatus) => {
      if (status === "champion") return 0;
      if (status === "active") return 1;
      if (status === "advanced") return 2;
      return 3;
    };
    const statusDiff = statusRank(a.status) - statusRank(b.status);
    if (statusDiff !== 0) return statusDiff;

    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.losses !== b.losses) return a.losses - b.losses;

    const historyDiff = matchHistorySignature(a.matchHistory).localeCompare(
      matchHistorySignature(b.matchHistory),
    );
    if (historyDiff !== 0) return historyDiff;

    const seedA = seedByTeam?.get(a.team) ?? Number.POSITIVE_INFINITY;
    const seedB = seedByTeam?.get(b.team) ?? Number.POSITIVE_INFINITY;
    if (seedA !== seedB) return seedA - seedB;

    return a.team.localeCompare(b.team);
  });

  return assignDenseGroupRanks(sorted, eliminationStandingsTieKey);
}

function computeEliminationStandings(
  matches: FlatMatch[],
  registeredTeams: string[],
  options?: {
    seedByTeam?: Map<string, number>;
    placements?: TournamentPlacement[];
    hiddenMatchIds?: Set<string>;
  },
): EliminationStandingEntry[] {
  const hiddenMatchIds = options?.hiddenMatchIds ?? new Set<string>();
  const teams = collectTeams(registeredTeams, matches);
  const pendingTeams = teamsInPendingMatches(matches, hiddenMatchIds);
  const placementByTeam = new Map(
    (options?.placements ?? []).map((placement) => [placement.team, placement]),
  );

  const entries = teams.map((team) => {
    const history = buildMatchHistoryForTeam(team, matches, hiddenMatchIds);
    const wins = history.filter((entry) => entry.result === "W" || entry.result === "Bye").length;
    const losses = history.filter((entry) => entry.result === "L").length;
    const placement = placementByTeam.get(team);

    return {
      team,
      wins,
      losses,
      rank: 0,
      status: resolveEliminationStatus(team, wins, losses, pendingTeams, placement),
      placement: placement?.rank,
      placementLabel: placement?.label,
      matchHistory: history,
    };
  });

  return sortEliminationStandings(entries, options?.seedByTeam);
}

export function computeEliminationStandingsFromBracket(
  rounds: BracketRound[],
  registeredTeams: string[],
  options?: {
    seedByTeam?: Map<string, number>;
    placements?: TournamentPlacement[];
  },
): EliminationStandingEntry[] {
  const hiddenMatchIds = buildHiddenMatchIdsFromRounds(rounds);
  return computeEliminationStandings(flattenPublicMatches(rounds), registeredTeams, {
    ...options,
    hiddenMatchIds,
  });
}

export function computeEliminationStandingsFromManaged(
  matches: ManagedMatch[],
  registeredTeams: string[],
  roundMetas: Array<{ id: string }>,
  options?: {
    seedByTeam?: Map<string, number>;
    placements?: TournamentPlacement[];
  },
): EliminationStandingEntry[] {
  const layoutMatches = matches.map((match, index) => ({
    id: match.id,
    roundId: match.roundId,
    roundIndex:
      roundMetas.findIndex((round) => round.id === match.roundId) >= 0
        ? roundMetas.findIndex((round) => round.id === match.roundId)
        : index,
    nextWinnerMatchId: match.winnerNext?.matchId ?? null,
    connectorStatus: "upcoming" as const,
    teamA: match.teamA,
    teamB: match.teamB,
    confirmed: match.confirmed,
    winner: match.winner,
  }));
  const hiddenMatchIds = buildLayoutHiddenSet(layoutMatches);

  return computeEliminationStandings(flattenManagedMatches(matches), registeredTeams, {
    ...options,
    hiddenMatchIds,
  });
}

export function buildTeamStandingsSnapshot(options: {
  bracket: BracketRound[];
  teamNames: string[];
  seedByTeam?: Map<string, number>;
  placements?: TournamentPlacement[];
}): TeamStandingsSnapshot {
  const { bracket, teamNames, seedByTeam, placements } = options;
  const hasBracketData = bracket.some((round) => round.matches.length > 0);

  if (!hasBracketData) {
    return { hasBracketData: false };
  }

  return {
    hasBracketData: true,
    eliminationStandings: computeEliminationStandingsFromBracket(bracket, teamNames, {
      seedByTeam,
      placements,
    }),
  };
}

export function summarizeMatchHistory(history: TeamMatchHistoryEntry[]): string {
  if (history.length === 0) return "—";
  return history.map((entry) => entry.result).join(" ");
}

export function isDoubleElimFormat(format: string): boolean {
  return isDoubleEliminationFormat(format);
}
