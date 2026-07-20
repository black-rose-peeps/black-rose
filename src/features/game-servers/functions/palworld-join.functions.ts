import { createServerFn } from "@tanstack/react-start";

export interface PalworldJoinInfo {
  host: string;
  /** In-game join password shown to the player */
  joinPassword: string | null;
}

const SERVER_JOIN_INFO: Record<string, { host: string; envPasswordKey: string }> = {
  "server-1": { host: "", envPasswordKey: "PALWORLD_SERVER_1_JOIN_PASSWORD" },
  "server-2": { host: "", envPasswordKey: "PALWORLD_SERVER_2_JOIN_PASSWORD" },
  "server-3": { host: "", envPasswordKey: "PALWORLD_SERVER_3_JOIN_PASSWORD" },
  "server-4": { host: "", envPasswordKey: "PALWORLD_SERVER_4_JOIN_PASSWORD" },
};

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
    if (!/^server-[1-4]$/.test(data.serverId.trim())) throw new Error("Invalid serverId.");
    return { serverId: data.serverId.trim(), memberId: data.memberId.trim() };
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
