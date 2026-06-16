/**
 * Discord OAuth2 client helpers
 *
 * Flow:
 *  1. prepareDiscordOAuth() → store CSRF state, show Discord app modal
 *  2. Discord redirects to /auth/callback?code=...&state=...
 *  3. Callback page calls completeDiscordAuth server function
 *
 * Docs: https://docs.discord.com/developers/topics/oauth2
 * API base: https://discord.com/api/v10
 */

import { getDiscordRedirectUri, isAllowedDiscordRedirectUri } from "@/lib/app-url";
import { openDiscordApp } from "@/lib/discord-url";
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

function persistOAuthRequest(state: string, redirectUri: string): void {
  try {
    localStorage.setItem(DISCORD_OAUTH_STATE_KEY, state);
  } catch {
    // Private mode or quota — sessionStorage may still work.
  }
  try {
    localStorage.setItem(DISCORD_OAUTH_REDIRECT_KEY, redirectUri);
  } catch {
    // Ignore — redirect URI may still be recoverable from sessionStorage.
  }
  try {
    sessionStorage.setItem(DISCORD_OAUTH_STATE_KEY, state);
  } catch {
    // Ignore — localStorage may still hold state for the callback tab.
  }
  try {
    sessionStorage.setItem(DISCORD_OAUTH_REDIRECT_KEY, redirectUri);
  } catch {
    // Ignore
  }
}

/** Store OAuth CSRF state and return the authorize URL (does not open Discord yet). */
export function prepareDiscordOAuth(): { browserFallbackUrl: string } {
  const state = crypto.randomUUID();
  const redirectUri = getDiscordRedirectUri();
  persistOAuthRequest(state, redirectUri);
  return { browserFallbackUrl: getDiscordOAuthUrl(state) };
}

/** Open the in-flight OAuth authorize URL in the Discord app (foreground). */
export function openPreparedDiscordOAuthInApp(browserFallbackUrl: string): void {
  openDiscordApp(browserFallbackUrl);
}

/** Full browser redirect for users without the Discord app installed. */
export function continueDiscordOAuthInBrowser(): void {
  const storedState = readStoredOAuthState();
  const state = storedState ?? crypto.randomUUID();
  if (!storedState) {
    persistOAuthRequest(state, getDiscordRedirectUri());
  }
  window.location.href = getDiscordOAuthUrl(state);
}

export function readStoredOAuthState(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(DISCORD_OAUTH_STATE_KEY) ??
    sessionStorage.getItem(DISCORD_OAUTH_STATE_KEY)
  );
}

export function clearStoredOAuthState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DISCORD_OAUTH_STATE_KEY);
  localStorage.removeItem(DISCORD_OAUTH_REDIRECT_KEY);
  sessionStorage.removeItem(DISCORD_OAUTH_STATE_KEY);
  sessionStorage.removeItem(DISCORD_OAUTH_REDIRECT_KEY);
}

/** Redirect URI from the OAuth request that sent the user to Discord. */
export function readStoredOAuthRedirectUri(): string | null {
  if (typeof window === "undefined") return null;
  const stored =
    localStorage.getItem(DISCORD_OAUTH_REDIRECT_KEY) ??
    sessionStorage.getItem(DISCORD_OAUTH_REDIRECT_KEY);
  if (stored && isAllowedDiscordRedirectUri(stored)) return stored;
  return null;
}

export function validateOAuthState(returnedState: string | undefined): boolean {
  const expected = readStoredOAuthState();
  return Boolean(expected && returnedState && expected === returnedState);
}

/** Discord returns error=consent_required when prompt=none but auth was revoked. */
export function shouldRetryDiscordWithConsent(errorCode: string | undefined): boolean {
  return errorCode === "consent_required" || errorCode === "interaction_required";
}

/** Retry OAuth in the Discord app after a consent_required error. */
export function retryDiscordOAuthInApp(): void {
  const { browserFallbackUrl } = prepareDiscordOAuth();
  openPreparedDiscordOAuthInApp(browserFallbackUrl);
}

/** Retry OAuth entirely in the browser. */
export function retryDiscordOAuthInBrowser(): void {
  prepareDiscordOAuth();
  continueDiscordOAuthInBrowser();
}
