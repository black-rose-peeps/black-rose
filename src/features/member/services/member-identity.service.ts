import { supabase } from "@/lib/supabase";
import type { Team } from "@/features/teams/types";
import {
  getActiveRosterMembers,
  listRosterMembersMissingIdentity,
  type MemberIdentityRecord,
  type RosterIdentityGap,
} from "@/features/member/utils/roster-identity";
import { parseGameIdentitiesFromRow } from "@/features/member/utils/game-identity";

export async function fetchMemberIdentityRecords(
  memberIds: string[],
): Promise<Map<string, MemberIdentityRecord>> {
  const unique = [...new Set(memberIds.filter(Boolean))];
  if (!unique.length) return new Map();

  const { data: profiles, error: profileError } = await supabase
    .from("member_profiles")
    .select(
      "member_id, display_name, main_game, valorant_game_name, valorant_tagline, game_identities, ingame_display_name",
    )
    .in("member_id", unique);

  if (profileError) {
    console.error("[member-identity] profile lookup failed:", profileError.message);
    return new Map();
  }

  const { data: members, error: memberError } = await supabase
    .from("members")
    .select("id, username")
    .in("id", unique);

  if (memberError) {
    console.error("[member-identity] member lookup failed:", memberError.message);
  }

  const usernames = new Map(
    (members ?? []).map((row) => [row.id as string, row.username as string]),
  );

  const result = new Map<string, MemberIdentityRecord>();
  for (const row of profiles ?? []) {
    const memberId = row.member_id as string;
    const username = usernames.get(memberId) ?? "";
    const displayName = (row.display_name as string | null)?.trim() || username;

    result.set(memberId, {
      mainGame: (row.main_game as string | null)?.trim() ?? "",
      valorantGameName: (row.valorant_game_name as string | null)?.trim() ?? "",
      valorantTagline: (row.valorant_tagline as string | null)?.trim() ?? "",
      gameIdentities: parseGameIdentitiesFromRow({
        game_identities: row.game_identities,
        ingame_display_name: row.ingame_display_name as string | null,
        main_game: row.main_game as string | null,
      }),
      displayName,
      username,
    });
  }

  for (const memberId of unique) {
    if (result.has(memberId)) continue;
    const username = usernames.get(memberId) ?? memberId;
    result.set(memberId, {
      mainGame: "",
      valorantGameName: "",
      valorantTagline: "",
      gameIdentities: {},
      displayName: username,
      username,
    });
  }

  return result;
}

export async function fetchRosterIdentityGapsForTeam(
  team: Team,
  tournamentGame: string,
): Promise<RosterIdentityGap[]> {
  const memberIds = getActiveRosterMembers(team).map((m) => m.userId);
  const identities = await fetchMemberIdentityRecords(memberIds);
  return listRosterMembersMissingIdentity(team, tournamentGame, identities);
}

export async function fetchRosterIdentityGapsForTeams(
  teams: Team[],
  tournamentGame: string,
): Promise<Map<string, RosterIdentityGap[]>> {
  const memberIds = [
    ...new Set(teams.flatMap((team) => getActiveRosterMembers(team).map((m) => m.userId))),
  ];
  const identities = await fetchMemberIdentityRecords(memberIds);

  return new Map(
    teams.map((team) => [
      team.id,
      listRosterMembersMissingIdentity(team, tournamentGame, identities),
    ]),
  );
}
