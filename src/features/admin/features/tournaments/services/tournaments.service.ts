import {
  concludeTournamentRegistrations,
  countBracketParticipantRegistrations,
  reconcileTournamentTeamCount,
} from "./tournament-registrations.service";
import {
  deleteTournamentChampion,
  syncTournamentChampionArchive,
} from "@/features/admin/features/tournament-details/services/bracket.service";
import { supabase } from "@/lib/supabase";
import { ADMIN_AUDIT_ACTIONS, logAdminAction } from "@/features/admin/services/audit-log.service";
import type { MockTournament } from "@/lib/mock-data";
import {
  isRegistrationDeadlineExtended,
  isRegistrationDeadlinePassed,
  isTournamentConcluded,
  resolveTournamentStatus,
  withResolvedTournamentStatus,
} from "@/features/tournaments/utils/tournament-status";
import type { PrizeTier } from "@/features/tournaments/types";
import type { ParticipationType, WwmMode } from "@/features/tournaments/types/participation";
import { resolveParticipationType } from "@/features/tournaments/types/participation";
import type { CreateTournamentInput } from "../types";

function isMissingRpcError(message: string): boolean {
  return (
    message.includes("schema cache") ||
    message.includes("Could not find the function") ||
    message.includes("PGRST202")
  );
}

function parsePrizeBreakdown(raw: unknown): PrizeTier[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const tiers = raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const tier = entry as Record<string, unknown>;
      const place = typeof tier.place === "string" ? tier.place : "";
      const prize = typeof tier.prize === "string" ? tier.prize : "";
      if (!place && !prize) return null;
      return { place, prize };
    })
    .filter((tier): tier is PrizeTier => !!tier);
  return tiers.length > 0 ? tiers : undefined;
}

function rowToTournament(row: Record<string, unknown>): MockTournament {
  const game = row.game as MockTournament["game"];
  const wwmMode = (row.wwm_mode as WwmMode | null) ?? null;
  const participationType =
    (row.participation_type as ParticipationType | undefined) ??
    resolveParticipationType(game, wwmMode);

  return {
    id: row.id as string,
    name: row.name as string,
    game,
    status: row.status as MockTournament["status"],
    prizePool: row.prize_pool as string,
    prizeBreakdown: parsePrizeBreakdown(row.prize_breakdown),
    startDate: row.start_date as string,
    registrationDeadline: row.registration_deadline as string,
    teamsRegistered: row.teams_registered as number,
    teamCap: row.team_cap as number,
    format: row.format as string,
    region: row.region as string,
    participationType,
    wwmMode,
    description: (row.description as string | null) ?? null,
    rulesUrl: (row.rules_url as string | null) ?? null,
  };
}

function participationColumnsMissing(message: string): boolean {
  return message.includes("participation_type") || message.includes("wwm_mode");
}

function missingColumnError(error: { code?: string; message?: string }, column: string): boolean {
  if (error.code === "42703") {
    return (error.message ?? "").includes(`"${column}"`);
  }
  if (error.code === "PGRST204") {
    return (error.message ?? "").includes(`'${column}' column`);
  }
  return false;
}

function descriptionColumnMissing(error: { code?: string; message?: string }): boolean {
  return missingColumnError(error, "description");
}

function rulesUrlColumnMissing(error: { code?: string; message?: string }): boolean {
  return missingColumnError(error, "rules_url");
}

