/**
 * Discord OAuth2 — placeholder service
 *
 * When you're ready to wire up real Discord auth, replace the stubs below
 * with actual API calls. The Discord OAuth2 flow works like this:
 *
 *  1. Redirect the user to Discord's authorize URL (getDiscordOAuthUrl)
 *  2. Discord redirects back to your callback URL with a `code` query param
 *  3. Exchange the code for an access token (exchangeCodeForToken)
 *  4. Use the token to fetch the user's Discord profile (getDiscordUser)
 *  5. Create or look up the user in your database, then issue a session
 *
 * Docs: https://discord.com/developers/docs/topics/oauth2
 */

// ── Config (replace with real values from your Discord app dashboard) ──────
// https://discord.com/developers/applications → Your App → OAuth2

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID ?? "YOUR_CLIENT_ID";
const DISCORD_REDIRECT_URI =
  import.meta.env.VITE_DISCORD_REDIRECT_URI ?? "http://localhost:5173/auth/callback";
const DISCORD_SCOPES = ["identify", "email", "guilds"].join(" ");

// ── Types ───────────────────────────────────────────────────────────────────

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email: string | null;
  global_name: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build the Discord OAuth2 authorization URL.
 * Redirect the user here to start the login flow.
 */
export function getDiscordOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: DISCORD_SCOPES,
  });

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange the OAuth2 code for an access token.
 * Call this from a server function — never expose your client secret in the browser.
 *
 * @param code - The `code` query param from Discord's redirect callback
 * @returns The access token string
 *
 * TODO: Implement when backend is ready.
 */
export async function exchangeCodeForToken(_code: string): Promise<string> {
  throw new Error(
    "Discord OAuth2 not implemented yet. " +
      "Wire up a server function that calls https://discord.com/api/oauth2/token " +
      "with your client_id, client_secret, and the authorization code.",
  );
}

/**
 * Fetch the authenticated user's Discord profile.
 *
 * @param accessToken - Access token from exchangeCodeForToken
 * @returns DiscordUser profile object
 *
 * TODO: Implement when backend is ready.
 */
export async function getDiscordUser(_accessToken: string): Promise<DiscordUser> {
  throw new Error(
    "Discord OAuth2 not implemented yet. " +
      "Call GET https://discord.com/api/users/@me with the access token in the Authorization header.",
  );
}

/**
 * Trigger the Discord login flow from the browser.
 * Redirects the current page to Discord's OAuth2 consent screen.
 */
export function redirectToDiscordLogin(): void {
  window.location.href = getDiscordOAuthUrl();
}
