import type { Game, GameWithRoles, CreateGameInput, UpdateGameInput } from "../services/games.service";

export type { Game, GameWithRoles, CreateGameInput, UpdateGameInput };

export interface GameFormData {
  name: string;
  slug: string;
  display_name: string;
  identity_group: string;
  identity_field_label: string;
  identity_field_placeholder: string;
  identity_helper_text: string;
  accent_class: string;
  tournament_header_image: string;
  icon: string;
  is_active: boolean;
  sort_order: string;
}
