/**
 * Discord OAuth2 client helpers
 *
 * Flow:
 *  1. startDiscordOAuth() → redirect to Discord consent screen
 *  2. Discord redirects to /auth/callback?code=...&state=...
 *  3. Callback page calls completeDiscordAuth server function
 *
 * Docs: https://docs.discord.com/developers/topics/oauth2
 * API base: https://discord.com/api/v10
 */

import { getDiscordRedirectUri, isAllowedDiscordRedirectUri } from "@/lib/app-url";
import {
  DISCORD_LINKED_KEY,
  DISCORD_OAUTH_REDIRECT_KEY,
  DISCORD_OAUTH_STATE_KEY,
} from "../constants";

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID ?? "";
const DISCORD_SCOPES = ["identify", "email", "connections"].join(" ");

export function isDiscordOAuthConfigured(): boolean {
  return Boolean(DISCORD_CLIENT_ID);
}

/** Build the Discord OAuth2 authorization URL with CSRF state. */
export function getDiscordOAuthUrl(state: string): string {
  if (!DISCORD_CLIENT_ID) {
    throw new Error(
      "VITE_DISCORD_CLIENT_ID is not set. Add it to your .env file from the Discord Developer Portal.",
    );
  }

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: getDiscordRedirectUri(),
    response_type: "code",
    scope: DISCORD_SCOPES,
    state,
  });

  // Returning users: skip consent if Discord already authorized this app.
  // First-time users omit prompt so Discord shows the consent screen once.
  if (typeof window !== "undefined" && localStorage.getItem(DISCORD_LINKED_KEY) === "1") {
    params.set("prompt", "none");
  }

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export function markDiscordLinked(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISCORD_LINKED_KEY, "1");
}

export function clearDiscordLinked(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DISCORD_LINKED_KEY);
}

/** Redirect the browser to Discord OAuth. Stores CSRF state in sessionStorage. */
export function startDiscordOAuth(): void {
  const state = crypto.randomUUID();
  const redirectUri = getDiscordRedirectUri();
  sessionStorage.setItem(DISCORD_OAUTH_STATE_KEY, state);
  sessionStorage.setItem(DISCORD_OAUTH_REDIRECT_KEY, redirectUri);
  window.location.href = getDiscordOAuthUrl(state);
}

export function readStoredOAuthState(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(DISCORD_OAUTH_STATE_KEY);
}

export function clearStoredOAuthState(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DISCORD_OAUTH_STATE_KEY);
  sessionStorage.removeItem(DISCORD_OAUTH_REDIRECT_KEY);
}

/** Redirect URI from the OAuth request that sent the user to Discord. */
export function readStoredOAuthRedirectUri(): string | null {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(DISCORD_OAUTH_REDIRECT_KEY);
  if (stored && isAllowedDiscordRedirectUri(stored)) return stored;
  return null;
}

export function validateOAuthState(returnedState: string | undefined): boolean {
  const expected = readStoredOAuthState();
  clearStoredOAuthState();
  return Boolean(expected && returnedState && expected === returnedState);
}

/** Discord returns error=consent_required when prompt=none but auth was revoked. */
export function shouldRetryDiscordWithConsent(errorCode: string | undefined): boolean {
  return errorCode === "consent_required" || errorCode === "interaction_required";
}
