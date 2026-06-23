import { createServerFn } from "@tanstack/react-start";
import {
  DEFAULT_MEMBER_SYNC_QUEUE_CONFIG,
  normalizeWorkerQueueConfig,
  type DiscordSyncSummary,
  type DiscordSyncWorkerResponse,
} from "../utils/discord-sync-config";
import type { AdminMember, MemberSyncQueueConfig, MemberVerificationStatus } from "../types";
import {
  isDiscordWorkerSyncConfigured,
  triggerWorkerMemberSync,
  type WorkerMemberSyncResult,
} from "@/features/auth/server/discord-worker-sync.server";
import { rowToAdminMember } from "../utils";

export type { DiscordSyncSummary };

export interface DiscordMemberSyncSummary extends WorkerMemberSyncResult {
  member: AdminMember;
}

const MEMBER_SYNC_SELECT =
  "id, username, discord_username, discord_id, status, registered_at, created_at, discord_not_in_guild_strikes, discord_sync_paused_at, member_profiles(avatar_url, slug, display_name)";

const WORKER_REQUEST_TIMEOUT_MS = 15000;

function getRequiredSyncConfig() {
  const workerUrl = process.env.DISCORD_SYNC_WORKER_URL?.trim();
  const syncSecret = process.env.DISCORD_SYNC_SECRET?.trim();

  if (!workerUrl) {
    throw new Error("Missing DISCORD_SYNC_WORKER_URL in app server env.");
  }
  if (!syncSecret) {
    throw new Error("Missing DISCORD_SYNC_SECRET in app server env.");
  }

  return { workerUrl, syncSecret };
}

async function fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WORKER_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request timed out after ${WORKER_REQUEST_TIMEOUT_MS}ms.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function mapSyncResponse(body: DiscordSyncWorkerResponse): DiscordSyncSummary {
  const syncQueueConfig =
    normalizeWorkerQueueConfig(body.queueConfig) ??
    body.syncQueueConfig ??
    DEFAULT_MEMBER_SYNC_QUEUE_CONFIG;

  const { queueConfig: _queueConfig, ...rest } = body;
  return {
    ...rest,
    syncQueueConfig,
  };
}

function mergeMemberWithSyncResult(
  row: Record<string, unknown>,
  result: {
    status: MemberVerificationStatus;
    hasRose: boolean;
    notInGuild: boolean;
    syncPaused?: boolean;
  },
): AdminMember {
  const member = rowToAdminMember(row);
  return {
    ...member,
    status: result.status,
  };
}

async function fetchWorkerSyncQueueConfig(): Promise<MemberSyncQueueConfig> {
  const { workerUrl, syncSecret } = getRequiredSyncConfig();

  try {
    const response = await fetchWithTimeout(`${workerUrl}/sync/status`, {
      headers: { Authorization: `Bearer ${syncSecret}` },
    });

    if (!response.ok) {
      throw new Error(`Worker status request failed (${response.status}).`);
    }

    const body = (await response.json()) as DiscordSyncWorkerResponse;
    return normalizeWorkerQueueConfig(body.queueConfig) ?? DEFAULT_MEMBER_SYNC_QUEUE_CONFIG;
  } catch {
    return DEFAULT_MEMBER_SYNC_QUEUE_CONFIG;
  }
}

export const triggerDiscordSync = createServerFn({ method: "POST" })
  .validator(() => ({}))
  .handler(async (): Promise<DiscordSyncSummary> => {
    const { workerUrl, syncSecret } = getRequiredSyncConfig();

    const response = await fetchWithTimeout(`${workerUrl}/sync?priority=1`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${syncSecret}`,
        "X-Sync-Priority": "1",
      },
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Sync request failed (${response.status}): ${detail}`);
    }

    return mapSyncResponse((await response.json()) as DiscordSyncWorkerResponse);
  });

export const triggerDiscordMemberSync = createServerFn({ method: "POST" })
  .validator((data: { memberId: string }) => {
    if (!data?.memberId?.trim()) {
      throw new Error("Missing member id.");
    }
    return { memberId: data.memberId.trim() };
  })
  .handler(async ({ data }): Promise<DiscordMemberSyncSummary> => {
    const { isDiscordRoleSyncConfigured } =
      await import("@/features/auth/server/discord-config.server");
    const { checkMemberRoseRoleImmediately } =
      await import("@/features/auth/server/discord-guild.server");

    if (!isDiscordRoleSyncConfigured() && !isDiscordWorkerSyncConfigured()) {
      throw new Error("Discord verification is not configured on the server.");
    }

    const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
    const supabase = getSupabaseAdmin();

    const { data: row, error: findError } = await supabase
      .from("members")
      .select(MEMBER_SYNC_SELECT)
      .eq("id", data.memberId)
      .maybeSingle();

    if (findError) {
      throw new Error(findError.message);
    }
    if (!row) {
      throw new Error("Member not found.");
    }

    const adminMember = rowToAdminMember(row);
    const discordId = adminMember.discordId?.trim();
    if (!discordId) {
      throw new Error("Member has no linked Discord account.");
    }

    let syncResult: {
      status: MemberVerificationStatus;
      hasRose: boolean;
      notInGuild: boolean;
      updated: boolean;
      syncPaused?: boolean;
    };

    // Prefer immediate bot check (single DB write — avoids realtime race with a separate pause reset).
    if (isDiscordRoleSyncConfigured()) {
      const immediate = await checkMemberRoseRoleImmediately(adminMember);
      syncResult = {
        status: immediate.status,
        hasRose: immediate.hasRose,
        notInGuild: immediate.notInGuild,
        updated: immediate.updated,
        syncPaused: false,
      };
    } else {
      const worker = await triggerWorkerMemberSync(discordId, { clearSyncState: true });
      syncResult = {
        status: worker.status,
        hasRose: worker.hasRose,
        notInGuild: worker.notInGuild,
        updated: worker.updated,
        syncPaused: worker.syncPaused,
      };
    }

    const { data: refreshed, error: refreshError } = await supabase
      .from("members")
      .select(MEMBER_SYNC_SELECT)
      .eq("id", data.memberId)
      .single();

    if (refreshError) {
      throw new Error(refreshError.message);
    }

    const { invalidateMemberAuthCache } = await import("@/features/auth/server/member-auth.server");
    invalidateMemberAuthCache(data.memberId);

    const member = mergeMemberWithSyncResult(refreshed as Record<string, unknown>, syncResult);

    return {
      discordId,
      status: syncResult.status,
      updated: syncResult.updated,
      hasRose: syncResult.hasRose,
      notInGuild: syncResult.notInGuild,
      syncPaused: syncResult.syncPaused ?? false,
      member,
    };
  });

export const getMemberSyncQueueConfig = createServerFn({ method: "GET" })
  .validator(() => ({}))
  .handler(async (): Promise<MemberSyncQueueConfig> => fetchWorkerSyncQueueConfig());
