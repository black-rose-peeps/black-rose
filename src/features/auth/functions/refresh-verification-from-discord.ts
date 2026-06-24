import { createServerFn } from "@tanstack/react-start";
import type { MemberVerificationStatus } from "@/features/admin/features/members/types";

export interface RefreshVerificationFromDiscordInput {
  memberId: string;
}

export interface RefreshVerificationFromDiscordResult {
  status: MemberVerificationStatus;
  hasRose: boolean;
  notInGuild: boolean;
  updated: boolean;
}

const VERIFICATION_UNAVAILABLE_MESSAGE =
  "Discord role check is not available. Wait a few minutes for automatic sync, or reach staff on the Black Rose Discord server.";

const DISCORD_CHECK_FAILED_MESSAGE =
  "Could not reach Discord to check your ROSE role. Wait a moment and try again, or reach staff on the Black Rose Discord server.";

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
    const { isDiscordRoleSyncConfigured, isDiscordVerificationAvailable } =
      await import("../server/discord-config.server");
    const { checkMemberRoseRoleImmediately } = await import("../server/discord-guild.server");
    const { isDiscordWorkerSyncConfigured, triggerWorkerMemberSync } =
      await import("../server/discord-worker-sync.server");

    if (!isDiscordVerificationAvailable()) {
      throw new Error(VERIFICATION_UNAVAILABLE_MESSAGE);
    }

    const member = await findMemberById(data.memberId);
    if (!member) {
      throw new Error("Member account not found. Please sign in with Discord again.");
    }
    if (!member.discordId) {
      throw new Error("Your account is not linked to Discord. Please sign in again.");
    }

    const previousStatus = member.status;

    // Primary path: Discord bot REST lookup for this exact Discord user id.
    if (isDiscordRoleSyncConfigured()) {
      try {
        return await checkMemberRoseRoleImmediately(member);
      } catch (err) {
        console.warn(
          "[auth] Immediate Discord bot check failed:",
          err instanceof Error ? err.message : err,
        );
        if (!isDiscordWorkerSyncConfigured()) {
          throw new Error(DISCORD_CHECK_FAILED_MESSAGE);
        }
      }
    }

    // Fallback when Vercel has no bot token but the sync worker is configured.
    if (isDiscordWorkerSyncConfigured()) {
      const workerResult = await triggerWorkerMemberSync(member.discordId, {
        clearSyncState: true,
      });
      const { invalidateMemberAuthCache } = await import("../server/member-auth.server");
      invalidateMemberAuthCache(data.memberId);
      const refreshed = await findMemberById(data.memberId);
      const status = refreshed?.status ?? workerResult.status;
      return {
        status,
        hasRose: workerResult.hasRose,
        notInGuild: workerResult.notInGuild,
        updated: status !== previousStatus,
      };
    }

    throw new Error(VERIFICATION_UNAVAILABLE_MESSAGE);
  });
