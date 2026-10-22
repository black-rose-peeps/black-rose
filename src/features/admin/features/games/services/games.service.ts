import { getSupabaseClient } from "@/lib/supabase";
import type { GameProfileFieldConfig } from "@/features/game-membership/types";
import {
  createGameRequest,
  updateGameRequest,
  deleteGameRequest,
  addGameRoleRequest,
  removeGameRoleRequest,
} from "../functions/games.functions";

export interface Game {
  id: string;
  name: string;
  slug: string;
  display_name: string;
  identity_group: string | null;
  identity_field_label: string | null;
  identity_field_placeholder: string | null;
  identity_helper_text: string | null;
  accent_class: string;
  tournament_header_image: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  profile_field_config?: GameProfileFieldConfig;
}

export interface GameRole {
  id: string;
  game_id: string;
  role_name: string;
  is_active?: boolean;
  created_at: string;
}

export interface GameWithRoles extends Game {
  roles: GameRole[];
}

export interface CreateGameInput {
  profile_field_config?: GameProfileFieldConfig;
  name: string;
  slug: string;
  display_name: string;
  identity_group?: string | null;
  identity_field_label?: string | null;
  identity_field_placeholder?: string | null;
  identity_helper_text?: string | null;
  accent_class?: string;
  tournament_header_image?: string | null;
  icon?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateGameInput {
  profile_field_config?: GameProfileFieldConfig;
  name?: string;
  slug?: string;
  display_name?: string;
  identity_group?: string | null;
  identity_field_label?: string | null;
  identity_field_placeholder?: string | null;
  identity_helper_text?: string | null;
  accent_class?: string;
  tournament_header_image?: string | null;
  icon?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

const supabase = getSupabaseClient();

export async function getGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getActiveGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getGameById(id: string): Promise<Game | null> {
  const { data, error } = await supabase.from("games").select("*").eq("id", id).single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }
  return data;
}

export async function getGameBySlug(slug: string): Promise<Game | null> {
  const { data, error } = await supabase.from("games").select("*").eq("slug", slug).single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }
  return data;
}

export async function getGamesWithRoles(): Promise<GameWithRoles[]> {
  const { data, error } = await supabase
    .from("games")
    .select(
      `
      *,
      game_roles (*)
    `,
    )
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data || []).map((game: Game & { game_roles?: GameRole[] }) => ({
    ...game,
    roles: game.game_roles || [],
  }));
}

export async function createGame(input: CreateGameInput): Promise<Game> {
  return createGameRequest({ data: input });
}

export async function updateGame(id: string, input: UpdateGameInput): Promise<Game> {
  return updateGameRequest({ data: { id, input } });
}

export async function deleteGame(id: string): Promise<void> {
  return deleteGameRequest({ data: { id } });
}

export async function addGameRole(gameId: string, roleName: string): Promise<GameRole> {
  return addGameRoleRequest({ data: { gameId, roleName } });
}

export async function removeGameRole(roleId: string): Promise<void> {
  return removeGameRoleRequest({ data: { roleId } });
}

export async function getGameRoles(gameId: string): Promise<GameRole[]> {
  const { data, error } = await supabase
    .from("game_roles")
    .select("*")
    .eq("game_id", gameId)
    .order("role_name", { ascending: true });

  if (error) throw error;
  return data || [];
}
