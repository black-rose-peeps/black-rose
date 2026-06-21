import { createServerFn } from "@tanstack/react-start";

interface DiscordSyncResponse {
  checked?: number;
  updated?: number;
  verified?: number;
  unverified?: number;
  deferred?: number;
  notVerifiedQueued?: number;
  notVerifiedHotQueued?: number;
  notVerifiedColdQueued?: number;
  notVerifiedPaused?: number;
  syncPaused?: number;
  page?: number;
  totalPages?: number;
  priorityNotVerified?: boolean;
  coldSweep?: boolean;
}

export function formatDiscordSyncMessage(summary: DiscordSyncResponse): string {
  const checked = summary.checked ?? 0;
  const verified = summary.verified ?? 0;
  const unverified = summary.unverified ?? 0;
  const updated = summary.updated ?? 0;
  const deferred = summary.deferred ?? 0;
  const queued = summary.notVerifiedHotQueued ?? summary.notVerifiedQueued ?? 0;
  const cold = summary.notVerifiedColdQueued ?? 0;
  const paused = summary.notVerifiedPaused ?? 0;
  const priority = summary.priorityNotVerified ?? false;
  const syncPaused = summary.syncPaused ?? 0;

  const parts: string[] = ["Discord sync completed."];

  if (checked > 0) {
    parts.push(`Checked ${checked} member${checked === 1 ? "" : "s"}.`);
  }

  if (verified > 0) {
    parts.push(`${verified} newly verified.`);
  }

  if (unverified > 0) {
    parts.push(`${unverified} marked not verified.`);
  }

  if (updated === 0 && checked > 0) {
    parts.push("No status changes.");
  }

  if (deferred > 0) {
    parts.push(`${deferred} member${deferred === 1 ? "" : "s"} deferred — run sync again to continue.`);
  }

  if (syncPaused > 0) {
    parts.push(`${syncPaused} member${syncPaused === 1 ? "" : "s"} paused (not in Discord guild).`);
  }

  if (queued > checked) {
    parts.push(
      priority
        ? `${queued} in the hot queue — this run checked the ${checked} newest active Not Verified member${checked === 1 ? "" : "s"}. Run sync again to continue.`
        : `${queued} in the hot Not Verified queue. Cron always checks newest first; use Sync Discord now during verification waves.`,
    );
  }

  if (cold > 0 || paused > 0) {
    const extras: string[] = [];
    if (cold > 0) extras.push(`${cold} cold (older than hot window)`);
    if (paused > 0) extras.push(`${paused} paused`);
    parts.push(`Backlog: ${extras.join(", ")} — cold/paused members are swept daily, not every cron run.`);
  }

  return parts.join(" ");
}

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

export const triggerDiscordSync = createServerFn({ method: "POST" })
  .validator(() => ({}))
  .handler(async (): Promise<DiscordSyncResponse> => {
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

    return (await response.json()) as DiscordSyncResponse;
  });
