export const MEMBER_READ_COLUMNS =
  "id, username, discord_username, discord_id, status, registered_at, created_at";

/** Slimmer read for background access / verification polling. */
export const MEMBER_ACCESS_COLUMNS =
  "id, username, discord_username, discord_id, status, registered_at, created_at";

export const PROFILE_READ_COLUMNS =
  "id, member_id, slug, display_name, headline, bio, main_game, main_role, region, valorant_game_name, valorant_tagline, ingame_display_name, game_identities, avatar_url, banner_url, is_public, created_at, updated_at";

export const SOCIAL_READ_COLUMNS = "id, member_id, platform, url, is_public";
