import { getSupabaseClient } from "@/lib/supabase";

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
}

export interface GameRole {
  id: string;
  game_id: string;
  role_name: string;
  created_at: string;
}

export interface GameWithRoles extends Game {
  roles: GameRole[];
}

export interface CreateGameInput {
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
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }
  return data;
}

export async function getGameBySlug(slug: string): Promise<Game | null> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }
  return data;
}

export async function getGamesWithRoles(): Promise<GameWithRoles[]> {
  const { data, error } = await supabase
    .from("games")
    .select(`
      *,
      game_roles (*)
    `)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data || []).map((game: any) => ({
    ...game,
    roles: game.game_roles || [],
  }));
}

export async function createGame(input: CreateGameInput): Promise<Game> {
  // Auto-calculate sort order if not provided
  let sortOrder = input.sort_order;
  if (sortOrder === undefined || sortOrder === null) {
    const { data: existingGames } = await supabase
      .from("games")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    sortOrder = existingGames && existingGames.length > 0 ? existingGames[0].sort_order + 1 : 0;
  }

  const { data, error } = await supabase
    .from("games")
    .insert({
      name: input.name,
      slug: input.slug,
      display_name: input.display_name,
      identity_group: input.identity_group || null,
      identity_field_label: input.identity_field_label || null,
      identity_field_placeholder: input.identity_field_placeholder || null,
      identity_helper_text: input.identity_helper_text || null,
      accent_class: input.accent_class || "from-white/10 via-white/5 to-transparent",
      tournament_header_image: input.tournament_header_image || null,
      icon: input.icon || null,
      is_active: input.is_active !== undefined ? input.is_active : true,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGame(id: string, input: UpdateGameInput): Promise<Game> {
  const updateData: any = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.slug !== undefined) updateData.slug = input.slug;
  if (input.display_name !== undefined) updateData.display_name = input.display_name;
  if (input.identity_group !== undefined) updateData.identity_group = input.identity_group;
  if (input.identity_field_label !== undefined) updateData.identity_field_label = input.identity_field_label;
  if (input.identity_field_placeholder !== undefined) updateData.identity_field_placeholder = input.identity_field_placeholder;
  if (input.identity_helper_text !== undefined) updateData.identity_helper_text = input.identity_helper_text;
  if (input.accent_class !== undefined) updateData.accent_class = input.accent_class;
  if (input.tournament_header_image !== undefined) updateData.tournament_header_image = input.tournament_header_image;
  if (input.icon !== undefined) updateData.icon = input.icon;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;
  if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;

  const { data, error } = await supabase
    .from("games")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGame(id: string): Promise<void> {
  const { error } = await supabase.from("games").delete().eq("id", id);
  if (error) throw error;
}

export async function addGameRole(gameId: string, roleName: string): Promise<GameRole> {
  const { data, error } = await supabase
    .from("game_roles")
    .insert({ game_id: gameId, role_name: roleName })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeGameRole(roleId: string): Promise<void> {
  const { error } = await supabase.from("game_roles").delete().eq("id", roleId);
  if (error) throw error;
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
