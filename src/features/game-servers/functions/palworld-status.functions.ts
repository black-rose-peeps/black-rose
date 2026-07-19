import { createServerFn } from "@tanstack/react-start";
import type { PalworldServerStatus, PalworldServersResult } from "../types";

/** How many ms to wait before treating a server as offline */
const REQUEST_TIMEOUT_MS = 8_000;

interface ServerConfig {
  id: string;
  baseUrl: string;
  username: string;
  password: string;
}

function loadServerConfigs(): ServerConfig[] {
  const configs: ServerConfig[] = [];

  for (let i = 1; i <= 4; i++) {
    const baseUrl = process.env[`PALWORLD_SERVER_${i}_BASE_URL`];
    const username = process.env[`PALWORLD_SERVER_${i}_USERNAME`] ?? "admin";
    const password = process.env[`PALWORLD_SERVER_${i}_PASSWORD`];

    if (baseUrl && password) {
      configs.push({ id: `server-${i}`, baseUrl, username, password });
    }
  }

  return configs;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function extractShortName(fullName: string | undefined, fallback: string): string {
  if (!fullName?.trim()) return fallback;
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? fallback;
}

/** Static name map derived from Bruno environments — used for offline fallback display */
const SERVER_KNOWN_NAMES: Record<string, string> = {
  "server-1": "Noir",
  "server-2": "Noctis",
  "server-3": "Enigma",
  "server-4": "ACE",
};

function knownShortName(serverId: string): string {
  return SERVER_KNOWN_NAMES[serverId] ?? serverId;
}

function knownFullName(serverId: string): string {
  const short = SERVER_KNOWN_NAMES[serverId];
  return short ? `Black Rose Palworld ${short}` : serverId;
}

async function queryServer(config: ServerConfig): Promise<PalworldServerStatus> {
  const authHeader =
    "Basic " + Buffer.from(`${config.username}:${config.password}`).toString("base64");

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: authHeader,
  };

  const offline: PalworldServerStatus = {
    id: config.id,
    name: knownShortName(config.id),
    fullName: knownFullName(config.id),
    online: false,
    currentPlayers: 0,
    maxPlayers: 0,
    uptime: 0,
    days: 0,
    version: "",
  };

  try {
    // Run /info and /metrics in parallel
    const [infoRes, metricsRes] = await Promise.all([
      fetchWithTimeout(`${config.baseUrl}/info`, { headers }, REQUEST_TIMEOUT_MS),
      fetchWithTimeout(`${config.baseUrl}/metrics`, { headers }, REQUEST_TIMEOUT_MS),
    ]);

    if (!infoRes.ok || !metricsRes.ok) return offline;

    const info = (await infoRes.json()) as {
      version?: string;
      servername?: string;
      description?: string;
    };

    const metrics = (await metricsRes.json()) as {
      currentplayernum?: number;
      maxplayernum?: number;
      uptime?: number;
      days?: number;
    };

    const fullName = info.servername ?? config.id;

    return {
      id: config.id,
      name: extractShortName(info.servername, config.id),
      fullName,
      online: true,
      currentPlayers: metrics.currentplayernum ?? 0,
      maxPlayers: metrics.maxplayernum ?? 0,
      uptime: metrics.uptime ?? 0,
      days: metrics.days ?? 0,
      version: info.version ?? "",
    };
  } catch {
    return offline;
  }
}

/**
 * Server function — proxies Palworld REST API calls server-side so credentials
 * never reach the browser. Returns safe public-facing fields only.
 */
export const fetchPalworldServers = createServerFn({ method: "GET" }).handler(
  async (): Promise<PalworldServersResult> => {
    const configs = loadServerConfigs();
    const servers = await Promise.all(configs.map(queryServer));

    return {
      servers,
      fetchedAt: new Date().toISOString(),
    };
  },
);
