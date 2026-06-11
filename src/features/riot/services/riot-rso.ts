/**
 * Riot Sign On (RSO) client helpers.
 *
 * Flow:
 *  1. startRiotOAuth() → redirect to Riot consent screen
 *  2. Riot redirects to /auth/riot/callback?code=...&state=...
 *  3. Callback page calls completeRiotAuth server function
 */

import { getRiotRedirectUri, isAllowedRiotRedirectUri } from "@/lib/riot-url";
import {
  RIOT_OAUTH_MEMBER_KEY,
  RIOT_OAUTH_PUBLIC_KEY,
  RIOT_OAUTH_REDIRECT_KEY,
  RIOT_OAUTH_REGION_KEY,
  RIOT_OAUTH_STATE_KEY,
} from "../constants";

const RIOT_RSO_CLIENT_ID = import.meta.env.VITE_RIOT_RSO_CLIENT_ID ?? "";
const RIOT_SCOPES = ["openid", "offline_access"].join(" ");

export function isRiotRsoConfigured(): boolean {
  return Boolean(RIOT_RSO_CLIENT_ID);
}

export function getRiotOAuthUrl(state: string): string {
  if (!RIOT_RSO_CLIENT_ID) {
    throw new Error(
      "VITE_RIOT_RSO_CLIENT_ID is not set. Add it from the Riot Developer Portal.",
    );
  }

  const params = new URLSearchParams({
    client_id: RIOT_RSO_CLIENT_ID,
    redirect_uri: getRiotRedirectUri(),
    response_type: "code",
    scope: RIOT_SCOPES,
    state,
  });

  return `https://auth.riotgames.com/authorize?${params.toString()}`;
}

export interface StartRiotOAuthOptions {
  memberId: string;
  isPublic: boolean;
  region?: string;
}

/** Redirect the browser to Riot RSO. Stores CSRF state in sessionStorage. */
export function startRiotOAuth(options: StartRiotOAuthOptions): void {
  const state = crypto.randomUUID();
  const redirectUri = getRiotRedirectUri();
  sessionStorage.setItem(RIOT_OAUTH_STATE_KEY, state);
  sessionStorage.setItem(RIOT_OAUTH_REDIRECT_KEY, redirectUri);
  sessionStorage.setItem(RIOT_OAUTH_MEMBER_KEY, options.memberId);
  sessionStorage.setItem(RIOT_OAUTH_PUBLIC_KEY, options.isPublic ? "1" : "0");
  sessionStorage.setItem(RIOT_OAUTH_REGION_KEY, options.region?.trim() ?? "");
  window.location.href = getRiotOAuthUrl(state);
}

export function readStoredRiotOAuthState(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(RIOT_OAUTH_STATE_KEY);
}

export function clearStoredRiotOAuthState(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(RIOT_OAUTH_STATE_KEY);
  sessionStorage.removeItem(RIOT_OAUTH_REDIRECT_KEY);
  sessionStorage.removeItem(RIOT_OAUTH_MEMBER_KEY);
  sessionStorage.removeItem(RIOT_OAUTH_PUBLIC_KEY);
  sessionStorage.removeItem(RIOT_OAUTH_REGION_KEY);
}

export function readStoredRiotOAuthRedirectUri(): string | null {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(RIOT_OAUTH_REDIRECT_KEY);
  if (stored && isAllowedRiotRedirectUri(stored)) return stored;
  return null;
}

export function readStoredRiotLinkContext(): {
  memberId: string;
  isPublic: boolean;
  region: string;
} | null {
  if (typeof window === "undefined") return null;
  const memberId = sessionStorage.getItem(RIOT_OAUTH_MEMBER_KEY);
  if (!memberId) return null;

  return {
    memberId,
    isPublic: sessionStorage.getItem(RIOT_OAUTH_PUBLIC_KEY) === "1",
    region: sessionStorage.getItem(RIOT_OAUTH_REGION_KEY) ?? "",
  };
}

export function validateRiotOAuthState(returnedState: string | undefined): boolean {
  const expected = readStoredRiotOAuthState();
  return Boolean(expected && returnedState && expected === returnedState);
}
