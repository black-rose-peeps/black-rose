import { supabase } from "@/lib/supabase";
import type { MockTeam } from "@/lib/mock-data";
import { fetchMemberById } from "@/features/admin/features/members/services/members.service";
import {
  assignTeamActiveTournament,
  fetchTeamById,
  fetchTeams,
} from "@/features/admin/features/teams/services/teams.service";
import type { Team } from "@/features/teams/types";
import { isSoloTournament } from "@/features/tournaments/types/participation";
import { isRegistrationOpen } from "@/features/tournaments/utils/tournament-status";
import { assertMemberAvailableForTournament } from "@/features/tournaments/utils/member-tournament-eligibility";
import { isBlockingTournamentStatus } from "@/features/tournaments/utils/team-tournament-eligibility";
import {
  formatValorantRiotId,
  isValorantGame,
} from "@/features/member/utils/valorant-identity";
import { fetchTournamentById, fetchTournaments, syncTournamentTeamCount } from "./tournaments.service";

export {
  assertMemberAvailableForTournament,
  fetchUnavailableMemberIdsForTournament,
} from "@/features/tournaments/utils/member-tournament-eligibility";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Mark approved entrants as veterans once their event is concluded. */
export async function concludeTournamentRegistrations(tournamentId: string): Promise<void> {
  const { error } = await supabase
    .from("tournament_registrations")
    .update({ status: "Previously Competed" })
    .eq("tournament_id", tournamentId)
    .eq("status", "Approved");

  if (error) throw new Error(error.message);
}

/** True when this roster team or solo member has competed in a finished event. */
export async function hasPriorTournamentParticipation(params: {
  rosterTeamId?: string | null;
  memberUserId?: string | null;
  excludeTournamentId: string;
}): Promise<boolean> {
  const { rosterTeamId, memberUserId, excludeTournamentId } = params;
  if (!rosterTeamId && !memberUserId) return false;

  let veteranQuery = supabase
    .from("tournament_registrations")
    .select("id")
    .eq("status", "Previously Competed")
    .neq("tournament_id", excludeTournamentId);

  if (rosterTeamId) {
    veteranQuery = veteranQuery.eq("roster_team_id", rosterTeamId);
  } else {
    veteranQuery = veteranQuery.eq("member_user_id", memberUserId!);
  }

  const { data: veteranRows, error: veteranErr } = await veteranQuery;
  if (veteranErr) throw new Error(veteranErr.message);
  if (veteranRows?.length) return true;

  // Legacy rows still Approved on concluded events (before backfill / mark-complete sync).
  let legacyQuery = supabase
    .from("tournament_registrations")
    .select("tournament_id")
    .eq("status", "Approved")
    .neq("tournament_id", excludeTournamentId);

  if (rosterTeamId) {
    legacyQuery = legacyQuery.eq("roster_team_id", rosterTeamId);
  } else {
    legacyQuery = legacyQuery.eq("member_user_id", memberUserId!);
  }

  const { data: legacyRegs, error: legacyErr } = await legacyQuery;
  if (legacyErr) throw new Error(legacyErr.message);
  if (!legacyRegs?.length) return false;

  const tournamentIds = [...new Set(legacyRegs.map((row) => row.tournament_id as string))];
  const tournaments = await fetchTournaments();
  const concludedIds = new Set(
    tournaments
      .filter((t) => t.status === "Completed" || t.status === "Archived")
      .map((t) => t.id),
  );

  return tournamentIds.some((id) => concludedIds.has(id));
}

async function initialRegistrationStatus(params: {
  rosterTeamId?: string | null;
  memberUserId?: string | null;
  tournamentId: string;
}): Promise<MockTeam["status"]> {
  const veteran = await hasPriorTournamentParticipation({
    rosterTeamId: params.rosterTeamId,
    memberUserId: params.memberUserId,
    excludeTournamentId: params.tournamentId,
  });
  return veteran ? "Previously Competed" : "Pending";
}

