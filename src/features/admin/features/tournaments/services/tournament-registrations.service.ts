import { supabase } from "@/lib/supabase";
import type { MockTeam } from "@/lib/mock-data";
import { fetchMemberById } from "@/features/admin/features/members/services/members.service";
import { fetchTeams } from "@/features/admin/features/teams/services/teams.service";
import { assignTeamActiveTournament } from "@/features/admin/features/teams/services/teams.service";
import { isSoloTournament } from "@/features/tournaments/types/participation";
import { assertMemberAvailableForTournament } from "@/features/tournaments/utils/member-tournament-eligibility";
import { isBlockingTournamentStatus } from "@/features/tournaments/utils/team-tournament-eligibility";
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
  return veteran ? "Previously Competed" : "Approved";
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

  return regs.map((reg) => rowToMockTeam(reg, playersByReg.get(reg.id as string) ?? []));
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

  return regs.map((reg) => rowToMockTeam(reg, playersByReg.get(reg.id as string) ?? []));
}

export async function updateRegistrationStatus(
  registrationId: string,
  status: MockTeam["status"],
): Promise<MockTeam> {
  const existing = await fetchRegistrationWithPlayers(registrationId);

  const { error } = await supabase
    .from("tournament_registrations")
    .update({ status })
    .eq("id", registrationId);

  if (error) throw new Error(error.message);

  if (status === "Approved" && existing.status !== "Approved") {
    const tournament = await fetchTournamentById(existing.tournamentId);
    if (existing.rosterTeamId && tournament) {
      await assignTeamActiveTournament(
        existing.rosterTeamId,
        existing.tournamentId,
        tournament.name,
      );
    }
  }

  if (status === "Rejected" && existing.status === "Approved" && existing.rosterTeamId) {
    const { error: teamErr } = await supabase
      .from("teams")
      .update({ active_tournament_id: null, active_tournament_name: null })
      .eq("id", existing.rosterTeamId);

    if (teamErr) throw new Error(teamErr.message);
  }

  return fetchRegistrationWithPlayers(registrationId);
}

export async function addTeamToTournament(
  tournamentId: string,
  rosterTeamId: string,
): Promise<MockTeam> {
  const tournament = await fetchTournamentById(tournamentId);
  if (!tournament) throw new Error("Tournament not found.");
  if (isSoloTournament(tournament)) {
    throw new Error("This tournament uses direct player registration. Add players instead of teams.");
  }

  // Check cap
  const { count, error: countErr } = await supabase
    .from("tournament_registrations")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if (countErr) throw new Error(countErr.message);
  if ((count ?? 0) >= tournament.teamCap) {
    throw new Error(`Team cap reached (${tournament.teamCap}).`);
  }

  // Check already registered
  const { data: existing } = await supabase
    .from("tournament_registrations")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("roster_team_id", rosterTeamId)
    .maybeSingle();

  if (existing) throw new Error("This team is already registered for this tournament.");

  // Get roster team
  const allTeams = await fetchTeams();
  const rosterTeam = allTeams.find((t) => t.id === rosterTeamId);
  if (!rosterTeam) throw new Error("Team not found. Create the team under Teams first.");

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

  const captain =
    rosterTeam.members.find((m) => m.status === "captain") ??
    rosterTeam.members.find((m) => m.status === "active") ??
    rosterTeam.members[0];

  const registrationStatus = await initialRegistrationStatus({
    rosterTeamId,
    tournamentId,
  });

  // Insert registration
  const { data: reg, error: regErr } = await supabase
    .from("tournament_registrations")
    .insert({
      tournament_id: tournamentId,
      roster_team_id: rosterTeamId,
      name: rosterTeam.name,
      tag: rosterTeam.tag,
      captain: captain?.username ?? "—",
      status: registrationStatus,
      history: [],
    })
    .select()
    .single();

  if (regErr) throw new Error(regErr.message);

  // Insert players
  const activePlayers = rosterTeam.members.filter(
    (m) => m.status === "captain" || m.status === "active",
  );

  if (activePlayers.length > 0) {
    const { error: playersErr } = await supabase.from("tournament_registration_players").insert(
      activePlayers.map((m) => ({
        registration_id: reg.id,
        ign: m.ign,
        role: m.role,
        discord: `${m.username}#0000`,
      })),
    );

    if (playersErr) throw new Error(playersErr.message);
  }

  await syncTournamentTeamCount(tournamentId, (count ?? 0) + 1);
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

  const { count, error: countErr } = await supabase
    .from("tournament_registrations")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if (countErr) throw new Error(countErr.message);
  if ((count ?? 0) >= tournament.teamCap) {
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

  const { data: reg, error: regErr } = await supabase
    .from("tournament_registrations")
    .insert({
      tournament_id: tournamentId,
      roster_team_id: null,
      member_user_id: memberUserId,
      name: member.username,
      tag,
      captain: member.username,
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
    ign: member.username,
    role: "Player",
    discord: member.discordUsername,
  });

  if (playersErr) throw new Error(playersErr.message);

  await syncTournamentTeamCount(tournamentId, (count ?? 0) + 1);
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
      captain: captain?.username ?? "—",
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
        discord: `${m.username}#0000`,
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

  const { count, error: countErr } = await supabase
    .from("tournament_registrations")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if (countErr) throw new Error(countErr.message);
  await syncTournamentTeamCount(tournamentId, count ?? 0);

  if (rosterTeamId) {
    const { error: teamErr } = await supabase
      .from("teams")
      .update({ active_tournament_id: null, active_tournament_name: null })
      .eq("id", rosterTeamId);

    if (teamErr) throw new Error(teamErr.message);
  }
}
