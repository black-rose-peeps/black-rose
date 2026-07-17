import {
  fetchBracketState,
  type PersistedBracketPayload,
} from "@/features/admin/features/tournament-details/services/bracket.service";
import { fetchTournamentRegistrations } from "@/features/admin/features/tournaments/services/tournament-registrations.service";
import { fetchTournaments } from "@/features/admin/features/tournaments/services/tournaments.service";
import {
  buildPodiumPlacements,
  deriveManagedPlacements,
  derivePublicPlacements,
  type TournamentPlacement,
} from "@/features/tournaments/utils/tournament-placements";
import { resolveStoredGrandFinalMode } from "@/features/admin/features/tournament-details/utils/grand-final";
import { normalizeRoundSchedule } from "@/features/tournaments/utils/round-schedule";
import { supabase } from "@/lib/supabase";
import type { MockTeam, MockTournament } from "@/lib/mock-data";
import type { HallOfChampionRecord } from "../types";

interface TournamentChampionRow {
  id: string;
  tournament_id: string;
  tournament_name: string;
  team_name: string;
  team_tag: string;
  mvp: string | null;
  completed_at: string | null;
  created_at: string;
  portrait_url?: string | null;
  story?: string | null;
}

interface VenueInfo {
  venueType: "online" | "onsite" | null;
  venueLocation: string | null;
}

/**
 * Derives venue info from the bracket payload's round schedule map.
 * Checks the Grand Final round first (most authoritative for the championship),
 * then walks backwards through all scheduled rounds, then falls back to null.
 */
function resolveVenueFromPayload(payload: PersistedBracketPayload): VenueInfo {
  const schedules = payload.admin?.roundSchedules ?? {};

  // Grand final round IDs in priority order
  const grandFinalRoundIds = ["gf", "grand-final", "gf-r1", "grand"];
  for (const id of grandFinalRoundIds) {
    const raw = schedules[id];
    const schedule = normalizeRoundSchedule(raw);
    if (schedule?.venueType) {
      return {
        venueType: schedule.venueType,
        venueLocation: schedule.location?.trim() || null,
      };
    }
  }

  // Walk all scheduled rounds, take the last one with a venue set
  const entries = Object.values(schedules);
  for (let i = entries.length - 1; i >= 0; i--) {
    const schedule = normalizeRoundSchedule(entries[i]);
    if (schedule?.venueType) {
      return {
        venueType: schedule.venueType,
        venueLocation: schedule.location?.trim() || null,
      };
    }
  }

  return { venueType: null, venueLocation: null };
}

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

function resolveChampionPlacements(
  tournament: MockTournament,
  payload: PersistedBracketPayload,
): TournamentPlacement[] {
  const stored = payload.placements ?? [];
  if (championFromPlacements(stored)) return stored;

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
    const prizeTiers = payload.prizeBreakdown?.length
      ? payload.prizeBreakdown
      : tournament.prizeBreakdown;
    const podiums = buildPodiumPlacements(prizeTiers ?? [], raw);
    if (championFromPlacements(podiums)) return podiums;
    if (championFromPlacements(raw)) return raw;
  }

  if (payload.rounds?.length) {
    const raw = derivePublicPlacements(tournament.format, payload.rounds);
    const prizeTiers = payload.prizeBreakdown?.length
      ? payload.prizeBreakdown
      : tournament.prizeBreakdown;
    const podiums = buildPodiumPlacements(prizeTiers ?? [], raw);
    if (championFromPlacements(podiums)) return podiums;
    if (championFromPlacements(raw)) return raw;
  }

  return stored;
}

function resolveChampionName(
  tournament: MockTournament,
  payload: PersistedBracketPayload,
): string | null {
  return championFromPlacements(resolveChampionPlacements(tournament, payload));
}

function resolveCrownVariant(payload: PersistedBracketPayload): "grand" | "final" {
  const matches = payload.admin?.managedMatches ?? [];
  const grand = matches.find((m) => m.bracketSide === "grand" && m.confirmed && m.winner);
  return grand ? "grand" : "final";
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

  const withoutTagPrefix = champion.replace(/^\[[^\]]+\]\s*/, "");
  if (withoutTagPrefix === name) return true;

  return false;
}

