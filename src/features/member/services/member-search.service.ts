import { supabase } from "@/lib/supabase";
import { resolveMemberProfileSlug } from "@/features/member/utils/profile-slug";

export interface MemberDirectoryEntry {
  id: string;
  displayName: string;
  discordUsername: string;
  avatarInitials: string;
  avatarUrl: string | null;
  profileSlug: string;
}

export interface MemberDirectorySearchResult {
  members: MemberDirectoryEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export const MEMBER_DIRECTORY_PAGE_SIZE = 10;

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function rowToDirectoryEntry(row: Record<string, unknown>): MemberDirectoryEntry {
  const username = row.username as string;
  const discordUsername =
    (row.discord_username as string | null | undefined)?.trim() || username;
  const profiles = row.member_profiles as
    | { display_name?: string; avatar_url?: string | null; slug?: string | null }
    | Array<{ display_name?: string; avatar_url?: string | null; slug?: string | null }>
    | null
    | undefined;
  const profile = Array.isArray(profiles) ? profiles[0] : profiles;
  const displayName = profile?.display_name?.trim() || username;

  return {
    id: row.id as string,
    displayName,
    discordUsername,
    avatarInitials: initialsFromName(displayName),
    avatarUrl: profile?.avatar_url?.trim() || null,
    profileSlug: resolveMemberProfileSlug(profile?.slug, username),
  };
}

async function collectVerifiedMemberIds(query: string): Promise<string[]> {
  const pattern = `%${escapeIlikePattern(query)}%`;

  const [discordResult, profileResult] = await Promise.all([
    supabase
      .from("members")
      .select("id")
      .eq("status", "Verified")
      .ilike("discord_username", pattern),
    supabase
      .from("member_profiles")
      .select("member_id, members!inner(status)")
      .ilike("display_name", pattern)
      .eq("members.status", "Verified"),
  ]);

  if (discordResult.error) throw new Error(discordResult.error.message);
  if (profileResult.error) throw new Error(profileResult.error.message);

  const ids = new Set<string>();
  for (const row of discordResult.data ?? []) {
    ids.add(row.id);
  }
  for (const row of profileResult.data ?? []) {
    ids.add(row.member_id);
  }

  return [...ids];
}

/** Search verified members by display name or Discord username. */
export async function searchVerifiedMembersDirectory(
  query: string,
  page = 1,
): Promise<MemberDirectorySearchResult> {
  const trimmed = query.trim();
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * MEMBER_DIRECTORY_PAGE_SIZE;
  const to = from + MEMBER_DIRECTORY_PAGE_SIZE - 1;

  if (!trimmed) {
    return {
      members: [],
      total: 0,
      page: safePage,
      pageSize: MEMBER_DIRECTORY_PAGE_SIZE,
    };
  }

  const matchingIds = await collectVerifiedMemberIds(trimmed);
  const total = matchingIds.length;
  if (total === 0) {
    return {
      members: [],
      total: 0,
      page: safePage,
      pageSize: MEMBER_DIRECTORY_PAGE_SIZE,
    };
  }

  const { data, error } = await supabase
    .from("members")
    .select("id, username, discord_username, member_profiles(display_name, avatar_url, slug)")
    .in("id", matchingIds)
    .eq("status", "Verified")
    .order("display_name", { ascending: true, foreignTable: "member_profiles" })
    .order("username", { ascending: true })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    members: (data ?? []).map((row) => rowToDirectoryEntry(row as Record<string, unknown>)),
    total,
    page: safePage,
    pageSize: MEMBER_DIRECTORY_PAGE_SIZE,
  };
}
