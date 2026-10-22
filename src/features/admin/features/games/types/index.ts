import type {
  Game,
  GameWithRoles,
  CreateGameInput,
  UpdateGameInput,
} from "../services/games.service";
import type { GameProfileFieldConfig } from "@/features/game-membership/types";

export type { Game, GameWithRoles, CreateGameInput, UpdateGameInput };

export interface GameFormData {
  profile_field_config: GameProfileFieldConfig;
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