async function countTournamentRegistrations(tournamentId: string): Promise<number> {
  const { count, error } = await supabase
    .from("tournament_registrations")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("status", "Approved");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Align tournaments.teams_registered with approved registration rows. */
export async function reconcileTournamentTeamCount(
  tournamentId: string,
  cachedCount: number,
): Promise<number> {
  const actualCount = await countTournamentRegistrations(tournamentId);
  if (actualCount !== cachedCount) {
    await syncTournamentTeamCount(tournamentId, actualCount);
  }
  return actualCount;
}

function teamCaptainDisplayName(team: Team): string {
  const captain =
    team.members.find((m) => m.status === "captain") ??
    team.members.find((m) => m.status === "active") ??
    team.members[0];
  return captain?.displayName || captain?.username || "—";
}

async function fetchValorantIdsForMembers(memberIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(memberIds.filter(Boolean))];
  if (!unique.length) return new Map();

  const { data, error } = await supabase
    .from("member_profiles")
    .select("member_id, valorant_game_name, valorant_tagline")
    .in("member_id", unique);

  if (error) {
    console.error("[registrations] valorant id lookup failed:", error.message);
    return new Map();
  }

  const result = new Map<string, string>();
  for (const row of data ?? []) {
    const memberId = row.member_id as string;
    const valorantId = formatValorantRiotId(
      (row.valorant_game_name as string | null) ?? "",
      (row.valorant_tagline as string | null) ?? "",
    );
    if (valorantId) result.set(memberId, valorantId);
  }
  return result;
}

function mockTeamFromLiveRoster(reg: MockTeam, liveTeam: Team): MockTeam {
  const activePlayers = liveTeam.members.filter(
    (m) => m.status === "captain" || m.status === "active",
  );

  return {
    ...reg,
    name: liveTeam.name,
    tag: liveTeam.tag,
    captain: teamCaptainDisplayName(liveTeam),
    members:
      activePlayers.length > 0
        ? activePlayers.map((m) => ({
            ign: m.ign,
            role: m.role,
            discord: m.discordUsername || m.username,
          }))
        : reg.members,
  };
}

async function enrichRegistrationsWithLiveData(
  regs: MockTeam[],
  tournamentGameById: Map<string, string>,
): Promise<MockTeam[]> {
  const rosterIds = [
    ...new Set(regs.map((r) => r.rosterTeamId).filter((id): id is string => !!id)),
  ];
  const liveById = new Map<string, Team>();

  if (rosterIds.length > 0) {
    const allTeams = await fetchTeams();
    for (const team of allTeams) {
      if (rosterIds.includes(team.id)) liveById.set(team.id, team);
    }
  }

  const soloMemberIds = regs
    .filter((r) => !r.rosterTeamId && r.memberUserId)
    .map((r) => r.memberUserId as string);
  const valorantIds = await fetchValorantIdsForMembers(soloMemberIds);

  return regs.map((reg) => {
    if (reg.rosterTeamId) {
      const live = liveById.get(reg.rosterTeamId);
      return live ? mockTeamFromLiveRoster(reg, live) : reg;
    }

    const game = tournamentGameById.get(reg.tournamentId);
    if (!game || !isValorantGame(game) || !reg.memberUserId) return reg;

    const valorantId = valorantIds.get(reg.memberUserId);
    if (!valorantId) return reg;

    return {
      ...reg,
      captain: valorantId,
      members: reg.members.map((m) => ({ ...m, ign: valorantId })),
    };
  });
}

async function insertTeamRegistrationPlayers(
  registrationId: string,
  rosterTeam: Team,
): Promise<void> {
  const activePlayers = rosterTeam.members.filter(
    (m) => m.status === "captain" || m.status === "active",
  );

  if (activePlayers.length === 0) return;

  const { error: playersErr } = await supabase.from("tournament_registration_players").insert(
    activePlayers.map((m) => ({
      registration_id: registrationId,
      ign: m.ign,
      role: m.role,
      discord: m.discordUsername || m.username,
    })),
  );

  if (playersErr) throw new Error(playersErr.message);
}