function findRegistrationForChampion(
  championName: string,
  registrations: MockTeam[],
): MockTeam | null {
  return registrations.find((row) => teamMatchesChampion(championName, row.name, row.tag)) ?? null;
}

function rowToRecord(
  row: TournamentChampionRow,
  tournament: MockTournament | undefined,
  teamId: string | null,
  crownVariant: "grand" | "final",
  venue: VenueInfo = { venueType: null, venueLocation: null },
): HallOfChampionRecord {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    tournamentName: row.tournament_name,
    game: tournament?.game ?? "Valorant",
    region: tournament?.region ?? "Global",
    format: tournament?.format ?? "—",
    participationType: tournament?.participationType ?? "team",
    prizePool: tournament?.prizePool ?? "—",
    teamName: row.team_name,
    teamTag: row.team_tag,
    teamId,
    mvp: row.mvp,
    crownedAt: row.completed_at ?? tournament?.startDate ?? row.created_at,
    portraitUrl: row.portrait_url ?? null,
    story: row.story ?? null,
    crownVariant,
    venueType: venue.venueType,
    venueLocation: venue.venueLocation,
  };
}

/** Columns present on production `tournament_champions`. portrait_url and story are
 *  optional — they gracefully fall back to null when the column doesn't exist yet. */
const CHAMPION_ARCHIVE_COLUMNS =
  "id, tournament_id, tournament_name, team_name, team_tag, mvp, completed_at, created_at, portrait_url, story";

/**
 * Static portrait fallback for known champion photos that live in /public.
 * Keyed by normalised team name. Used when portrait_url is absent from the DB
 * (e.g. before the column migration is applied).
 */
const STATIC_PORTRAIT_MAP: Record<string, string> = {
  zorvex: "/Zorvex_Champ_Blackrose_x_Valorant.jpg",
};

async function fetchArchiveRows(): Promise<TournamentChampionRow[]> {
  const { data, error } = await supabase
    .from("tournament_champions")
    .select(CHAMPION_ARCHIVE_COLUMNS)
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("[hall-of-champions] archive fetch failed:", error.message);
    return [];
  }

  return (data ?? []) as TournamentChampionRow[];
}

async function fetchTeamIdsByName(names: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (!unique.length) return new Map();

  const { data, error } = await supabase.from("teams").select("id, name").in("name", unique);

  if (error) {
    console.error("[hall-of-champions] team lookup failed:", error.message);
    return new Map();
  }

  return new Map((data ?? []).map((row) => [row.name as string, row.id as string]));
}

