import { createServerFn } from "@tanstack/react-start";
import { isConfiguredServerId } from "./palworld-server.utils";

export interface PalworldJoinInfo {
  host: string;
  /** In-game join password shown to the player */
  joinPassword: string | null;
}

function getJoinHost(serverId: string): string {
  const envKey = `PALWORLD_SERVER_${serverId.replace("server-", "")}_JOIN_HOST`;
  return process.env[envKey] ?? "";
}

function getJoinPassword(serverId: string): string | null {
  const envKey = `PALWORLD_SERVER_${serverId.replace("server-", "")}_JOIN_PASSWORD`;
  return process.env[envKey] ?? null;
}

/**
 * Returns connection details for a Palworld server.
 * Only accessible to verified Black Rose members — the server validates the
 * session cookie and member status before returning any data.
 */
export const fetchPalworldJoinInfo = createServerFn({ method: "POST" })
  .validator((data: { serverId: string; memberId: string }) => {
    if (!data?.serverId?.trim()) throw new Error("Missing serverId.");
    if (!data?.memberId?.trim()) throw new Error("Missing memberId.");
    const id = data.serverId.trim();
    if (!/^server-\d+$/.test(id) || !isConfiguredServerId(id))
      throw new Error("Invalid or unconfigured serverId.");
    return { serverId: id, memberId: data.memberId.trim() };
  })
  .handler(async ({ data }): Promise<PalworldJoinInfo> => {
    // Validate the session cookie matches the claimed memberId
    const { assertRequestMemberId } =
      await import("@/features/auth/server/member-session-request.server");
    assertRequestMemberId(data.memberId);

    // Confirm the member is actually verified
    const { findMemberById } = await import("@/features/auth/server/member-auth.server");
    const member = await findMemberById(data.memberId);

    if (!member) throw new Error("Member not found.");
    if (member.status !== "Verified" && member.status !== "Admin") {
      throw new Error("Server access requires a verified Black Rose membership.");
    }

    const host = getJoinHost(data.serverId);
    if (!host) throw new Error("Server connection info is not configured.");

    return {
      host,
      joinPassword: getJoinPassword(data.serverId),
    };
  });
