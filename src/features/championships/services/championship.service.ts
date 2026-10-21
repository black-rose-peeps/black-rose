import {
  fetchBracketState,
  type PersistedBracketPayload,
} from "@/features/admin/features/tournament-details/services/bracket.service";
import {
  fetchChampionshipRegistrations,
  type ChampionshipRegistration,
} from "./championship-registration.service";
import {
  fetchActiveMemberTeamsCached,
  fetchTeamRegistrationsCached,
  fetchTournamentsLiteCached,
} from "@/features/member/queries/member-data-queries";
import type { Team } from "@/features/teams/types";
import {
  DEFAULT_PRIZE_TIERS,
  buildPodiumPlacements,
  deriveManagedPlacements,
  derivePublicPlacements,
  type TournamentPlacement,
} from "@/features/tournaments/utils/tournament-placements";
import { resolveStoredGrandFinalMode } from "@/features/admin/features/tournament-details/utils/grand-final";

import type { MockTeam, MockTournament } from "@/lib/mock-data";
import type { ChampionshipTitle } from "../types";

const CHAMPION_ELIGIBLE_STATUSES = new Set<MockTeam["status"]>(["Approved", "Previously Competed"]);

function isConcluded(status: MockTournament["status"]): boolean {
  return status === "Completed" || status === "Archived";
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function championFromPlacements(placements: TournamentPlacement[]): string | null {
  const first = placements.find((p) => p.rank === 1 && p.team?.trim());
  if (first?.team) return first.team;

  const labeled = placements.find((p) => /champion/i.test(p.label) && p.team?.trim());
  return labeled?.team ?? null;
}

function resolvePrizeTiers(
  tournament: MockTournament,
  payload: PersistedBracketPayload,
): typeof DEFAULT_PRIZE_TIERS {
  if (payload.prizeBreakdown?.length) return payload.prizeBreakdown;
  if (tournament.prizeBreakdown?.length) return tournament.prizeBreakdown;
  return DEFAULT_PRIZE_TIERS;
}

/** Same derivation path as the public tournament results page. */
function resolveChampionPlacements(
  tournament: MockTournament,
  payload: PersistedBracketPayload,
): TournamentPlacement[] {
  const stored = payload.placements ?? [];
  if (championFromPlacements(stored)) return stored;

  const prizeTiers = resolvePrizeTiers(tournament, payload);

  if (payload.admin?.managedMatches?.length) {
    const raw = deriveManagedPlacements(
      tournament.format,
      payload.admin.managedMatches,
      payload.admin.swiss,
      undefined,
      resolveStoredGrandFinalMode(
        payload.admin.roundMetas?.map((meta) => meta.id) ?? [],
        payload.admin.grandFinalMode,
      ),
    );
    const podiums = buildPodiumPlacements(prizeTiers, raw);
    if (championFromPlacements(podiums)) return podiums;
    if (championFromPlacements(raw)) return raw;
  }

  if (payload.rounds?.length) {
    const raw = derivePublicPlacements(tournament.format, payload.rounds);
    const podiums = buildPodiumPlacements(prizeTiers, raw);
    if (championFromPlacements(podiums)) return podiums;
    if (championFromPlacements(raw)) return raw;
  }

  return stored;
}

function resolveChampionNameFromMatches(payload: PersistedBracketPayload): string | null {
  const matches = payload.admin?.managedMatches ?? [];
  if (!matches.length) return null;

  const decided = matches.filter((m) => m.winner);
  const grand = decided.find((m) => m.bracketSide === "grand");
  if (grand?.winner) return grand.winner;

  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const match = matches[i];
    if (match.winner && match.teamA && match.teamB) return match.winner;
  }

  return null;
}

function resolveChampionName(
  tournament: MockTournament,
  payload: PersistedBracketPayload,
): string | null {
  const fromPlacements = championFromPlacements(resolveChampionPlacements(tournament, payload));
  if (fromPlacements) return fromPlacements;
  return resolveChampionNameFromMatches(payload);
}

function payloadHasChampionData(payload: PersistedBracketPayload): boolean {
  if (payload.placements?.some((p) => p.rank === 1 && p.team?.trim())) return true;
  if (payload.admin?.managedMatches?.some((m) => m.winner)) return true;
  return payload.rounds?.some((round) => round.matches?.some((m) => m.winner)) ?? false;
}

async function fetchBracketPayload(tournamentId: string): Promise<PersistedBracketPayload | null> {
  const state = await fetchBracketState(tournamentId).catch(() => null);
  const payload = state?.payload ?? null;
  if (!payload || !payloadHasChampionData(payload)) return null;
  return payload;
}

function teamMatchesChampion(championName: string, teamName: string, teamTag: string): boolean {
  const champion = normalizeName(championName);
  const name = normalizeName(teamName);
  const tag = normalizeName(teamTag);
  if (!champion || !name) return false;

  if (champion === name) return true;
  if (tag && champion === tag) return true;
  if (tag && champion === normalizeName(`${teamName} [${teamTag}]`)) return true;
  if (tag && champion === normalizeName(`[${teamTag}] ${teamName}`)) return true;
  if (tag && champion === normalizeName(`${name} ${tag}`)) return true;
  if (tag && champion.includes(name) && champion.includes(tag)) return true;

  const withoutTagPrefix = champion.replace(/^\[[^\]]+\]\s*/, "");
  if (withoutTagPrefix === name) return true;

  return false;
}

