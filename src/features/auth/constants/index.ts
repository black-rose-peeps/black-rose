/**
 * Auth-related constants.
 *
 * DISCORD_SERVER_INVITE — replace this with your actual Discord invite link.
 * You can find or generate it in your Discord server settings under Invites.
 * Example: "https://discord.gg/AbCdEfGh"
 */
export const DISCORD_SERVER_INVITE =
  import.meta.env.VITE_DISCORD_SERVER_INVITE ?? "https://discord.com/invite/blackrosehq";

/** Verification channel — # ✅ㆍverification */
export const DISCORD_VERIFICATION_CHANNEL_URL =
  "https://discord.com/channels/1193921905795792906/1196472627439599716";

/** OAuth2 CSRF state — stored in localStorage so callback works across tabs after Discord app OAuth. */
export const DISCORD_OAUTH_STATE_KEY = "br_discord_oauth_state";

/** Redirect URI used for the in-flight OAuth request (must match token exchange). */
export const DISCORD_OAUTH_REDIRECT_KEY = "br_discord_oauth_redirect";

/** Set after first successful Discord OAuth — skips repeat consent screens on login. */
export const DISCORD_LINKED_KEY = "br_discord_linked";
