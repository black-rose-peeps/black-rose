import { createServerFn } from "@tanstack/react-start";
import {
  DEFAULT_MEMBER_SYNC_QUEUE_CONFIG,
  normalizeWorkerQueueConfig,
  type DiscordSyncSummary,
  type DiscordSyncWorkerResponse,
} from "../utils/discord-sync-config";
import type { MemberSyncQueueConfig } from "../types";

export type { DiscordSyncSummary };

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

export const getMemberSyncQueueConfig = createServerFn({ method: "GET" })
  .validator(() => ({}))
  .handler(async (): Promise<MemberSyncQueueConfig> => fetchWorkerSyncQueueConfig());
