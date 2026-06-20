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
import { isDiscordPhoneOrTablet } from "@/lib/device";
import { openDiscordAppFromUserGesture } from "@/lib/discord-url";
import { createRandomUuid } from "@/lib/random-id";
import {
  DISCORD_AUTHORIZED_USER_KEY,
  DISCORD_LINKED_KEY,
  DISCORD_OAUTH_REDIRECT_KEY,
  DISCORD_OAUTH_STATE_KEY,
} from "../constants";

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID ?? "";
const DISCORD_SCOPES = ["identify", "email", "connections", "guilds.members.read"].join(" ");

export interface PrepareDiscordOAuthOptions {
  /** Force the Discord consent screen (after consent_required). */
  requireConsent?: boolean;
}

export {
  describeDiscordRedirectUri,
  isDiscordRedirectUnreachableOnDevice,
  isDiscordRejectedLanRedirectUri,
  isDiscordTunnelEnvMismatch,
  usesEnvDiscordRedirectUri,
} from "@/lib/app-url";

export function isDiscordOAuthConfigured(): boolean {
  return Boolean(DISCORD_CLIENT_ID);
}

/** True when the user can skip the Discord app modal (returning member). */
export function shouldSkipDiscordAppPrompt(): boolean {
  return isDiscordLinked() || readDiscordAppPromptSkip();
}

const DISCORD_APP_PROMPT_SKIP_KEY = "br_discord_app_prompt_skip";

export function readDiscordAppPromptSkip(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DISCORD_APP_PROMPT_SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeDiscordAppPromptSkip(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DISCORD_APP_PROMPT_SKIP_KEY, "1");
  } catch {
    // Storage may be unavailable.
  }
}

export function isDiscordLinked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(DISCORD_LINKED_KEY) === "1") return true;
    return Boolean(localStorage.getItem(DISCORD_AUTHORIZED_USER_KEY));
  } catch {
    return false;
  }
}

/** Persist that this browser completed Discord OAuth — enables prompt=none on return visits. */
export function markDiscordLinked(discordUserId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DISCORD_LINKED_KEY, "1");
    if (discordUserId?.trim()) {
      localStorage.setItem(DISCORD_AUTHORIZED_USER_KEY, discordUserId.trim());
    }
  } catch {
    // Storage may be unavailable (private mode, quota).
  }
}
export function getDiscordOAuthUrl(state: string, options?: PrepareDiscordOAuthOptions): string {
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

  if (!options?.requireConsent && isDiscordLinked()) {
    params.set("prompt", "none");
  }

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export function clearDiscordLinked(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DISCORD_LINKED_KEY);
    localStorage.removeItem(DISCORD_AUTHORIZED_USER_KEY);
  } catch {
    // Storage may be unavailable (private mode, quota).
  }
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
export function prepareDiscordOAuth(options?: PrepareDiscordOAuthOptions): {
  browserFallbackUrl: string;
} {
  const state = createRandomUuid();
  const redirectUri = getDiscordRedirectUri();
  persistOAuthRequest(state, redirectUri);
  return { browserFallbackUrl: getDiscordOAuthUrl(state, options) };
}

/** Open OAuth in the Discord app (preferred — uses the app account, not the browser). */
export function startDiscordOAuthInApp(options?: PrepareDiscordOAuthOptions): string {
  const { browserFallbackUrl } = prepareDiscordOAuth(options);
  openDiscordAppFromUserGesture(browserFallbackUrl);
  return browserFallbackUrl;
}

/** Full browser redirect — fallback when the Discord app is not installed. */
export function startDiscordOAuthInBrowser(options?: PrepareDiscordOAuthOptions): void {
  const { browserFallbackUrl } = prepareDiscordOAuth(options);
  window.location.assign(browserFallbackUrl);
}

/** Open the in-flight OAuth authorize URL in the Discord app (foreground). */
export function openPreparedDiscordOAuthInApp(browserFallbackUrl: string): void {
  openDiscordAppFromUserGesture(browserFallbackUrl);
}

/** Full browser redirect for users without the Discord app installed. */
export function continueDiscordOAuthInBrowser(options?: PrepareDiscordOAuthOptions): void {
  const storedState = readStoredOAuthState();
  const state = storedState ?? createRandomUuid();
  if (!storedState) {
    persistOAuthRequest(state, getDiscordRedirectUri());
  }
  window.location.href = getDiscordOAuthUrl(state, options);
}

export function readStoredOAuthState(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(DISCORD_OAUTH_STATE_KEY) ?? sessionStorage.getItem(DISCORD_OAUTH_STATE_KEY)
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

/** Platform-aware OAuth entry — browser on mobile, Discord app on desktop. */
export function startDiscordOAuth(options?: PrepareDiscordOAuthOptions): void {
  if (isDiscordPhoneOrTablet()) {
    startDiscordOAuthInBrowser(options);
    return;
  }
  startDiscordOAuthInApp(options);
}

/** Retry OAuth after consent_required — same platform rules as startDiscordOAuth. */
export function retryDiscordOAuthAfterConsentRequired(): void {
  startDiscordOAuth({ requireConsent: true });
}

/** Retry OAuth in the Discord app after a consent_required error (desktop). */
export function retryDiscordOAuthInApp(): void {
  startDiscordOAuthInApp({ requireConsent: true });
}

/** Retry OAuth entirely in the browser. */
export function retryDiscordOAuthInBrowser(): void {
  startDiscordOAuthInBrowser({ requireConsent: true });
}
