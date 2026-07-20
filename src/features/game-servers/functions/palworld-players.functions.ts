import { createServerFn } from "@tanstack/react-start";
import type { PalworldPlayer, PalworldPlayersResult } from "../types";
import {
  REQUEST_TIMEOUT_MS,
  getServerConfig,
  fetchWithTimeout,
  basicAuthHeader,
} from "./palworld-server.utils";

/**
 * Fetches the connected player list for a single Palworld server.
 * Requires a verified Black Rose session — player identifiers are not public.
 * The `ip` field is stripped before returning — player IPs are private.
 */
export const fetchPalworldPlayers = createServerFn({ method: "POST" })
  .validator((data: { serverId: string; memberId: string }) => {
    if (!data?.serverId?.trim()) throw new Error("Missing serverId.");
    if (!data?.memberId?.trim()) throw new Error("Missing memberId.");
    if (!/^server-[1-4]$/.test(data.serverId.trim())) throw new Error("Invalid serverId.");
    return { serverId: data.serverId.trim(), memberId: data.memberId.trim() };
  })
  .handler(async ({ data }): Promise<PalworldPlayersResult> => {
    // Validate the session cookie matches the claimed memberId
    const { assertRequestMemberId } =
      await import("@/features/auth/server/member-session-request.server");
    assertRequestMemberId(data.memberId);

    // Confirm the member is verified
    const { findMemberById } = await import("@/features/auth/server/member-auth.server");
    const member = await findMemberById(data.memberId);
    if (!member) throw new Error("Member not found.");
    if (member.status !== "Verified" && member.status !== "Admin") {
      throw new Error("Player list access requires a verified Black Rose membership.");
    }

    const config = getServerConfig(data.serverId);
    if (!config) return { players: [], fetchedAt: new Date().toISOString() };

    const authHeader = basicAuthHeader(config.username, config.password);

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
