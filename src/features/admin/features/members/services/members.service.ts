import { supabase } from "@/lib/supabase";
import type { AdminMember, CreateMemberInput, MemberVerificationStatus } from "../types";
import { rowToAdminMember } from "../utils";

function throwMemberUniqueViolation(error: { message: string }): never {
  const msg = error.message;
  if (msg.includes("discord_username")) {
    throw new Error("That Discord username is already registered.");
  }
  if (msg.includes("discord_id")) {
    throw new Error("That Discord ID is already linked to another member.");
  }
  if (msg.includes("username")) {
    throw new Error("That username is already registered.");
  }
  throw new Error(msg);
}

export async function fetchMembers(): Promise<AdminMember[]> {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToAdminMember);
}

export async function fetchMemberById(id: string): Promise<AdminMember | null> {
  const { data, error } = await supabase.from("members").select("*").eq("id", id).single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw new Error(error.message);
  }
  return data ? rowToAdminMember(data) : null;
}

export async function createMember(input: CreateMemberInput): Promise<AdminMember> {
  const { data, error } = await supabase
    .from("members")
    .insert({
      username: input.username,
      discord_username: input.discordUsername,
      discord_id: input.discordId ?? null,
      status: input.status,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throwMemberUniqueViolation(error);
    throw new Error(error.message);
  }

  return rowToAdminMember(data);
}

export async function updateMemberVerificationStatus(
  id: string,
  status: MemberVerificationStatus,
): Promise<AdminMember> {
  const { data, error } = await supabase
    .from("members")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToAdminMember(data);
}

export async function updateMember(
  id: string,
  input: CreateMemberInput,
): Promise<AdminMember> {
  const { data, error } = await supabase
    .from("members")
    .update({
      username: input.username,
      discord_username: input.discordUsername,
      discord_id: input.discordId ?? null,
      status: input.status,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throwMemberUniqueViolation(error);
    throw new Error(error.message);
  }

  return rowToAdminMember(data);
}

export interface InviteSearchMember {
  id: string;
  username: string;
  displayName: string;
  avatarInitials: string;
}

export interface InviteSearchResult {
  members: InviteSearchMember[];
  total: number;
  page: number;
  pageSize: number;
}

const INVITE_SEARCH_PAGE_SIZE = 8;

function rowToInviteSearchMember(row: Record<string, unknown>): InviteSearchMember {
  const username = row.username as string;
  return {
    id: row.id as string,
    username,
    displayName: username,
    avatarInitials: username.slice(0, 2).toUpperCase(),
  };
}

/** Search verified members available for team invites (paginated). */
export async function searchVerifiedMembersForInvite(
  query: string,
  excludeIds: string[] = [],
  options?: { page?: number; pageSize?: number },
): Promise<InviteSearchResult> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.max(1, options?.pageSize ?? INVITE_SEARCH_PAGE_SIZE);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let builder = supabase
    .from("members")
    .select("id, username, discord_username", { count: "exact" })
    .eq("status", "Verified")
    .order("username", { ascending: true });

  const trimmed = query.trim();
  if (trimmed) {
    builder = builder.or(`username.ilike.%${trimmed}%,discord_username.ilike.%${trimmed}%`);
  }

  if (excludeIds.length > 0) {
    builder = builder.not("id", "in", `(${excludeIds.map((id) => `"${id}"`).join(",")})`);
  }

  const { data, error, count } = await builder.range(from, to);
  if (error) throw new Error(error.message);

  return {
    members: (data ?? []).map((row) => rowToInviteSearchMember(row as Record<string, unknown>)),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function deleteMember(id: string): Promise<void> {
  const { data: onTeam, error: teamErr } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", id)
    .in("status", ["captain", "active"])
    .limit(1);

  if (teamErr) throw new Error(teamErr.message);
  if (onTeam && onTeam.length > 0) {
    throw new Error("Remove this member from their team before deleting.");
  }

  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
