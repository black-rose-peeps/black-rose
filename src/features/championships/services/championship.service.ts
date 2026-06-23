import {
  fetchBracketState,
  type PersistedBracketPayload,
} from "@/features/admin/features/tournament-details/services/bracket.service";
import { fetchTournamentRegistrations } from "@/features/admin/features/tournaments/services/tournament-registrations.service";
import { fetchTournaments } from "@/features/admin/features/tournaments/services/tournaments.service";
import { fetchTeamsForUser } from "@/features/admin/features/teams/services/teams.service";
import { fetchRegistrationsForTeam } from "@/features/tournaments/services/team-registration.service";
import {
  DEFAULT_PRIZE_TIERS,
  buildPodiumPlacements,
  deriveManagedPlacements,
  derivePublicPlacements,
  type TournamentPlacement,
} from "@/features/tournaments/utils/tournament-placements";
import { resolveStoredGrandFinalMode } from "@/features/admin/features/tournament-details/utils/grand-final";
import { isActiveMember } from "@/features/teams/utils/membership";
import type { MockTeam, MockTournament } from "@/lib/mock-data";
import type { ChampionshipTitle } from "../types";

const CHAMPION_ELIGIBLE_STATUSES = new Set<MockTeam["status"]>([
  "Approved",
  "Previously Competed",
]);

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

function resolveChampionNameFromMatches(
  payload: PersistedBracketPayload,
): string | null {
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
  const fromPlacements = championFromPlacements(
    resolveChampionPlacements(tournament, payload),
  );
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

function teamMatchesChampion(
  championName: string,
  teamName: string,
  teamTag: string,
): boolean {
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
  tournamentRegs: MockTeam[],
): boolean {
  const championName = resolveChampionName(tournament, payload);
  if (!championName) return false;

  if (teamMatchesChampion(championName, registration.name, registration.tag)) return true;

  const championReg = tournamentRegs.find((row) =>
    teamMatchesChampion(championName, row.name, row.tag),
  );
  if (!championReg) return false;

  if (championReg.id === registration.id) return true;

  return (
    !!registration.rosterTeamId &&
    !!championReg.rosterTeamId &&
    championReg.rosterTeamId === registration.rosterTeamId
  );
}

async function fetchTeamChampionshipsUncached(teamId: string): Promise<ChampionshipTitle[]> {
  const [registrations, tournaments] = await Promise.all([
    fetchRegistrationsForTeam(teamId),
    fetchTournaments(),
  ]);

  const tournamentById = new Map(tournaments.map((t) => [t.id, t]));
  const titles: ChampionshipTitle[] = [];
  const tournamentRegsCache = new Map<string, MockTeam[]>();

  async function loadTournamentRegs(tournamentId: string): Promise<MockTeam[]> {
    const cached = tournamentRegsCache.get(tournamentId);
    if (cached) return cached;
    try {
      const rows = await fetchTournamentRegistrations(tournamentId);
      tournamentRegsCache.set(tournamentId, rows);
      return rows;
    } catch {
      tournamentRegsCache.set(tournamentId, []);
      return [];
    }
  }

  await Promise.all(
    registrations.map(async (registration) => {
      if (!CHAMPION_ELIGIBLE_STATUSES.has(registration.status)) return;

      const tournament = tournamentById.get(registration.tournamentId);
      if (!tournament || !isConcluded(tournament.status)) return;

      const payload = await fetchBracketPayload(tournament.id);
      if (!payload) return;

      const tournamentRegs = await loadTournamentRegs(tournament.id);
      const won = registrationWonChampionship(
        registration,
        tournament,
        payload,
        tournamentRegs,
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

  titles.sort(
    (a, b) => new Date(b.concludedAt).getTime() - new Date(a.concludedAt).getTime(),
  );
  return titles;
}

export async function fetchTeamChampionships(teamId: string): Promise<ChampionshipTitle[]> {
  return fetchTeamChampionshipsUncached(teamId);
}

export async function fetchMemberChampionships(memberId: string): Promise<ChampionshipTitle[]> {
  const teams = await fetchTeamsForUser(memberId);
  const activeTeams = teams.filter((team) => isActiveMember(team, memberId));
  if (!activeTeams.length) return [];

  const allTitles = await Promise.all(
    activeTeams.map((team) => fetchTeamChampionshipsUncached(team.id)),
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

  merged.sort(
    (a, b) => new Date(b.concludedAt).getTime() - new Date(a.concludedAt).getTime(),
  );
  return merged;
}

export async function fetchTeamsChampionshipMap(
  teamIds: string[],
): Promise<Map<string, ChampionshipTitle[]>> {
  const entries = await Promise.all(
    teamIds.map(async (teamId) => [teamId, await fetchTeamChampionshipsUncached(teamId)] as const),
  );

  const map = new Map<string, ChampionshipTitle[]>();
  for (const [teamId, titles] of entries) {
    if (titles.length) map.set(teamId, titles);
  }
  return map;
}