async function validateTeamForTournamentRegistration(
  tournamentId: string,
  rosterTeam: Team,
  options?: { requireOpenRegistration?: boolean },
): Promise<Awaited<ReturnType<typeof fetchTournamentById>> & object> {
  const tournament = await fetchTournamentById(tournamentId);
  if (!tournament) throw new Error("Tournament not found.");
  if (options?.requireOpenRegistration && !isRegistrationOpen(tournament)) {
    if (tournament.status !== "Registration Open") {
      throw new Error("Registration is not open for this tournament.");
    }
    throw new Error("Registration deadline has passed.");
  }
  if (isSoloTournament(tournament)) {
    throw new Error("This tournament uses direct player registration.");
  }

  const registrationCount = await countTournamentRegistrations(tournamentId);
  if (registrationCount >= tournament.teamCap) {
    throw new Error(`Team cap reached (${tournament.teamCap}).`);
  }

  if (rosterTeam.game !== "Multi" && rosterTeam.game !== tournament.game) {
    throw new Error(
      `${rosterTeam.name} is registered for ${rosterTeam.game}, but this tournament is ${tournament.game}.`,
    );
  }

  if (rosterTeam.activeTournamentId && rosterTeam.activeTournamentId !== tournamentId) {
    const activeTournament = await fetchTournamentById(rosterTeam.activeTournamentId);
    if (activeTournament && isBlockingTournamentStatus(activeTournament.status)) {
      throw new Error(
        `${rosterTeam.name} is already active in ${rosterTeam.activeTournamentName ?? activeTournament.name}. Complete that event before registering elsewhere.`,
      );
    }
  }

  return tournament;
}

async function fetchRegistrationWithPlayers(registrationId: string): Promise<MockTeam> {
  const { data: reg, error: regErr } = await supabase
    .from("tournament_registrations")
    .select("*")
    .eq("id", registrationId)
    .single();

  if (regErr) throw new Error(regErr.message);

  const { data: players, error: playersErr } = await supabase
    .from("tournament_registration_players")
    .select("*")
    .eq("registration_id", registrationId);

  if (playersErr) throw new Error(playersErr.message);

  return rowToMockTeam(reg, players ?? []);
}

function soloRegistrationTag(username: string): string {
  const clean = username.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (clean.length >= 3) return clean.slice(0, 3);
  return (clean + "XXX").slice(0, 3);
}

