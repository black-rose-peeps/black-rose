/**
 * Auth-related constants.
 *
 * DISCORD_SERVER_INVITE — replace this with your actual Discord invite link.
 * You can find or generate it in your Discord server settings under Invites.
 * Example: "https://discord.gg/AbCdEfGh"
 */
export const DISCORD_SERVER_INVITE =
  import.meta.env.VITE_DISCORD_SERVER_INVITE ?? "https://discord.gg/BvFfZYe64m";

/** OAuth2 CSRF state — stored in sessionStorage between redirect and callback. */
export const DISCORD_OAUTH_STATE_KEY = "br_discord_oauth_state";

/** Set after first successful Discord OAuth — skips repeat consent screens on login. */
export const DISCORD_LINKED_KEY = "br_discord_linked";