function collectTournamentEditChanges(
  previous: MockTournament,
  input: CreateTournamentInput,
): string[] {
  const changed: string[] = [];
  if (previous.name !== input.name) changed.push("name");
  if (previous.game !== input.game) changed.push("game");
  if (previous.format !== input.format) changed.push("format");
  if (previous.prizePool !== input.prizePool) changed.push("prize pool");
  if (previous.startDate !== input.startDate) changed.push("start date");
  if (previous.registrationDeadline !== input.registrationDeadline) {
    changed.push("registration deadline");
  }
  if (previous.teamCap !== input.teamCap) changed.push("team cap");
  if (previous.region !== input.region) changed.push("region");
  if (previous.participationType !== input.participationType) {
    changed.push("participation type");
  }
  if ((previous.wwmMode ?? null) !== (input.wwmMode ?? null)) changed.push("WWM mode");
  if ((previous.description ?? null) !== (input.description ?? null)) changed.push("description");
  if ((previous.rulesUrl ?? null) !== (input.rulesUrl ?? null)) changed.push("rules file");
  if (input.status !== undefined && previous.status !== input.status) changed.push("status");
  return changed;
}

async function reopenRegistrationIfDeadlineExtended(
  previous: MockTournament | null,
  tournament: MockTournament,
): Promise<MockTournament> {
  if (
    !previous ||
    tournament.status !== "Registration Closed" ||
    isRegistrationDeadlinePassed(tournament.registrationDeadline) ||
    !isRegistrationDeadlineExtended(previous.registrationDeadline, tournament.registrationDeadline)
  ) {
    return tournament;
  }

  const { data, error } = await supabase
    .from("tournaments")
    .update({ status: "Registration Open" })
    .eq("id", tournament.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToTournament(data);
}

async function closeRegistrationIfDeadlinePassed(
  tournament: MockTournament,
): Promise<MockTournament> {
  if (
    tournament.status !== "Registration Open" ||
    !isRegistrationDeadlinePassed(tournament.registrationDeadline)
  ) {
    return tournament;
  }

  const { data, error } = await supabase
    .from("tournaments")
    .update({ status: "Registration Closed" })
    .eq("id", tournament.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToTournament(data);
}

async function hydrateTournament(tournament: MockTournament): Promise<MockTournament> {
  const teamsRegistered = await reconcileTournamentTeamCount(
    tournament.id,
    tournament.teamsRegistered,
  );
  const withCount =
    teamsRegistered === tournament.teamsRegistered
      ? tournament
      : { ...tournament, teamsRegistered };

  const closed = await closeRegistrationIfDeadlinePassed(withCount);
  return withResolvedTournamentStatus(closed);
}

const TOURNAMENT_LIST_COLUMNS =
  "id, name, game, status, prize_pool, prize_breakdown, start_date, registration_deadline, teams_registered, team_cap, format, region, participation_type, wwm_mode, description, rules_url";

const TOURNAMENT_NOTIFICATION_COLUMNS = "id, name, status";

export async function fetchTournamentsLite(): Promise<MockTournament[]> {
  const { data, error } = await supabase
    .from("tournaments")
    .select(TOURNAMENT_LIST_COLUMNS)
    .order("start_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => withResolvedTournamentStatus(rowToTournament(row)));
}

/** Minimal tournament rows for notification sync — skips per-row hydrate/reconcile. */
export async function fetchTournamentsForNotifications(): Promise<
  Pick<MockTournament, "id" | "name" | "status">[]
> {
  const { data, error } = await supabase
    .from("tournaments")
    .select(TOURNAMENT_NOTIFICATION_COLUMNS)
    .order("start_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    status: row.status as MockTournament["status"],
  }));
}

function isActiveDashboardTournament(tournament: MockTournament): boolean {
  const status = resolveTournamentStatus(tournament);
  return status === "Live" || status === "Registration Open";
}

export async function fetchActiveTournamentsForDashboard(): Promise<MockTournament[]> {
  const { data, error } = await supabase
    .from("tournaments")
    .select(TOURNAMENT_LIST_COLUMNS)
    .in("status", ["Live", "Registration Open"])
    .order("start_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => withResolvedTournamentStatus(rowToTournament(row)))
    .filter(isActiveDashboardTournament);
}

export async function countActiveTournaments(): Promise<number> {
  const tournaments = await fetchActiveTournamentsForDashboard();
  return tournaments.length;
}

export async function fetchTournaments(): Promise<MockTournament[]> {
  const { data, error } = await supabase
    .from("tournaments")
    .select(TOURNAMENT_LIST_COLUMNS)
    .order("start_date", { ascending: false });

  if (error) throw new Error(error.message);
  const tournaments = (data ?? []).map(rowToTournament);
  return Promise.all(tournaments.map((tournament) => hydrateTournament(tournament)));
}

export async function fetchTournamentById(id: string): Promise<MockTournament | null> {
  const { data, error } = await supabase
    .from("tournaments")
    .select(TOURNAMENT_LIST_COLUMNS)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  if (!data) return null;

  return hydrateTournament(rowToTournament(data));
}

/** SSR-safe tournament fetch via PostgREST (avoids supabase-js Realtime on Node). */
export async function fetchTournamentByIdForSsr(id: string): Promise<MockTournament | null> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!baseUrl || !apiKey) return null;

  const response = await fetch(
    `${baseUrl}/rest/v1/tournaments?id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(TOURNAMENT_LIST_COLUMNS)}`,
    {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/vnd.pgrst.object+json",
      },
    },
  );

  if (response.status === 406 || response.status === 404) return null;
  if (!response.ok) throw new Error(`Tournament fetch failed (${response.status})`);

  const data = (await response.json()) as Record<string, unknown>;
  return withResolvedTournamentStatus(rowToTournament(data));
}

