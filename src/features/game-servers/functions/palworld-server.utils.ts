/**
 * Shared Palworld server utilities — imported by all server functions so
 * helpers are defined once and not duplicated across modules.
 */

export const REQUEST_TIMEOUT_MS = 8_000;

export interface ServerConfig {
  id: string;
  baseUrl: string;
  username: string;
  password: string;
}

/** Load per-server config from environment variables. */
export function getServerConfig(serverId: string): ServerConfig | null {
  const num = serverId.replace("server-", "");
  const baseUrl = process.env[`PALWORLD_SERVER_${num}_BASE_URL`];
  const username = process.env[`PALWORLD_SERVER_${num}_USERNAME`] ?? "admin";
  const password = process.env[`PALWORLD_SERVER_${num}_PASSWORD`];
  if (!baseUrl || !password) return null;
  return { id: serverId, baseUrl, username, password };
}

/**
 * Load all configured servers dynamically.
 * Scans PALWORLD_SERVER_N_BASE_URL for N = 0 … MAX_SERVERS and collects
 * every slot that has a BASE_URL set. Adding a new server only requires
 * adding the matching env vars — no code changes needed.
 *
 * Note: server-0 is special (ACE server) and will be sorted last by the
 * status function for display purposes.
 */
const MAX_SERVERS = 20;

export function loadServerConfigs(): ServerConfig[] {
  const configs: ServerConfig[] = [];
  for (let i = 0; i <= MAX_SERVERS; i++) {
    const cfg = getServerConfig(`server-${i}`);
    if (cfg) configs.push(cfg);
  }
  return configs;
}

/**
 * Returns true when the given serverId corresponds to a configured server
 * (i.e. PALWORLD_SERVER_N_BASE_URL is present in the environment).
 * Use this in server-function validators instead of a hardcoded regex.
 */
export function isConfiguredServerId(serverId: string): boolean {
  const match = /^server-(\d+)$/.exec(serverId);
  if (!match) return false;
  const num = match[1];
  return Boolean(process.env[`PALWORLD_SERVER_${num}_BASE_URL`]);
}

/** fetch with an AbortController timeout. */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Extract the last whitespace-separated word from a full server name. */
export function extractShortName(fullName: string | undefined, fallback: string): string {
  if (!fullName?.trim()) return fallback;
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? fallback;
}

/** Canonical short names, matching the Bruno environment file names. */
export const SERVER_KNOWN_NAMES: Record<string, string> = {
  "server-0": "ACE",
  "server-1": "Noir",
  "server-2": "Noctis",
  "server-3": "Enigma",
};

export function knownShortName(serverId: string): string {
  return SERVER_KNOWN_NAMES[serverId] ?? serverId;
}

export function knownFullName(serverId: string): string {
  const short = SERVER_KNOWN_NAMES[serverId];
  return short ? `Black Rose Palworld ${short}` : serverId;
}

/** Build a Basic Auth header value from username + password. */
export function basicAuthHeader(username: string, password: string): string {
  return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
}
