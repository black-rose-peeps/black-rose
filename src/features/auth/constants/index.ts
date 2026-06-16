/**
 * Auth-related constants — Black Rose official Discord server.
 */
export const DISCORD_SERVER_INVITE =
  import.meta.env.VITE_DISCORD_SERVER_INVITE ?? "https://discord.com/invite/blackrosehq";

/** Official #✅ㆍverification channel deep link. */
export const DISCORD_VERIFICATION_CHANNEL_URL =
  import.meta.env.VITE_DISCORD_VERIFICATION_CHANNEL_URL ??
  "https://discord.com/channels/1193921905795792906/1196472627439599716";

/** Label shown on the waitlist for the verification channel. */
export const DISCORD_VERIFICATION_CHANNEL_LABEL =
  import.meta.env.VITE_DISCORD_VERIFICATION_CHANNEL_LABEL ?? "✅ㆍverification";

/** OAuth2 CSRF state — stored in localStorage and sessionStorage for cross-tab OAuth. */
export const DISCORD_OAUTH_STATE_KEY = "br_discord_oauth_state";

/** Redirect URI used for the in-flight OAuth request (must match token exchange). */
export const DISCORD_OAUTH_REDIRECT_KEY = "br_discord_oauth_redirect";

/** Set after first successful Discord OAuth — skips repeat consent screens on login. */
export const DISCORD_LINKED_KEY = "br_discord_linked";
