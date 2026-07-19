import { createServerFn } from "@tanstack/react-start";
import type { PalworldPlayer, PalworldPlayersResult } from "../types";

const REQUEST_TIMEOUT_MS = 8_000;

function getServerConfig(serverId: string) {
  const num = serverId.replace("server-", "");
  const baseUrl = process.env[`PALWORLD_SERVER_${num}_BASE_URL`];
  const username = process.env[`PALWORLD_SERVER_${num}_USERNAME`] ?? "admin";
  const password = process.env[`PALWORLD_SERVER_${num}_PASSWORD`];
  if (!baseUrl || !password) return null;
  return { baseUrl, username, password };
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

/**
 * Fetches the connected player list for a single Palworld server.
 * The `ip` field is stripped before returning — player IPs are private.
 */
export const fetchPalworldPlayers = createServerFn({ method: "POST" })
  .validator((data: { serverId: string }) => {
    if (!data?.serverId?.trim()) throw new Error("Missing serverId.");
    if (!/^server-[1-4]$/.test(data.serverId.trim())) throw new Error("Invalid serverId.");
    return { serverId: data.serverId.trim() };
  })
  .handler(async ({ data }): Promise<PalworldPlayersResult> => {
    const config = getServerConfig(data.serverId);
    if (!config) return { players: [], fetchedAt: new Date().toISOString() };

    const authHeader =
      "Basic " + Buffer.from(`${config.username}:${config.password}`).toString("base64");

    try {
      const res = await fetchWithTimeout(
        `${config.baseUrl}/players`,
        { headers: { Accept: "application/json", Authorization: authHeader } },
        REQUEST_TIMEOUT_MS,
      );

      if (!res.ok) return { players: [], fetchedAt: new Date().toISOString() };

      const body = (await res.json()) as {
        players?: Array<Record<string, unknown>>;
      };

      const players: PalworldPlayer[] = (body.players ?? []).map((p) => ({
        name: String(p.name ?? ""),
        accountName: String(p.accountName ?? ""),
        playerId: String(p.playerId ?? ""),
        userId: String(p.userId ?? ""),
        // ip intentionally omitted
        ping: Number(p.ping ?? 0),
        level: Number(p.level ?? 0),
        location_x: Number(p.location_x ?? 0),
        location_y: Number(p.location_y ?? 0),
        building_count: Number(p.building_count ?? 0),
      }));

      return { players, fetchedAt: new Date().toISOString() };
    } catch {
      return { players: [], fetchedAt: new Date().toISOString() };
    }
  });
