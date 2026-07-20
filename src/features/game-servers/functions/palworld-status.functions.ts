import { createServerFn } from "@tanstack/react-start";
import type { PalworldServerStatus, PalworldServersResult } from "../types";
import {
  REQUEST_TIMEOUT_MS,
  loadServerConfigs,
  fetchWithTimeout,
  extractShortName,
  knownShortName,
  knownFullName,
  basicAuthHeader,
  type ServerConfig,
} from "./palworld-server.utils";

async function queryServer(config: ServerConfig): Promise<PalworldServerStatus> {
  const authHeader = basicAuthHeader(config.username, config.password);
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
    const [infoRes, metricsRes] = await Promise.all([
      fetchWithTimeout(`${config.baseUrl}/info`, { headers }, REQUEST_TIMEOUT_MS),
      fetchWithTimeout(`${config.baseUrl}/metrics`, { headers }, REQUEST_TIMEOUT_MS),
    ]);

    if (!infoRes.ok || !metricsRes.ok) return offline;

    const info = (await infoRes.json()) as {
      version?: string;
      servername?: string;
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
    return { servers, fetchedAt: new Date().toISOString() };
  },
);
