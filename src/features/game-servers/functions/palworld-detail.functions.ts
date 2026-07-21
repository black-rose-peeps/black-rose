import { createServerFn } from "@tanstack/react-start";
import type { PalworldServerDetail, PalworldServerSettings } from "../types";
import {
  REQUEST_TIMEOUT_MS,
  getServerConfig,
  fetchWithTimeout,
  extractShortName,
  knownShortName,
  knownFullName,
  basicAuthHeader,
  isConfiguredServerId,
} from "./palworld-server.utils";

export const fetchPalworldServerDetail = createServerFn({ method: "POST" })
  .validator((data: { serverId: string }) => {
    if (!data?.serverId?.trim()) throw new Error("Missing serverId.");
    const id = data.serverId.trim();
    if (!/^server-\d+$/.test(id) || !isConfiguredServerId(id))
      throw new Error("Invalid or unconfigured serverId.");
    return { serverId: id };
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

    const authHeader = basicAuthHeader(config.username, config.password);
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