async function fetchValidTeamIds(ids: string[]): Promise<Set<string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Set();

  const { data, error } = await supabase.from("teams").select("id").in("id", unique);

  if (error) {
    console.error("[hall-of-champions] team id validation failed:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.id as string));
}

/**
 * Applies static portrait fallbacks for records that have no portraitUrl.
 * Matches on a normalised team name so casing/spacing differences don't matter.
 */
function applyStaticPortraits(records: HallOfChampionRecord[]): HallOfChampionRecord[] {
  return records.map((record) => {
    if (record.portraitUrl) return record;
    const key = record.teamName.trim().toLowerCase().replace(/\s+/g, " ");
    const fallback = STATIC_PORTRAIT_MAP[key] ?? null;
    return fallback ? { ...record, portraitUrl: fallback } : record;
  });
}

async function enrichChampionTeamIds(
  records: HallOfChampionRecord[],
): Promise<HallOfChampionRecord[]> {
  const teamIdsByName = await fetchTeamIdsByName(records.map((record) => record.teamName));
  const candidateIds = records
    .map((record) => record.teamId)
    .filter((id): id is string => Boolean(id))
    .concat([...teamIdsByName.values()]);
  const validTeamIds = await fetchValidTeamIds(candidateIds);

  return records.map((record) => {
    let teamId = record.teamId && validTeamIds.has(record.teamId) ? record.teamId : null;
    if (!teamId) {
      const fromName = teamIdsByName.get(record.teamName);
      if (fromName && validTeamIds.has(fromName)) teamId = fromName;
    }
    return { ...record, teamId };
  });
}

async function deriveFromBrackets(
  tournaments: MockTournament[],
  excludeTournamentIds: Set<string>,
): Promise<HallOfChampionRecord[]> {
  const concluded = tournaments.filter(
    (t) => isConcluded(t.status) && !excludeTournamentIds.has(t.id),
  );

  const derived = await Promise.all(
    concluded.map(async (tournament) => {
      const state = await fetchBracketState(tournament.id).catch(() => null);
      const payload = state?.payload;
      if (!payload) return null;

      const championName = resolveChampionName(tournament, payload);
      if (!championName) return null;

      let teamTag = championName.slice(0, 3).toUpperCase();
      let teamId: string | null = null;

      try {
        const registrations = await fetchTournamentRegistrations(tournament.id);
        const match = findRegistrationForChampion(championName, registrations);
        if (match) {
          teamTag = match.tag;
          teamId = match.rosterTeamId ?? null;
        }
      } catch {
        // Non-fatal — display without team link
      }

      const syntheticRow: TournamentChampionRow = {
        id: `derived-${tournament.id}`,
        tournament_id: tournament.id,
        tournament_name: tournament.name,
        team_name: championName,
        team_tag: teamTag,
        mvp: null,
        completed_at: tournament.startDate,
        created_at: tournament.startDate,
      };

      return rowToRecord(
        syntheticRow,
        tournament,
        teamId,
        resolveCrownVariant(payload),
        resolveVenueFromPayload(payload),
      );
    }),
  );

  return derived.filter((row): row is HallOfChampionRecord => row !== null);
}

export async function fetchHallOfChampions(): Promise<HallOfChampionRecord[]> {
  const [archiveRows, tournaments] = await Promise.all([fetchArchiveRows(), fetchTournaments()]);
  const tournamentById = new Map(tournaments.map((t) => [t.id, t]));

  const archiveTournamentIds = new Set(archiveRows.map((row) => row.tournament_id));
  const visibleArchiveRows = archiveRows.filter((row) => {
    const tournament = tournamentById.get(row.tournament_id);
    return tournament ? isConcluded(tournament.status) : false;
  });
  const teamIdsByName = await fetchTeamIdsByName(visibleArchiveRows.map((row) => row.team_name));

  const bracketVariants = new Map<string, "grand" | "final">();
  const bracketVenues = new Map<string, VenueInfo>();
  await Promise.all(
    visibleArchiveRows.map(async (row) => {
      const state = await fetchBracketState(row.tournament_id).catch(() => null);
      if (state?.payload) {
        bracketVariants.set(row.tournament_id, resolveCrownVariant(state.payload));
        bracketVenues.set(row.tournament_id, resolveVenueFromPayload(state.payload));
      }
    }),
  );

  const registrationRosterIds = await Promise.all(
    visibleArchiveRows.map(async (row) => {
      try {
        const registrations = await fetchTournamentRegistrations(row.tournament_id);
        const match = findRegistrationForChampion(row.team_name, registrations);
        return match?.rosterTeamId ?? null;
      } catch {
        return null;
      }
    }),
  );

  const fromArchive = visibleArchiveRows.map((row, index) =>
    rowToRecord(
      row,
      tournamentById.get(row.tournament_id),
      registrationRosterIds[index] ?? teamIdsByName.get(row.team_name) ?? null,
      bracketVariants.get(row.tournament_id) ?? "final",
      bracketVenues.get(row.tournament_id),
    ),
  );

  const fromBrackets = await deriveFromBrackets(tournaments, archiveTournamentIds);
  const merged = [...fromArchive, ...fromBrackets];

  merged.sort((a, b) => new Date(b.crownedAt).getTime() - new Date(a.crownedAt).getTime());

  const enriched = await enrichChampionTeamIds(merged);
  return applyStaticPortraits(enriched);
}
