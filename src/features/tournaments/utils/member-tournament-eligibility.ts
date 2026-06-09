import { fetchTeams } from "@/features/admin/features/teams/services/teams.service";
import { fetchTournaments } from "@/features/admin/features/tournaments/services/tournaments.service";
import { supabase } from "@/lib/supabase";
import { isBlockingTournamentStatus } from "./team-tournament-eligibility";

function addActiveRosterMembers(team: Awaited<ReturnType<typeof fetchTeams>>[number], ids: Set<string>) {
  for (const member of team.members) {
    if (member.status === "captain" || member.status === "active") {
      ids.add(member.userId);
    }
  }
}

/**
 * Member IDs that cannot register for `tournamentId` because they are already
 * committed to another live or upcoming event (solo entry or team roster).
 */
export async function fetchUnavailableMemberIdsForTournament(
  tournamentId: string,
): Promise<Set<string>> {
  const unavailable = new Set<string>();

  const tournaments = await fetchTournaments();
  const blockingIds = tournaments
    .filter((t) => t.id !== tournamentId && isBlockingTournamentStatus(t.status))
    .map((t) => t.id);

  if (blockingIds.length === 0) return unavailable;

  const { data: regs, error: regsErr } = await supabase
    .from("tournament_registrations")
    .select("tournament_id, member_user_id, roster_team_id")
    .in("tournament_id", blockingIds);

  if (regsErr) throw new Error(regsErr.message);

  const rosterTeamIds = new Set<string>();

  for (const reg of regs ?? []) {
    const memberUserId = reg.member_user_id as string | null;
    if (memberUserId) unavailable.add(memberUserId);

    const rosterTeamId = reg.roster_team_id as string | null;
    if (rosterTeamId) rosterTeamIds.add(rosterTeamId);
  }

  const allTeams = await fetchTeams();

  for (const team of allTeams) {
    const blockedByRegistration = rosterTeamIds.has(team.id);
    const blockedByActiveFlag =
      !!team.activeTournamentId &&
      team.activeTournamentId !== tournamentId &&
      blockingIds.includes(team.activeTournamentId);

    if (blockedByRegistration || blockedByActiveFlag) {
      addActiveRosterMembers(team, unavailable);
    }
  }

  return unavailable;
}

export async function getMemberTournamentBlockReason(
  memberUserId: string,
  tournamentId: string,
): Promise<string | null> {
  const { data: existing, error: existingErr } = await supabase
    .from("tournament_registrations")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("member_user_id", memberUserId)
    .maybeSingle();

  if (existingErr) throw new Error(existingErr.message);
  if (existing) return "This player is already registered for this tournament.";

  const { data: rosterRegs, error: rosterRegsErr } = await supabase
    .from("tournament_registrations")
    .select("roster_team_id")
    .eq("tournament_id", tournamentId)
    .not("roster_team_id", "is", null);

  if (rosterRegsErr) throw new Error(rosterRegsErr.message);

  if (rosterRegs?.length) {
    const allTeams = await fetchTeams();
    for (const reg of rosterRegs) {
      const rosterTeamId = reg.roster_team_id as string;
      const team = allTeams.find((t) => t.id === rosterTeamId);
      if (
        team?.members.some(
          (m) =>
            m.userId === memberUserId && (m.status === "captain" || m.status === "active"),
        )
      ) {
        return "This player is already registered for this tournament.";
      }
    }
  }

  const tournaments = await fetchTournaments();
  const blockingById = new Map(
    tournaments
      .filter((t) => t.id !== tournamentId && isBlockingTournamentStatus(t.status))
      .map((t) => [t.id, t]),
  );

  if (blockingById.size === 0) return null;

  const blockingIds = [...blockingById.keys()];

  const { data: soloRegs, error: soloErr } = await supabase
    .from("tournament_registrations")
    .select("tournament_id")
    .eq("member_user_id", memberUserId)
    .in("tournament_id", blockingIds);

  if (soloErr) throw new Error(soloErr.message);

  for (const reg of soloRegs ?? []) {
    const active = blockingById.get(reg.tournament_id as string);
    if (active) {
      return `Player is already registered in ${active.name}. Complete that event before registering elsewhere.`;
    }
  }

  const allTeams = await fetchTeams();
  for (const team of allTeams) {
    const onRoster = team.members.some(
      (m) => m.userId === memberUserId && (m.status === "captain" || m.status === "active"),
    );
    if (!onRoster || !team.activeTournamentId || team.activeTournamentId === tournamentId) {
      continue;
    }
    const active = blockingById.get(team.activeTournamentId);
    if (active) {
      return `Player is active on [${team.tag}] ${team.name} in ${team.activeTournamentName ?? active.name}.`;
    }
  }

  const { data: teamRegs, error: teamRegsErr } = await supabase
    .from("tournament_registrations")
    .select("tournament_id, roster_team_id")
    .in("tournament_id", blockingIds)
    .not("roster_team_id", "is", null);

  if (teamRegsErr) throw new Error(teamRegsErr.message);

  for (const reg of teamRegs ?? []) {
    const rosterTeamId = reg.roster_team_id as string;
    const team = allTeams.find((t) => t.id === rosterTeamId);
    if (!team) continue;
    const onRoster = team.members.some(
      (m) => m.userId === memberUserId && (m.status === "captain" || m.status === "active"),
    );
    if (!onRoster) continue;
    const active = blockingById.get(reg.tournament_id as string);
    if (active) {
      return `Player is registered with [${team.tag}] ${team.name} in ${active.name}.`;
    }
  }

  return null;
}

export async function assertMemberAvailableForTournament(
  memberUserId: string,
  tournamentId: string,
): Promise<void> {
  const reason = await getMemberTournamentBlockReason(memberUserId, tournamentId);
  if (reason) throw new Error(reason);
}