export async function getTournamentByIdSync(id: string): Promise<MockTournament | null> {
  return fetchTournamentById(id);
}

export async function createTournament(input: CreateTournamentInput): Promise<MockTournament> {
  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      name: input.name,
      game: input.game,
      format: input.format,
      prize_pool: input.prizePool,
      start_date: input.startDate,
      registration_deadline: input.registrationDeadline,
      team_cap: input.teamCap,
      region: input.region,
      status: input.status ?? "Draft",
      teams_registered: 0,
      participation_type: input.participationType,
      wwm_mode: input.wwmMode ?? null,
      description: input.description ?? null,
      rules_url: input.rulesUrl ?? null,
    })
    .select()
    .single();

  if (error) {
    if (participationColumnsMissing(error.message)) {
      throw new Error(
        "Participation mode columns are missing. Run docs/sql/tournament_participation_mode.sql in Supabase.",
      );
    }
    if (descriptionColumnMissing(error)) {
      throw new Error(
        "Tournament description column is missing. Run docs/sql/tournament_description.sql in Supabase.",
      );
    }
    if (rulesUrlColumnMissing(error)) {
      throw new Error(
        "Tournament rules URL column is missing. Run docs/sql/tournament_rules_url.sql in Supabase.",
      );
    }
    throw new Error(error.message);
  }
  const tournament = rowToTournament(data);
  void logAdminAction({
    action: ADMIN_AUDIT_ACTIONS.TOURNAMENT_CREATED,
    entityType: "tournament",
    entityId: tournament.id,
    metadata: { tournamentName: tournament.name, game: tournament.game },
  });
  return tournament;
}

export async function syncTournamentTeamCount(tournamentId: string, count: number): Promise<void> {
  const { error } = await supabase
    .from("tournaments")
    .update({ teams_registered: count })
    .eq("id", tournamentId);

  if (error) throw new Error(error.message);
}

async function releaseTeamsFromTournament(tournamentId: string): Promise<void> {
  const { error } = await supabase
    .from("teams")
    .update({ active_tournament_id: null, active_tournament_name: null })
    .eq("active_tournament_id", tournamentId);

  if (error) throw new Error(error.message);
}

