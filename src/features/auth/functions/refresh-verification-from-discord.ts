import { createServerFn } from "@tanstack/react-start";
import type { MemberVerificationStatus } from "@/features/admin/features/members/types";

export interface RefreshVerificationFromDiscordInput {
  memberId: string;
}

export interface RefreshVerificationFromDiscordResult {
  status: MemberVerificationStatus;
  updated: boolean;
}

export const refreshVerificationFromDiscord = createServerFn({ method: "POST" })
  .validator((data: RefreshVerificationFromDiscordInput) => {
    if (!data?.memberId?.trim()) {
      throw new Error("Missing member id.");
    }
    return { memberId: data.memberId.trim() };
  })
  .handler(async ({ data }): Promise<RefreshVerificationFromDiscordResult> => {
    const { assertRequestMemberId } = await import("../server/member-session-request.server");
    assertRequestMemberId(data.memberId);

    const { findMemberById } = await import("../server/member-auth.server");
    const { isDiscordRoleSyncConfigured } = await import("../server/discord-config.server");
    const { syncMemberVerificationFromDiscordRole } =
      await import("../server/discord-guild.server");

    if (!isDiscordRoleSyncConfigured()) {
      throw new Error(
        "Discord role check is not available. Wait a few minutes for automatic sync, or reach staff on the Black Rose Discord server.",
      );
    }

    const member = await findMemberById(data.memberId);
    if (!member) {
      throw new Error("Member account not found. Please sign in with Discord again.");
    }
    if (!member.discordId) {
      throw new Error("Your account is not linked to Discord. Please sign in again.");
    }

    const previousStatus = member.status;
    const synced = await syncMemberVerificationFromDiscordRole(member);

    return {
      status: synced.status,
      updated: synced.status !== previousStatus,
    };
  });
