import { rowToAdminMember } from "@/features/admin/features/members/utils";
import type { AdminMember } from "@/features/admin/features/members/types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { DiscordOAuthUser } from "./discord-api.server";

export async function findMemberById(id: string): Promise<AdminMember | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("members").select("*").eq("id", id).maybeSingle();

  if (error) throw new Error(error.message);
  return data ? rowToAdminMember(data) : null;
}

async function findMemberByDiscordId(discordId: string): Promise<AdminMember | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("discord_id", discordId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? rowToAdminMember(data) : null;
}

async function findMemberByUsername(username: string): Promise<AdminMember | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .ilike("username", username)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? rowToAdminMember(data) : null;
}

async function pickUniqueUsername(baseUsername: string, discordId: string): Promise<string> {
  const normalized = baseUsername.trim().slice(0, 32) || `member_${discordId.slice(-6)}`;
  const existing = await findMemberByUsername(normalized);
  if (!existing) return normalized;

  const suffix = discordId.slice(-4);
  const withSuffix = `${normalized.slice(0, 27)}_${suffix}`;
  const collision = await findMemberByUsername(withSuffix);
  if (!collision) return withSuffix;

  return `${normalized.slice(0, 20)}_${discordId.slice(-8)}`;
}

/**
 * Create or update a member row from a Discord OAuth profile.
 * New members always start as "Not Verified".
 */
export async function upsertMemberFromDiscord(discordUser: DiscordOAuthUser): Promise<AdminMember> {
  const supabase = getSupabaseAdmin();
  const discordId = discordUser.id;
  const discordUsername = discordUser.username;
  const existing = await findMemberByDiscordId(discordId);

  if (existing) {
    const updates: Record<string, string> = {};
    if (existing.discordUsername !== discordUsername) {
      updates.discord_username = discordUsername;
    }

    if (Object.keys(updates).length === 0) return existing;

    const { data, error } = await supabase
      .from("members")
      .update(updates)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return rowToAdminMember(data);
  }

  const username = await pickUniqueUsername(discordUsername, discordId);
  const { data, error } = await supabase
    .from("members")
    .insert({
      username,
      discord_username: discordUsername,
      discord_id: discordId,
      status: "Not Verified",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      const raced = await findMemberByDiscordId(discordId);
      if (raced) return raced;
    }
    throw new Error(error.message);
  }

  return rowToAdminMember(data);
}
