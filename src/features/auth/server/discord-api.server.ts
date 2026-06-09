import { isAllowedDiscordRedirectUri } from "@/lib/app-url";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const DISCORD_USER_AGENT = "BlackRoseArena (https://blackrose.asia, 1.0.0)";
const DISCORD_FETCH_TIMEOUT_MS = 5000;

export class DiscordApiError extends Error {
  readonly status: number;

  constructor(status: number, detail: string) {
    super(`Discord API request failed (${status}): ${detail}`);
    this.name = "DiscordApiError";
    this.status = status;
  }
}

export interface DiscordOAuthUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  email: string | null;
}

/** Linked third-party account from Discord `connections` scope. */
export interface DiscordConnection {
  id: string;
  name: string;
  type: string;
  verified: boolean;
  /** 0 = not shown, 1 = visible to everyone */
  visibility: number;
}

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

function getDiscordClientId(): string {
  const clientId = process.env.VITE_DISCORD_CLIENT_ID ?? process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    throw new Error("DISCORD_CLIENT_ID is not configured.");
  }
  return clientId;
}

function getDiscordClientSecret(): string {
  const secret = process.env.DISCORD_CLIENT_SECRET;
  if (!secret) {
    throw new Error("DISCORD_CLIENT_SECRET is not configured.");
  }
  return secret;
}

async function discordFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DISCORD_FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Exchange OAuth2 authorization code for an access token (server-only). */
export async function exchangeDiscordCodeForToken(
  code: string,
  redirectUri: string,
): Promise<string> {
  if (!isAllowedDiscordRedirectUri(redirectUri)) {
    throw new Error("Invalid Discord redirect URI.");
  }

  const body = new URLSearchParams({
    client_id: getDiscordClientId(),
    client_secret: getDiscordClientSecret(),
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const response = await discordFetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": DISCORD_USER_AGENT,
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new DiscordApiError(response.status, detail);
  }

  const payload = (await response.json()) as DiscordTokenResponse;
  return payload.access_token;
}

/** Fetch the authenticated Discord user profile. IDs are returned as strings (snowflakes). */
export async function fetchDiscordUser(accessToken: string): Promise<DiscordOAuthUser> {
  const response = await discordFetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": DISCORD_USER_AGENT,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new DiscordApiError(response.status, detail);
  }

  return (await response.json()) as DiscordOAuthUser;
}

/** Fetch linked accounts (requires `connections` OAuth scope). */
export async function fetchDiscordConnections(accessToken: string): Promise<DiscordConnection[]> {
  const response = await discordFetch(`${DISCORD_API_BASE}/users/@me/connections`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": DISCORD_USER_AGENT,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new DiscordApiError(response.status, detail);
  }

  return (await response.json()) as DiscordConnection[];
}
