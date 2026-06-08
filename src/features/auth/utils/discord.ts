import type { MemberVerificationStatus } from "@/features/admin/features/members/types";
import type { UserRole } from "../types";

const DISCORD_EPOCH_MS = 1420070400000n;

/** Discord CDN avatar URL — see https://docs.discord.com/developers/reference#image-formatting */
export function buildDiscordAvatarUrl(userId: string, avatarHash: string | null): string | null {
  if (avatarHash) {
    const ext = avatarHash.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=256`;
  }

  const index = Number((BigInt(userId) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export function memberStatusToUserRole(status: MemberVerificationStatus): UserRole {
  return status === "Verified" ? "verified" : "not_verified";
}

export function isDiscordSnowflake(value: string): boolean {
  return /^\d{17,20}$/.test(value);
}

export function snowflakeToDate(userId: string): Date | null {
  if (!isDiscordSnowflake(userId)) return null;
  const timestampMs = Number((BigInt(userId) >> 22n) + DISCORD_EPOCH_MS);
  return new Date(timestampMs);
}
