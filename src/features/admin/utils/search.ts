import type { AdminMember } from "@/features/admin/features/members/types";
import type { ParticipantRow } from "@/features/admin/features/participants/types";
import type { Team } from "@/features/teams/types";

/** Case-insensitive match when query is non-empty; empty query matches all. */
export function matchesAdminSearch(
  query: string,
  ...fields: (string | null | undefined)[]
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return fields.some((field) => field?.toLowerCase().includes(normalized));
}

/** Admin members list — display name or Discord username. */
export function matchesAdminMemberDirectorySearch(query: string, member: AdminMember): boolean {
  return matchesAdminSearch(query, member.displayName, member.discordUsername);
}

/** Admin teams list — team name/tag or any roster member's display name / Discord username. */
export function matchesAdminTeamDirectorySearch(query: string, team: Team): boolean {
  if (matchesAdminSearch(query, team.name, team.tag)) return true;

  return team.members.some((member) => {
    if (member.status === "removed") return false;
    return matchesAdminSearch(query, member.displayName, member.discordUsername);
  });
}

/** Admin participants list — entry name, tournament, captain, or roster Discord / IGN. */
export function matchesAdminParticipantDirectorySearch(
  query: string,
  participant: ParticipantRow,
): boolean {
  if (
    matchesAdminSearch(
      query,
      participant.name,
      participant.tag,
      participant.tournamentName,
      participant.captain,
    )
  ) {
    return true;
  }

  return participant.members.some((member) =>
    matchesAdminSearch(query, member.discord, member.ign),
  );
}
