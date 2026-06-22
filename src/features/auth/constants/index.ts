/**
 * Auth-related constants — Black Rose official Discord server.
 */
import { formatDiscordChannelLabel } from "@/lib/discord-channel-label";

export const DISCORD_SERVER_INVITE =
  import.meta.env.VITE_DISCORD_SERVER_INVITE ?? "https://discord.com/invite/blackrosehq";

/** Official #✅ㆍverification channel deep link. */
export const DISCORD_VERIFICATION_CHANNEL_URL =
  import.meta.env.VITE_DISCORD_VERIFICATION_CHANNEL_URL ??
  "https://discord.com/channels/1193921905795792906/1196472627439599716";

/** Label shown on the waitlist for the verification channel. */
export const DISCORD_VERIFICATION_CHANNEL_LABEL = formatDiscordChannelLabel(
  import.meta.env.VITE_DISCORD_VERIFICATION_CHANNEL_LABEL ?? "✅ㆍverification",
);

/** #tourna-roles — react-to-get ROSE / tournament / Valorant roles. */
export const DISCORD_TOURNA_ROLES_CHANNEL_URL =
  import.meta.env.VITE_DISCORD_TOURNA_ROLES_CHANNEL_URL ??
  "https://discord.com/channels/1193921905795792906/1517262068615614545";

export const DISCORD_TOURNA_ROLES_CHANNEL_LABEL = formatDiscordChannelLabel(
  import.meta.env.VITE_DISCORD_TOURNA_ROLES_CHANNEL_LABEL ?? "tourna-roles",
);

/** Discord role granted when staff approve a waitlist application. Unlocks #tourna-roles. */
export const DISCORD_FOR_BRIEFING_ROLE_LABEL =
  import.meta.env.VITE_DISCORD_FOR_BRIEFING_ROLE_LABEL ?? "For Briefing";

/** Public copy — all staff / tournament support is on the official Discord server. */
export const BLACK_ROSE_STAFF_CONTACT_SUMMARY =
  "Black Rose official Discord — admins & Valorant Operations";

export const BLACK_ROSE_STAFF_CONTACT_DETAIL =
  "All tournament questions, disputes, and staff support happen on the Black Rose official Discord server. Reach admins or Valorant Operations there.";

/** OAuth2 CSRF state — stored in localStorage and sessionStorage for cross-tab OAuth. */
export const DISCORD_OAUTH_STATE_KEY = "br_discord_oauth_state";

/** Redirect URI used for the in-flight OAuth request (must match token exchange). */
export const DISCORD_OAUTH_REDIRECT_KEY = "br_discord_oauth_redirect";

/** Set after first successful Discord OAuth — skips repeat consent screens on login. */
export const DISCORD_LINKED_KEY = "br_discord_linked";

/** Last Discord user id that completed OAuth in this browser — backup for linked detection. */
export const DISCORD_AUTHORIZED_USER_KEY = "br_discord_authorized_user";