/** Set tournament status — e.g. Draft → Live when a bracket is published. */
export async function updateTournamentStatus(
  tournamentId: string,
  status: MockTournament["status"],
): Promise<MockTournament> {
  const previous = await fetchTournamentById(tournamentId);

  const { data, error } = await supabase
    .from("tournaments")
    .update({ status })
    .eq("id", tournamentId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (status === "Completed" || status === "Archived") {
    await concludeTournamentRegistrations(tournamentId);
    await releaseTeamsFromTournament(tournamentId);
    await syncTournamentTeamCount(
      tournamentId,
      await countBracketParticipantRegistrations(tournamentId),
    );
    const completed = rowToTournament(data);
    await syncTournamentChampionArchive(tournamentId, completed.name);
  } else if (previous && isTournamentConcluded(previous.status)) {
    await deleteTournamentChampion(tournamentId);
    await reconcileTournamentTeamCount(tournamentId, previous.teamsRegistered);
  }

  const updated = rowToTournament(data);
  if (previous && previous.status !== status) {
    void logAdminAction({
      action: ADMIN_AUDIT_ACTIONS.TOURNAMENT_STATUS_CHANGED,
      entityType: "tournament",
      entityId: tournamentId,
      metadata: {
        tournamentName: updated.name?.trim() || previous.name?.trim(),
        previousStatus: previous.status,
        newStatus: status,
      },
    });
  }

  return updated;
}

export async function updateTournamentPrizeBreakdown(
  id: string,
  prizeBreakdown: PrizeTier[],
): Promise<MockTournament> {
  const { data, error } = await supabase
    .from("tournaments")
    .update({ prize_breakdown: prizeBreakdown })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.message.includes("prize_breakdown")) {
      throw new Error(
        "Prize breakdown column is missing. Run docs/sql/tournament_prize_breakdown.sql in Supabase.",
      );
    }
    throw new Error(error.message);
  }

  const tournament = rowToTournament(data);
  void logAdminAction({
    action: ADMIN_AUDIT_ACTIONS.TOURNAMENT_PRIZE_UPDATED,
    entityType: "tournament",
    entityId: id,
    metadata: {
      tournamentName: tournament.name,
      tierCount: prizeBreakdown.length,
    },
  });

  return tournament;
}

