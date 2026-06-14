import { createServerFn } from "@tanstack/react-start";
import { isAllowedDiscordRedirectUri } from "@/lib/app-url";
import type { AppUser } from "../types";
import { buildDiscordAvatarUrl, memberStatusToUserRole } from "../utils/discord";

export interface CompleteDiscordAuthInput {
  code: string;
  redirectUri: string;
}

export interface CompleteDiscordAuthResult {
  user: AppUser;
}

export const completeDiscordAuth = createServerFn({ method: "POST" })
  .validator((data: CompleteDiscordAuthInput) => {
    if (!data?.code?.trim()) {
      throw new Error("Missing Discord authorization code.");
    }
    const redirectUri = data.redirectUri?.trim() ?? "";
    if (!isAllowedDiscordRedirectUri(redirectUri)) {
      throw new Error("Invalid Discord redirect URI.");
    }
    return { code: data.code.trim(), redirectUri };
  })
  .handler(async ({ data }): Promise<CompleteDiscordAuthResult> => {
    const { exchangeDiscordCodeForToken, fetchDiscordUser, fetchDiscordConnections } =
      await import("../server/discord-api.server");
    const { upsertMemberFromDiscord } = await import("../server/member-auth.server");
    const { ensureMemberProfile } = await import("@/features/member/server/profile.server");

    const accessToken = await exchangeDiscordCodeForToken(data.code, data.redirectUri);
    const discordUser = await fetchDiscordUser(accessToken);

    let connections: Awaited<ReturnType<typeof fetchDiscordConnections>> = [];
    try {
      connections = await fetchDiscordConnections(accessToken);
    } catch (err) {
      const { DiscordApiError } = await import("../server/discord-api.server");
      if (err instanceof DiscordApiError && (err.status === 401 || err.status === 403)) {
        connections = [];
      } else {
        throw err;
      }
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
      discordUsername: member.discordUsername,
      displayName,
      avatarUrl,
      email: discordUser.email,
      role: memberStatusToUserRole(member.status),
      registeredAt: member.createdAt,
      profileSlug: profileRow.slug,
    };

    return { user };
  });
