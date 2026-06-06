import { supabase } from "@/lib/supabase";
import type { AdminMember, CreateMemberInput } from "../types";
import { rowToAdminMember } from "../utils";

export async function fetchMembers(): Promise<AdminMember[]> {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("registered_at", { ascending: false });

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
      registered_at: new Date().toISOString().split("T")[0],
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      if (error.message.includes("username"))
        throw new Error("That username is already registered.");
      if (error.message.includes("discord_username"))
        throw new Error("That Discord username is already registered.");
      if (error.message.includes("discord_id"))
        throw new Error("That Discord ID is already linked to another member.");
    }
    throw new Error(error.message);
  }

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
    if (error.code === "23505") {
      if (error.message.includes("username"))
        throw new Error("That username is already registered.");
      if (error.message.includes("discord_username"))
        throw new Error("That Discord username is already registered.");
      if (error.message.includes("discord_id"))
        throw new Error("That Discord ID is already linked to another member.");
    }
    throw new Error(error.message);
  }

  return rowToAdminMember(data);
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