export async function updateTournament(
  id: string,
  input: CreateTournamentInput,
): Promise<MockTournament> {
  const previous = await fetchTournamentById(id);
  const renaming = Boolean(previous && input.name !== previous.name);

  if (renaming) {
    const { error: teamNameErr } = await supabase
      .from("teams")
      .update({ active_tournament_name: input.name })
      .eq("active_tournament_id", id);

    if (teamNameErr) throw new Error(teamNameErr.message);
  }

  const { data, error } = await supabase
    .from("tournaments")
    .update({
      name: input.name,
      game: input.game,
      format: input.format,
      prize_pool: input.prizePool,
      start_date: input.startDate,
      registration_deadline: input.registrationDeadline,
      team_cap: input.teamCap,
      region: input.region,
      participation_type: input.participationType,
      wwm_mode: input.wwmMode ?? null,
      description: input.description ?? null,
      rules_url: input.rulesUrl ?? null,
      ...(input.status !== undefined ? { status: input.status } : {}),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (renaming && previous) {
      await supabase
        .from("teams")
        .update({ active_tournament_name: previous.name })
        .eq("active_tournament_id", id);
    }
    if (participationColumnsMissing(error.message)) {
      throw new Error(
        "Participation mode columns are missing. Run docs/sql/tournament_participation_mode.sql in Supabase.",
      );
    }
    if (descriptionColumnMissing(error)) {
      throw new Error(
        "Tournament description column is missing. Run docs/sql/tournament_description.sql in Supabase.",
      );
    }
    if (rulesUrlColumnMissing(error)) {
      throw new Error(
        "Tournament rules URL column is missing. Run docs/sql/tournament_rules_url.sql in Supabase.",
      );
    }
    throw new Error(error.message);
  }

  let updated = rowToTournament(data);

  if (updated.status === "Completed" || updated.status === "Archived") {
    await concludeTournamentRegistrations(id);
    await releaseTeamsFromTournament(id);
    await syncTournamentTeamCount(id, await countBracketParticipantRegistrations(id));
    await syncTournamentChampionArchive(id, updated.name);
  } else if (
    previous &&
    isTournamentConcluded(previous.status) &&
    !isTournamentConcluded(updated.status)
  ) {
    await deleteTournamentChampion(id);
    await reconcileTournamentTeamCount(id, previous.teamsRegistered);
  }

  updated = await reopenRegistrationIfDeadlineExtended(previous, updated);
  updated = await hydrateTournament(updated);

  if (previous) {
    const changedFields = collectTournamentEditChanges(previous, input);
    if (changedFields.length > 0) {
      void logAdminAction({
        action: ADMIN_AUDIT_ACTIONS.TOURNAMENT_UPDATED,
        entityType: "tournament",
        entityId: id,
        metadata: {
          tournamentName: updated.name,
          changedFields,
          ...(previous.status !== updated.status
            ? { previousStatus: previous.status, newStatus: updated.status }
            : {}),
        },
      });
    }
  }

  return updated;
}

/** Unregister all teams from a tournament. Does not delete rows in `teams`. */
async function unregisterAllTeamsFromTournament(tournamentId: string): Promise<void> {
  const { data: regs, error: regErr } = await supabase
    .from("tournament_registrations")
    .select("id, roster_team_id")
    .eq("tournament_id", tournamentId);

  if (regErr) throw new Error(regErr.message);
  if (!regs?.length) return;

  const registrationIds = regs.map((reg) => reg.id as string);
  const rosterTeamIds = [
    ...new Set(
      regs
        .map((reg) => reg.roster_team_id as string | null)
        .filter((teamId): teamId is string => !!teamId),
    ),
  ];

  const { error: playersErr } = await supabase
    .from("tournament_registration_players")
    .delete()
    .in("registration_id", registrationIds);

  if (playersErr) throw new Error(playersErr.message);

  const { error: deleteErr } = await supabase
    .from("tournament_registrations")
    .delete()
    .eq("tournament_id", tournamentId);

  if (deleteErr) throw new Error(deleteErr.message);

  if (rosterTeamIds.length > 0) {
    const { error: teamErr } = await supabase
      .from("teams")
      .update({ active_tournament_id: null, active_tournament_name: null })
      .in("id", rosterTeamIds);

    if (teamErr) throw new Error(teamErr.message);
  }
}

export async function deleteTournament(id: string): Promise<void> {
  let tournament: MockTournament | null = null;
  try {
    tournament = await fetchTournamentById(id);
  } catch {
    // Audit metadata is optional; deletion must not depend on a pre-read.
  }

  let { data, error } = await supabase.rpc("delete_tournament_cascade", {
    p_tournament_id: id,
  });

  if (error && isMissingRpcError(error.message)) {
    ({ data, error } = await supabase.rpc("delete_tournament_if_empty", {
      p_tournament_id: id,
    }));
  }

  if (!error && data) {
    void logAdminAction({
      action: ADMIN_AUDIT_ACTIONS.TOURNAMENT_DELETED,
      entityType: "tournament",
      entityId: id,
      metadata: { tournamentName: tournament?.name },
    });
    return;
  }

  if (error && !isMissingRpcError(error.message)) {
    throw new Error(error.message);
  }

  if (!tournament) {
    throw new Error("Tournament not found or could not be deleted.");
  }

  await unregisterAllTeamsFromTournament(id);

  const { error: deleteErr } = await supabase.from("tournaments").delete().eq("id", id);
  if (deleteErr) throw new Error(deleteErr.message);

  void logAdminAction({
    action: ADMIN_AUDIT_ACTIONS.TOURNAMENT_DELETED,
    entityType: "tournament",
    entityId: id,
    metadata: { tournamentName: tournament?.name },
  });
}
