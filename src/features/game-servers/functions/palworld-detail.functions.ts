import { createServerFn } from "@tanstack/react-start";
import type { PalworldServerDetail, PalworldServerSettings } from "../types";

const REQUEST_TIMEOUT_MS = 8_000;

interface ServerConfig {
  id: string;
  baseUrl: string;
  username: string;
  password: string;
}

function getServerConfig(serverId: string): ServerConfig | null {
  // serverId is like "server-1", "server-2", etc.
  const num = serverId.replace("server-", "");
  const baseUrl = process.env[`PALWORLD_SERVER_${num}_BASE_URL`];
  const username = process.env[`PALWORLD_SERVER_${num}_USERNAME`] ?? "admin";
  const password = process.env[`PALWORLD_SERVER_${num}_PASSWORD`];
  if (!baseUrl || !password) return null;
  return { id: serverId, baseUrl, username, password };
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

/** Static name map — matches the Bruno environment files */
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

export const fetchPalworldServerDetail = createServerFn({ method: "POST" })
  .validator((data: { serverId: string }) => {
    if (!data?.serverId?.trim()) throw new Error("Missing serverId.");
    // Only allow server-1 through server-4
    if (!/^server-[1-4]$/.test(data.serverId.trim())) throw new Error("Invalid serverId.");
    return { serverId: data.serverId.trim() };
  })
  .handler(async ({ data }): Promise<PalworldServerDetail> => {
    const config = getServerConfig(data.serverId);

    const offline: PalworldServerDetail = {
      id: data.serverId,
      name: knownShortName(data.serverId),
      fullName: knownFullName(data.serverId),
      online: false,
      currentPlayers: 0,
      maxPlayers: 0,
      uptime: 0,
      days: 0,
      version: "",
      settings: null,
      serverFps: 0,
      serverFrameTime: 0,
      basecampNum: 0,
      maxBasecampNum: 0,
      maxBasePals: 0,
    };

    if (!config) return offline;

    const authHeader =
      "Basic " + Buffer.from(`${config.username}:${config.password}`).toString("base64");
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: authHeader,
    };

    try {
      const [infoRes, metricsRes, settingsRes] = await Promise.all([
        fetchWithTimeout(`${config.baseUrl}/info`, { headers }, REQUEST_TIMEOUT_MS),
        fetchWithTimeout(`${config.baseUrl}/metrics`, { headers }, REQUEST_TIMEOUT_MS),
        fetchWithTimeout(`${config.baseUrl}/settings`, { headers }, REQUEST_TIMEOUT_MS),
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
        serverfps?: number;
        serverframetime?: number;
        basecampnum?: number;
      };

      // Settings may fail — treat as optional
      let settings: Partial<PalworldServerSettings> | null = null;
      if (settingsRes.ok) {
        const raw = (await settingsRes.json()) as Partial<PalworldServerSettings>;
        // Strip sensitive fields before returning to client
        const {
          AdminPassword: _a,
          ServerPassword: _s,
          ...safeSettings
        } = raw as Record<string, unknown>;
        void _a;
        void _s;
        settings = safeSettings as Partial<PalworldServerSettings>;
      }

      const fullName = info.servername ?? config.id;

      return {
        id: config.id,
        name: extractShortName(fullName, config.id),
        fullName,
        online: true,
        currentPlayers: metrics.currentplayernum ?? 0,
        maxPlayers: metrics.maxplayernum ?? 0,
        uptime: metrics.uptime ?? 0,
        days: metrics.days ?? 0,
        version: info.version ?? "",
        settings,
        serverFps: metrics.serverfps ?? 0,
        serverFrameTime: metrics.serverframetime ?? 0,
        basecampNum: metrics.basecampnum ?? 0,
        maxBasecampNum: (settings?.BaseCampMaxNum as number | undefined) ?? 0,
        maxBasePals: (settings?.BaseCampWorkerMaxNum as number | undefined) ?? 0,
      };
    } catch {
      return offline;
    }
  });
