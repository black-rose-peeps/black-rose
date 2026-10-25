import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  assertTrustedOrigin,
  requireAdminSession,
} from "@/features/auth/server/trusted-session.server";
import { requireUuid } from "@/features/game-membership/rules";
import { parseCreateGameInput, parseUpdateGameInput } from "../utils/game-input";
import type { CreateGameInput, Game, GameRole, UpdateGameInput } from "../services/games.service";

async function adminClient() {
  assertTrustedOrigin();
  await requireAdminSession();
  return getSupabaseAdmin();
}

export async function createGame(value: CreateGameInput): Promise<Game> {
  const client = await adminClient();
  const input = parseCreateGameInput(value);
  let sortOrder = input.sort_order;
  if (sortOrder === undefined) {
    const { data, error } = await client
      .from("games")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    sortOrder = data?.length ? Number(data[0].sort_order) + 1 : 0;
  }
  const { data, error } = await client
    .from("games")
    .insert({
      ...input,
      identity_group: input.identity_group || null,
      identity_field_label: input.identity_field_label || null,
      identity_field_placeholder: input.identity_field_placeholder || null,
      identity_helper_text: input.identity_helper_text || null,
      accent_class: input.accent_class || "from-white/10 via-white/5 to-transparent",
      tournament_header_image: input.tournament_header_image || null,
      icon: input.icon || null,
      is_active: input.is_active ?? true,
      sort_order: sortOrder,
      profile_field_config: input.profile_field_config ?? {},
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Game;
}

export async function updateGame(id: string, value: UpdateGameInput): Promise<Game> {
  const client = await adminClient();
  requireUuid(id, "gameId");
  const input = parseUpdateGameInput(value);
  const { data, error } = await client.from("games").update(input).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data as Game;
}

export async function deleteGame(id: string): Promise<void> {
  const client = await adminClient();
  requireUuid(id, "gameId");
  for (const table of [
    "tournaments",
    "teams",
    "member_game_profiles",
    "game_memberships",
    "game_membership_events",
  ]) {
    const { data, error } = await client.from(table).select("game_id").eq("game_id", id).limit(1);
    if (error) throw new Error(error.message);
    if (data?.length)
      throw new Error(
        "This game is still referenced. Deactivate it instead to preserve saved profiles, rosters and history.",
      );
  }
  const { error } = await client.from("games").delete().eq("id", id);
  if (error?.code === "23503")
    throw new Error("This game is still referenced. Deactivate it instead.");
  if (error) throw new Error(error.message);
}

export async function addGameRole(gameId: string, roleName: string): Promise<GameRole> {
  const client = await adminClient();
  requireUuid(gameId, "gameId");
  if (
    typeof roleName !== "string" ||
    !roleName.trim() ||
    roleName.length > 160 ||
    /[\r\n\t]/.test(roleName)
  )
    throw new Error("Enter a valid role name of at most 160 characters.");
  const { data, error } = await client
    .from("game_roles")
    .insert({ game_id: gameId, role_name: roleName.trim(), is_active: true })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as GameRole;
}

export async function removeGameRole(roleId: string): Promise<void> {
  const client = await adminClient();
  requireUuid(roleId, "roleId");
  const retire = async () => {
    const { error } = await client.from("game_roles").update({ is_active: false }).eq("id", roleId);
    if (error) throw new Error(error.message);
  };
  const { data, error } = await client
    .from("member_game_profiles")
    .select("role_id")
    .eq("role_id", roleId)
    .limit(1);
  if (error) throw new Error(error.message);
  if (data?.length) return retire();
  const removed = await client.from("game_roles").delete().eq("id", roleId);
  // A concurrent profile save may have referenced the role after the preflight.
  if (removed.error?.code === "23503") return retire();
  if (removed.error) throw new Error(removed.error.message);
}