function pickRegistrationStatusUpdatedAt(reg: Record<string, unknown>): string | undefined {
  for (const key of ["reviewed_at", "approved_at", "updated_at"] as const) {
    const value = reg[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function rowToMockTeam(reg: Record<string, unknown>, players: Record<string, unknown>[]): MockTeam {
  return {
    id: reg.id as string,
    rosterTeamId: (reg.roster_team_id as string | null) ?? undefined,
    memberUserId: (reg.member_user_id as string | null) ?? undefined,
    name: reg.name as string,
    tag: reg.tag as string,
    captain: reg.captain as string,
    members: players.map((p) => ({
      ign: p.ign as string,
      role: p.role as string,
      discord: p.discord as string,
    })),
    registrationDate: reg.registration_date as string,
    statusUpdatedAt: pickRegistrationStatusUpdatedAt(reg),
    status: reg.status as MockTeam["status"],
    tournamentId: reg.tournament_id as string,
    history: (reg.history as string[]) ?? [],
  };
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function fetchTournamentRegistrations(tournamentId: string): Promise<MockTeam[]> {
  const { data: regs, error: regsErr } = await supabase
    .from("tournament_registrations")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("registration_date", { ascending: false });

  if (regsErr) throw new Error(regsErr.message);
  if (!regs?.length) return [];

  const regIds = regs.map((r) => r.id as string);

  const { data: players, error: playersErr } = await supabase
    .from("tournament_registration_players")
    .select("*")
    .in("registration_id", regIds);

  if (playersErr) throw new Error(playersErr.message);

  const playersByReg = new Map<string, Record<string, unknown>[]>();
  for (const p of players ?? []) {
    const rid = p.registration_id as string;
    if (!playersByReg.has(rid)) playersByReg.set(rid, []);
    playersByReg.get(rid)!.push(p);
  }

  const teams = regs.map((reg) => rowToMockTeam(reg, playersByReg.get(reg.id as string) ?? []));
  const tournament = await fetchTournamentById(tournamentId);
  const gameById = new Map<string, string>(
    tournament ? [[tournamentId, tournament.game]] : [],
  );
  return enrichRegistrationsWithLiveData(teams, gameById);
}

export async function fetchAllRegistrations(): Promise<MockTeam[]> {
  const { data: regs, error: regsErr } = await supabase
    .from("tournament_registrations")
    .select("*")
    .order("registration_date", { ascending: false });

  if (regsErr) throw new Error(regsErr.message);
  if (!regs?.length) return [];

  const regIds = regs.map((r) => r.id as string);

  const { data: players, error: playersErr } = await supabase
    .from("tournament_registration_players")
    .select("*")
    .in("registration_id", regIds);

  if (playersErr) throw new Error(playersErr.message);

  const playersByReg = new Map<string, Record<string, unknown>[]>();
  for (const p of players ?? []) {
    const rid = p.registration_id as string;
    if (!playersByReg.has(rid)) playersByReg.set(rid, []);
    playersByReg.get(rid)!.push(p);
  }

  const teams = regs.map((reg) => rowToMockTeam(reg, playersByReg.get(reg.id as string) ?? []));
  const tournaments = await fetchTournaments();
  const gameById = new Map(tournaments.map((t) => [t.id, t.game]));
  return enrichRegistrationsWithLiveData(teams, gameById);
}

async function assertApprovalWithinCap(
  tournamentId: string,
  teamCap: number,
): Promise<void> {
  const approvedCount = await countTournamentRegistrations(tournamentId);
  if (approvedCount >= teamCap) {
    throw new Error(`Registration cap reached (${teamCap}).`);
  }
}

export async function updateRegistrationStatus(
  registrationId: string,
  status: MockTeam["status"],
): Promise<MockTeam> {
  const existing = await fetchRegistrationWithPlayers(registrationId);
  const isNewApproval = status === "Approved" && existing.status !== "Approved";

  let tournament: Awaited<ReturnType<typeof fetchTournamentById>> | null = null;
  if (isNewApproval) {
    tournament = await fetchTournamentById(existing.tournamentId);
    if (!tournament) throw new Error("Tournament not found.");
    await assertApprovalWithinCap(existing.tournamentId, tournament.teamCap);
  }

  const reviewedAt = new Date().toISOString();
  const statusPatch: Record<string, unknown> = { status };
  if (status === "Approved") statusPatch.approved_at = reviewedAt;
  statusPatch.reviewed_at = reviewedAt;

  let { error } = await supabase
    .from("tournament_registrations")
    .update(statusPatch)
    .eq("id", registrationId);

  if (error) {
    const fallback = await supabase
      .from("tournament_registrations")
      .update({ status })
      .eq("id", registrationId);
    error = fallback.error;
  }

  if (error) throw new Error(error.message);

  if (isNewApproval && tournament && existing.rosterTeamId) {
    await assignTeamActiveTournament(
      existing.rosterTeamId,
      existing.tournamentId,
      tournament.name,
    );
  }

  if (status === "Rejected" && existing.rosterTeamId) {
    const { error: teamErr } = await supabase
      .from("teams")
      .update({ active_tournament_id: null, active_tournament_name: null })
      .eq("id", existing.rosterTeamId)
      .eq("active_tournament_id", existing.tournamentId);

    if (teamErr) throw new Error(teamErr.message);
  }

  const registrationCount = await countTournamentRegistrations(existing.tournamentId);
  await syncTournamentTeamCount(existing.tournamentId, registrationCount);

  return fetchRegistrationWithPlayers(registrationId);
}

export async function fetchTeamTournamentRegistration(
  rosterTeamId: string,
  tournamentId: string,
): Promise<MockTeam | null> {
  const { data, error } = await supabase
    .from("tournament_registrations")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("roster_team_id", rosterTeamId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return fetchRegistrationWithPlayers(data.id as string);
}

export interface RegistrationHistoryEntry {
  registrationId: string;
  tournamentId: string;
  tournamentName: string;
  tournamentStatus: import("@/lib/mock-data").TournamentStatus | null;
  registrationDate: string;
  status: MockTeam["status"];
}

/** Prior tournament registrations for the same roster team or solo member. */
export async function fetchRegistrationTournamentHistory(
  registrationId: string,
  rosterTeamId?: string | null,
  memberUserId?: string | null,
): Promise<RegistrationHistoryEntry[]> {
  if (!rosterTeamId && !memberUserId) return [];

  let query = supabase
    .from("tournament_registrations")
    .select("id, tournament_id, registration_date, status")
    .neq("id", registrationId)
    .order("registration_date", { ascending: false });

  query = rosterTeamId
    ? query.eq("roster_team_id", rosterTeamId)
    : query.eq("member_user_id", memberUserId!);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data?.length) return [];

  const tournaments = await fetchTournaments();
  const tournamentById = new Map(tournaments.map((t) => [t.id, t]));

  return data.map((row) => {
    const tournamentId = row.tournament_id as string;
    const tournament = tournamentById.get(tournamentId);
    return {
      registrationId: row.id as string,
      tournamentId,
      tournamentName: tournament?.name ?? "Unknown tournament",
      tournamentStatus: tournament?.status ?? null,
      registrationDate: row.registration_date as string,
      status: row.status as MockTeam["status"],
    };
  });
}

export async function fetchRegistrationsForTeam(rosterTeamId: string): Promise<MockTeam[]> {
  const { data, error } = await supabase
    .from("tournament_registrations")
    .select("id")
    .eq("roster_team_id", rosterTeamId)
    .order("registration_date", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data?.length) return [];

  const teams = await Promise.all(
    data.map((row) => fetchRegistrationWithPlayers(row.id as string)),
  );
  const tournaments = await fetchTournaments();
  const gameById = new Map(tournaments.map((t) => [t.id, t.game]));
  return enrichRegistrationsWithLiveData(teams, gameById);
}

export async function requestCaptainTeamRegistration(
  tournamentId: string,
  rosterTeamId: string,
  captainUserId: string,
): Promise<MockTeam> {
  const rosterTeam = await fetchTeamById(rosterTeamId);
  if (!rosterTeam) throw new Error("Team not found.");
  if (rosterTeam.captainUserId !== captainUserId) {
    throw new Error("Only the team captain can register for tournaments.");
  }

  const tournament = await validateTeamForTournamentRegistration(tournamentId, rosterTeam, {
    requireOpenRegistration: true,
  });

  const existing = await fetchTeamTournamentRegistration(rosterTeamId, tournamentId);
  if (existing) {
    if (existing.status === "Rejected") {
      await resyncRegistrationRoster(existing.id);
      const { error: updateErr } = await supabase
        .from("tournament_registrations")
        .update({ status: "Pending" })
        .eq("id", existing.id);
      if (updateErr) throw new Error(updateErr.message);
      const registrationCount = await countTournamentRegistrations(tournamentId);
      await syncTournamentTeamCount(tournamentId, registrationCount);
      return fetchRegistrationWithPlayers(existing.id);
    }
    if (existing.status === "Pending") {
      throw new Error("Your registration is already pending admin approval.");
    }
    throw new Error("This team is already registered for this tournament.");
  }

  const { data: reg, error: regErr } = await supabase
    .from("tournament_registrations")
    .insert({
      tournament_id: tournamentId,
      roster_team_id: rosterTeamId,
      name: rosterTeam.name,
      tag: rosterTeam.tag,
      captain: teamCaptainDisplayName(rosterTeam),
      status: "Pending",
      history: [],
    })
    .select()
    .single();

  if (regErr) throw new Error(regErr.message);

  await insertTeamRegistrationPlayers(reg.id as string, rosterTeam);

  const registrationCount = await countTournamentRegistrations(tournamentId);
  await syncTournamentTeamCount(tournamentId, registrationCount);

  return fetchRegistrationWithPlayers(reg.id as string);
}

export async function addTeamToTournament(
  tournamentId: string,
  rosterTeamId: string,
): Promise<MockTeam> {
  const allTeams = await fetchTeams();
  const rosterTeam = allTeams.find((t) => t.id === rosterTeamId);
  if (!rosterTeam) throw new Error("Team not found. Create the team under Teams first.");

  const tournament = await validateTeamForTournamentRegistration(tournamentId, rosterTeam);

  const existing = await fetchTeamTournamentRegistration(rosterTeamId, tournamentId);
  if (existing) throw new Error("This team is already registered for this tournament.");

  const registrationStatus = await initialRegistrationStatus({
    rosterTeamId,
    tournamentId,
  });

  const { data: reg, error: regErr } = await supabase
    .from("tournament_registrations")
    .insert({
      tournament_id: tournamentId,
      roster_team_id: rosterTeamId,
      name: rosterTeam.name,
      tag: rosterTeam.tag,
      captain: teamCaptainDisplayName(rosterTeam),
      status: registrationStatus,
      history: [],
    })
    .select()
    .single();

  if (regErr) throw new Error(regErr.message);

  await insertTeamRegistrationPlayers(reg.id as string, rosterTeam);

  const registrationCount = await countTournamentRegistrations(tournamentId);
  await syncTournamentTeamCount(tournamentId, registrationCount);
  if (registrationStatus === "Approved") {
    await assignTeamActiveTournament(rosterTeamId, tournamentId, tournament.name);
  }

  return fetchRegistrationWithPlayers(reg.id as string);
}

export interface AddTeamsToTournamentResult {
  added: MockTeam[];
  failed: { rosterTeamId: string; message: string }[];
}

export async function addMemberToTournament(
  tournamentId: string,
  memberUserId: string,
): Promise<MockTeam> {
  const tournament = await fetchTournamentById(tournamentId);
  if (!tournament) throw new Error("Tournament not found.");
  if (!isSoloTournament(tournament)) {
    throw new Error("This tournament uses team registration. Add teams instead of individual players.");
  }

  const registrationCount = await countTournamentRegistrations(tournamentId);
  if (registrationCount >= tournament.teamCap) {
    throw new Error(`Registration cap reached (${tournament.teamCap}).`);
  }

  const member = await fetchMemberById(memberUserId);
  if (!member) throw new Error("Member not found.");

  await assertMemberAvailableForTournament(memberUserId, tournamentId);

  const tag = soloRegistrationTag(member.username);
  const registrationStatus = await initialRegistrationStatus({
    memberUserId,
    tournamentId,
  });

  let soloIgn = member.username;
  if (isValorantGame(tournament.game)) {
    const valorantIds = await fetchValorantIdsForMembers([member.id]);
    soloIgn = valorantIds.get(member.id) ?? member.username;
  }

  const { data: reg, error: regErr } = await supabase
    .from("tournament_registrations")
    .insert({
      tournament_id: tournamentId,
      roster_team_id: null,
      member_user_id: memberUserId,
      name: member.username,
      tag,
      captain: soloIgn,
      status: registrationStatus,
      history: [],
    })
    .select()
    .single();

  if (regErr) {
    if (regErr.message.includes("member_user_id")) {
      throw new Error(
        "Solo registration column is missing. Run docs/sql/tournament_participation_mode.sql in Supabase.",
      );
    }
    throw new Error(regErr.message);
  }

  const { error: playersErr } = await supabase.from("tournament_registration_players").insert({
    registration_id: reg.id,
    ign: soloIgn,
    role: "Player",
    discord: member.discordUsername,
  });

  if (playersErr) throw new Error(playersErr.message);

  const updatedCount = await countTournamentRegistrations(tournamentId);
  await syncTournamentTeamCount(tournamentId, updatedCount);
  return fetchRegistrationWithPlayers(reg.id as string);
}

export interface AddMembersToTournamentResult {
  added: MockTeam[];
  failed: { memberUserId: string; message: string }[];
}

export async function addMembersToTournament(
  tournamentId: string,
  memberUserIds: string[],
): Promise<AddMembersToTournamentResult> {
  const uniqueIds = [...new Set(memberUserIds)];
  const added: MockTeam[] = [];
  const failed: AddMembersToTournamentResult["failed"] = [];

  for (const memberUserId of uniqueIds) {
    try {
      const registration = await addMemberToTournament(tournamentId, memberUserId);
      added.push(registration);
    } catch (err) {
      failed.push({
        memberUserId,
        message: err instanceof Error ? err.message : "Failed to add player.",
      });
    }
  }

  return { added, failed };
}

export async function addTeamsToTournament(
  tournamentId: string,
  rosterTeamIds: string[],
): Promise<AddTeamsToTournamentResult> {
  const uniqueIds = [...new Set(rosterTeamIds)];
  const added: MockTeam[] = [];
  const failed: AddTeamsToTournamentResult["failed"] = [];

  for (const rosterTeamId of uniqueIds) {
    try {
      const registration = await addTeamToTournament(tournamentId, rosterTeamId);
      added.push(registration);
    } catch (err) {
      failed.push({
        rosterTeamId,
        message: err instanceof Error ? err.message : "Failed to add team.",
      });
    }
  }

  return { added, failed };
}

async function resyncRegistrationRoster(registrationId: string): Promise<MockTeam> {
  const { data: reg, error: regErr } = await supabase
    .from("tournament_registrations")
    .select("*")
    .eq("id", registrationId)
    .single();

  if (regErr) throw new Error(regErr.message);

  const rosterTeamId = reg.roster_team_id as string | null;
  if (!rosterTeamId) return fetchRegistrationWithPlayers(registrationId);

  const allTeams = await fetchTeams();
  const rosterTeam = allTeams.find((t) => t.id === rosterTeamId);
  if (!rosterTeam) return fetchRegistrationWithPlayers(registrationId);

  const captain =
    rosterTeam.members.find((m) => m.status === "captain") ??
    rosterTeam.members.find((m) => m.status === "active") ??
    rosterTeam.members[0];

  const { error: updateErr } = await supabase
    .from("tournament_registrations")
    .update({
      name: rosterTeam.name,
      tag: rosterTeam.tag,
      captain: captain?.displayName || captain?.username || "—",
    })
    .eq("id", registrationId);

  if (updateErr) throw new Error(updateErr.message);

  const { error: deleteErr } = await supabase
    .from("tournament_registration_players")
    .delete()
    .eq("registration_id", registrationId);

  if (deleteErr) throw new Error(deleteErr.message);

  const activePlayers = rosterTeam.members.filter(
    (m) => m.status === "captain" || m.status === "active",
  );

  if (activePlayers.length > 0) {
    const { error: playersErr } = await supabase.from("tournament_registration_players").insert(
      activePlayers.map((m) => ({
        registration_id: registrationId,
        ign: m.ign,
        role: m.role,
        discord: m.discordUsername || m.username,
      })),
    );

    if (playersErr) throw new Error(playersErr.message);
  }

  return fetchRegistrationWithPlayers(registrationId);
}

/** Refresh tournament registration snapshots from live team rosters. */
export async function resyncRegistrationsForTeam(rosterTeamId: string): Promise<MockTeam[]> {
  const { data: regs, error } = await supabase
    .from("tournament_registrations")
    .select("id")
    .eq("roster_team_id", rosterTeamId);

  if (error) throw new Error(error.message);
  if (!regs?.length) return [];

  const updated: MockTeam[] = [];
  for (const reg of regs) {
    updated.push(await resyncRegistrationRoster(reg.id as string));
  }
  return updated;
}

export async function removeTeamFromTournament(registrationId: string): Promise<void> {
  const { data: reg, error: regErr } = await supabase
    .from("tournament_registrations")
    .select("tournament_id, roster_team_id")
    .eq("id", registrationId)
    .single();

  if (regErr) throw new Error(regErr.message);

  const tournamentId = reg.tournament_id as string;
  const rosterTeamId = reg.roster_team_id as string | null;

  const { error: playersErr } = await supabase
    .from("tournament_registration_players")
    .delete()
    .eq("registration_id", registrationId);

  if (playersErr) throw new Error(playersErr.message);

  const { error: deleteErr } = await supabase
    .from("tournament_registrations")
    .delete()
    .eq("id", registrationId);

  if (deleteErr) throw new Error(deleteErr.message);

  const registrationCount = await countTournamentRegistrations(tournamentId);
  await syncTournamentTeamCount(tournamentId, registrationCount);

  if (rosterTeamId) {
    const { error: teamErr } = await supabase
      .from("teams")
      .update({ active_tournament_id: null, active_tournament_name: null })
      .eq("id", rosterTeamId)
      .eq("active_tournament_id", tournamentId);

    if (teamErr) throw new Error(teamErr.message);
  }
}
