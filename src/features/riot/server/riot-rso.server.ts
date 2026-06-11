import { isAllowedRiotRedirectUri } from "@/lib/riot-url";

const RIOT_AUTH_BASE = "https://auth.riotgames.com";
const RIOT_FETCH_TIMEOUT_MS = 8000;
const RIOT_USER_AGENT = "BlackRoseArena (https://black-rose-six.vercel.app, 1.0.0)";

export type RiotAccountCluster = "americas" | "europe" | "asia";

export class RiotApiError extends Error {
  readonly status: number;

  constructor(status: number, detail: string) {
    super(`Riot API request failed (${status}): ${detail}`);
    this.name = "RiotApiError";
    this.status = status;
  }
}

export interface RiotOAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  expiresIn: number;
  scope: string;
}

export interface RiotAccountIdentity {
  puuid: string;
  gameName: string;
  tagLine: string;
  subject: string | null;
}

interface RiotTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface RiotAccountMeResponse {
  puuid: string;
  gameName: string;
  tagLine: string;
}

function getRiotClientId(): string {
  const clientId =
    process.env.RIOT_RSO_CLIENT_ID ?? process.env.VITE_RIOT_RSO_CLIENT_ID;
  if (!clientId) {
    throw new Error("RIOT_RSO_CLIENT_ID is not configured.");
  }
  return clientId;
}

function getRiotClientSecret(): string {
  const secret = process.env.RIOT_RSO_CLIENT_SECRET;
  if (!secret) {
    throw new Error("RIOT_RSO_CLIENT_SECRET is not configured.");
  }
  return secret;
}

export function getRiotApiKey(): string {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    throw new Error("RIOT_API_KEY is not configured.");
  }
  return apiKey;
}

export function getRiotAccountCluster(): RiotAccountCluster {
  const value = (process.env.RIOT_ACCOUNT_CLUSTER ?? "asia").toLowerCase();
  if (value === "americas" || value === "europe" || value === "asia") return value;
  return "asia";
}

function riotClusterBase(cluster: RiotAccountCluster): string {
  return `https://${cluster}.api.riotgames.com`;
}

async function riotFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RIOT_FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function basicAuthHeader(): string {
  const credentials = `${getRiotClientId()}:${getRiotClientSecret()}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

function decodeJwtSubject(idToken: string | null): string | null {
  if (!idToken) return null;
  const parts = idToken.split(".");
  if (parts.length < 2) return null;

  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      sub?: string;
    };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/** Exchange RSO authorization code for tokens (server-only). */
export async function exchangeRiotCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<RiotOAuthTokens> {
  if (!isAllowedRiotRedirectUri(redirectUri)) {
    throw new Error("Invalid Riot redirect URI.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const response = await riotFetch(`${RIOT_AUTH_BASE}/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": RIOT_USER_AGENT,
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new RiotApiError(response.status, detail);
  }

  const payload = (await response.json()) as RiotTokenResponse;
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    idToken: payload.id_token ?? null,
    expiresIn: payload.expires_in,
    scope: payload.scope,
  };
}

/** Resolve the authenticated Riot account from an RSO access token. */
export async function fetchRiotAccountMe(accessToken: string): Promise<RiotAccountIdentity> {
  const cluster = getRiotAccountCluster();
  const response = await riotFetch(
    `${riotClusterBase(cluster)}/riot/account/v1/accounts/me`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": RIOT_USER_AGENT,
      },
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new RiotApiError(response.status, detail);
  }

  const payload = (await response.json()) as RiotAccountMeResponse;
  return {
    puuid: payload.puuid,
    gameName: payload.gameName,
    tagLine: payload.tagLine,
    subject: null,
  };
}

/** Full identity resolution after OAuth — includes JWT subject when present. */
export async function resolveRiotIdentityFromCode(
  code: string,
  redirectUri: string,
): Promise<RiotAccountIdentity> {
  const tokens = await exchangeRiotCodeForTokens(code, redirectUri);
  const account = await fetchRiotAccountMe(tokens.accessToken);
  return {
    ...account,
    subject: decodeJwtSubject(tokens.idToken),
  };
}
