import type { AdminMember, MemberVerificationStatus } from "@/features/admin/features/members/types";
import {
  getConfiguredRoseRoleId,
  getConfiguredRoseRoleName,
  getDiscordBotToken,
  getDiscordGuildId,
  isDiscordRoleSyncConfigured,
} from "./discord-config.server";
import { applyVerificationByDiscordId, rolesIncludeRose } from "./discord-verification.server";
import { DiscordApiError } from "./discord-api.server";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const DISCORD_USER_AGENT = "BlackRoseArena (https://blackrose.asia, 1.0.0)";
const DISCORD_FETCH_TIMEOUT_MS = 5000;

interface DiscordGuildRole {
  id: string;
  name: string;
}

interface DiscordGuildMember {
  roles: string[];
}

let cachedRoseRoleId: string | null | undefined;
let roseRoleIdPromise: Promise<string | null> | null = null;

export { isDiscordRoleSyncConfigured };

async function discordBotFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getDiscordBotToken();
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not configured.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DISCORD_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${DISCORD_API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bot ${token}`,
        "User-Agent": DISCORD_USER_AGENT,
        ...(init?.headers ?? {}),
      },
    });

    if (response.status !== 429) {
      return response;
    }

    let retryAfterMs = 500;
    try {
      const body = (await response.json()) as { retry_after?: number };
      if (typeof body.retry_after === "number" && body.retry_after > 0) {
        retryAfterMs = Math.ceil(body.retry_after * 1000) + 50;
      }
    } catch {
      // Use default backoff.
    }

    await new Promise((resolve) => setTimeout(resolve, retryAfterMs));

    return fetch(`${DISCORD_API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bot ${token}`,
        "User-Agent": DISCORD_USER_AGENT,
        ...(init?.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchGuildRoles(): Promise<DiscordGuildRole[]> {
  const guildId = getDiscordGuildId();
  if (!guildId) return [];

  const response = await discordBotFetch(`/guilds/${guildId}/roles`);
  if (!response.ok) {
    const detail = await response.text();
    throw new DiscordApiError(response.status, detail);
  }

  return (await response.json()) as DiscordGuildRole[];
}

/** Resolve the configured ROSE role ID once (env or guild roles API). */
export async function resolveRoseRoleId(): Promise<string | null> {
  const configuredId = getConfiguredRoseRoleId();
  if (configuredId) return configuredId;

  if (cachedRoseRoleId !== undefined) {
    return cachedRoseRoleId;
  }

  if (roseRoleIdPromise) {
    return roseRoleIdPromise;
  }

  roseRoleIdPromise = (async () => {
    const roleName = getConfiguredRoseRoleName();
    if (!roleName || !isDiscordRoleSyncConfigured()) {
      cachedRoseRoleId = null;
      return null;
    }

    const roles = await fetchGuildRoles();
    const match = roles.find(
      (role) => role.name.localeCompare(roleName, undefined, { sensitivity: "accent" }) === 0,
    );
    cachedRoseRoleId = match?.id ?? null;
    return cachedRoseRoleId;
  })();

  try {
    return await roseRoleIdPromise;
  } finally {
    roseRoleIdPromise = null;
  }
}

async function fetchGuildMemberRoleIds(discordUserId: string): Promise<string[] | null> {
  if (!isDiscordRoleSyncConfigured()) return null;

  const guildId = getDiscordGuildId();
  if (!guildId) return null;

  const response = await discordBotFetch(`/guilds/${guildId}/members/${discordUserId}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new DiscordApiError(response.status, detail);
  }

  const member = (await response.json()) as DiscordGuildMember;
  return member.roles ?? [];
}

/** One-off Discord REST check — bot API fallback at login. */
export async function memberHasRoseRole(discordUserId: string): Promise<boolean> {
  const roleIds = await fetchGuildMemberRoleIds(discordUserId);
  if (!roleIds) return false;

  const roseRoleId = await resolveRoseRoleId();
  if (!roseRoleId) {
    throw new Error(
      "Could not resolve the ROSE role. Set DISCORD_ROSE_ROLE_ID or create a role named ROSE in the Discord server.",
    );
  }

  return rolesIncludeRose(roleIds, roseRoleId);
}

/**
 * Check whether the signing-in user already has ROSE on Discord.
 * Uses OAuth `guilds.members.read` first (one call, scales at login), then bot REST as fallback.
 */
export async function resolveHasRoseRoleAtLogin(
  accessToken: string,
  discordUserId: string,
): Promise<boolean> {
  const guildId = getDiscordGuildId();
  if (!guildId) {
    console.warn("[discord] DISCORD_GUILD_ID is not set — skipping login role check.");
    return false;
  }

  const roseRoleId = await resolveRoseRoleId();
  if (!roseRoleId) {
    console.warn(
      "[discord] ROSE role is not configured — set DISCORD_ROSE_ROLE_ID or DISCORD_ROSE_ROLE_NAME.",
    );
    return false;
  }

  const { fetchOAuthGuildMemberRoleIds } = await import("./discord-api.server");
  const oauthRoleIds = await fetchOAuthGuildMemberRoleIds(accessToken, guildId);
  if (oauthRoleIds !== null) {
    return rolesIncludeRose(oauthRoleIds, roseRoleId);
  }

  if (!isDiscordRoleSyncConfigured()) {
    console.warn(
      "[discord] guilds.members.read unavailable and bot is not configured — defaulting to Not Verified.",
    );
    return false;
  }

  return memberHasRoseRole(discordUserId);
}

function verificationStatusFromRose(hasRoseRole: boolean): MemberVerificationStatus {
  return hasRoseRole ? "Verified" : "Not Verified";
}

/**
 * Align member verification with Discord at login (existing ROSE holders, re-auth, role revokes).
 * Prefer {@link resolveHasRoseRoleAtLogin} + upsertMemberFromDiscord during OAuth completion.
 */
export async function syncMemberVerificationFromDiscordRole(
  member: AdminMember,
  accessToken?: string,
): Promise<AdminMember> {
  if (!member.discordId) {
    return member;
  }

  try {
    const hasRoseRole = accessToken
      ? await resolveHasRoseRoleAtLogin(accessToken, member.discordId)
      : isDiscordRoleSyncConfigured()
        ? await memberHasRoseRole(member.discordId)
        : false;
    const targetStatus = verificationStatusFromRose(hasRoseRole);

    if (member.status === targetStatus) {
      return member;
    }

    await applyVerificationByDiscordId(member.discordId, hasRoseRole);
    return { ...member, status: targetStatus };
  } catch (err) {
    console.warn("[discord] Login role sync failed:", err instanceof Error ? err.message : err);
    return member;
  }
}
