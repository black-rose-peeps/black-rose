import { createServerFn } from "@tanstack/react-start";
import type { AppUser } from "../types";
import { buildDiscordAvatarUrl, memberStatusToUserRole } from "../utils/discord";

export interface CompleteDiscordAuthInput {
  code: string;
}

export interface CompleteDiscordAuthResult {
  user: AppUser;
}

export const completeDiscordAuth = createServerFn({ method: "POST" })
  .inputValidator((data: CompleteDiscordAuthInput) => {
    if (!data?.code?.trim()) {
      throw new Error("Missing Discord authorization code.");
    }
    return { code: data.code.trim() };
  })
  .handler(async ({ data }): Promise<CompleteDiscordAuthResult> => {
    const { exchangeDiscordCodeForToken, fetchDiscordUser, fetchDiscordConnections } =
      await import("../server/discord-api.server");
    const { upsertMemberFromDiscord } = await import("../server/member-auth.server");
    const { ensureMemberProfile } = await import("@/features/member/server/profile.server");

    const accessToken = await exchangeDiscordCodeForToken(data.code);
    const discordUser = await fetchDiscordUser(accessToken);

    let connections: Awaited<ReturnType<typeof fetchDiscordConnections>> = [];
    try {
      connections = await fetchDiscordConnections(accessToken);
    } catch {
      // connections scope may be missing on older authorizations — profile still works
    }

    const member = await upsertMemberFromDiscord(discordUser);
    const displayName = discordUser.global_name?.trim() || discordUser.username;
    const avatarUrl = buildDiscordAvatarUrl(discordUser.id, discordUser.avatar);

    const profileRow = await ensureMemberProfile({
      member,
      displayName,
      discordUserId: discordUser.id,
      discordAvatarHash: discordUser.avatar,
      connections,
    });

    const user: AppUser = {
      id: member.id,
      discordId: discordUser.id,
      username: member.username,
      displayName,
      avatarUrl,
      email: discordUser.email,
      role: memberStatusToUserRole(member.status),
      registeredAt: member.createdAt,
      profileSlug: profileRow.slug,
    };

    return { user };
  });