function registrationWonChampionship(
  registration: MockTeam,
  tournament: MockTournament,
  payload: PersistedBracketPayload,
  tournamentRegs: ChampionshipRegistration[],
  liveTeamsById?: Map<string, Team>,
): boolean {
  const championName = resolveChampionName(tournament, payload);
  if (!championName) return false;

  if (teamMatchesChampion(championName, registration.name, registration.tag)) return true;

  const championReg = tournamentRegs.find((row) => {
    if (teamMatchesChampion(championName, row.name, row.tag)) return true;
    const live = row.rosterTeamId ? liveTeamsById?.get(row.rosterTeamId) : undefined;
    return !!live && teamMatchesChampion(championName, live.name, live.tag);
  });
  if (!championReg) return false;

  if (championReg.id === registration.id) return true;

  return (
    !!registration.rosterTeamId &&
    !!championReg.rosterTeamId &&
    championReg.rosterTeamId === registration.rosterTeamId
  );
}

export interface ChampionshipReadOptions {
  teams?: Team[];
  tournaments?: MockTournament[];
}

/** Promise maps belong to one operation, including overlapping team reads. */
async function createChampionshipReadContext(options: ChampionshipReadOptions = {}) {
  const tournaments = options.tournaments ?? (await fetchTournamentsLiteCached());
  const tournamentById = new Map(tournaments.map((tournament) => [tournament.id, tournament]));
  const liveTeamsById = options.teams
    ? new Map(options.teams.map((team) => [team.id, team]))
    : undefined;
  const brackets = new Map<string, Promise<PersistedBracketPayload | null>>();
  const tournamentRegistrations = new Map<string, Promise<ChampionshipRegistration[]>>();

  return {
    tournamentById,
    liveTeamsById,
    registrations: (teamId: string) =>
      fetchTeamRegistrationsCached(teamId, {
        tournaments,
        liveTeamsById,
      }),
    bracket(tournamentId: string) {
      let pending = brackets.get(tournamentId);
      if (!pending) {
        pending = fetchBracketPayload(tournamentId);
        brackets.set(tournamentId, pending);
      }
      return pending;
    },
    tournamentRegistrations(tournamentId: string) {
      let pending = tournamentRegistrations.get(tournamentId);
      if (!pending) {
        pending = fetchChampionshipRegistrations(tournamentId).catch(() => []);
        tournamentRegistrations.set(tournamentId, pending);
      }
      return pending;
    },
  };
}

type ChampionshipReadContext = Awaited<ReturnType<typeof createChampionshipReadContext>>;

async function fetchTeamChampionshipsFromContext(
  teamId: string,
  context: ChampionshipReadContext,
): Promise<ChampionshipTitle[]> {
  const registrations = await context.registrations(teamId);
  const titles: ChampionshipTitle[] = [];

  await Promise.all(
    registrations.map(async (registration) => {
      if (!CHAMPION_ELIGIBLE_STATUSES.has(registration.status)) return;

      const tournament = context.tournamentById.get(registration.tournamentId);
      if (!tournament || !isConcluded(tournament.status)) return;

      const payload = await context.bracket(tournament.id);
      if (!payload) return;

      const tournamentRegs = await context.tournamentRegistrations(tournament.id);
      const won = registrationWonChampionship(
        registration,
        tournament,
        payload,
        tournamentRegs,
        context.liveTeamsById,
      );
      if (!won) return;

      titles.push({
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        game: tournament.game,
        teamId,
        teamName: registration.name,
        teamTag: registration.tag,
        concludedAt: tournament.startDate,
      });
    }),
  );

  titles.sort((a, b) => new Date(b.concludedAt).getTime() - new Date(a.concludedAt).getTime());
  return titles;
}

export async function fetchTeamChampionships(
  teamId: string,
  options: ChampionshipReadOptions = {},
): Promise<ChampionshipTitle[]> {
  return fetchTeamChampionshipsFromContext(teamId, await createChampionshipReadContext(options));
}

export async function fetchMemberChampionships(memberId: string): Promise<ChampionshipTitle[]> {
  const activeTeams = await fetchActiveMemberTeamsCached(memberId);
  if (!activeTeams.length) return [];

  const context = await createChampionshipReadContext({ teams: activeTeams });
  const allTitles = await Promise.all(
    activeTeams.map((team) => fetchTeamChampionshipsFromContext(team.id, context)),
  );

  const seen = new Set<string>();
  const merged: ChampionshipTitle[] = [];
  for (const titles of allTitles) {
    for (const title of titles) {
      const key = `${title.tournamentId}-${title.teamId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(title);
    }
  }

  merged.sort((a, b) => new Date(b.concludedAt).getTime() - new Date(a.concludedAt).getTime());
  return merged;
}

export async function fetchTeamsChampionshipMap(
  teamIds: string[],
  options: ChampionshipReadOptions = {},
): Promise<Map<string, ChampionshipTitle[]>> {
  if (!teamIds.length) return new Map();
  const context = await createChampionshipReadContext(options);
  const entries = await Promise.all(
    [...new Set(teamIds)].map(
      async (teamId) => [teamId, await fetchTeamChampionshipsFromContext(teamId, context)] as const,
    ),
  );

  const map = new Map<string, ChampionshipTitle[]>();
  for (const [teamId, titles] of entries) {
    if (titles.length) map.set(teamId, titles);
  }
  return map;
}
