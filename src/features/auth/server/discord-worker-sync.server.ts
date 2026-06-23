import type { MemberVerificationStatus } from "@/features/admin/features/members/types";

const WORKER_REQUEST_TIMEOUT_MS = 15000;

export interface WorkerMemberSyncResult {
  discordId: string;
  status: MemberVerificationStatus;
  updated: boolean;
  hasRose: boolean;
  notInGuild: boolean;
  syncPaused: boolean;
}

function getWorkerSyncConfig() {
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

export function isDiscordWorkerSyncConfigured(): boolean {
  return Boolean(
    process.env.DISCORD_SYNC_WORKER_URL?.trim() &&
      process.env.DISCORD_SYNC_SECRET?.trim(),
  );
}

async function fetchWorker(
  path: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WORKER_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(path, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Discord sync worker timed out after ${WORKER_REQUEST_TIMEOUT_MS}ms.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Target one member via the Cloudflare discord-sync worker (bypasses batch queue limits). */
export async function triggerWorkerMemberSync(
  discordId: string,
  options?: { clearSyncState?: boolean },
): Promise<WorkerMemberSyncResult> {
  const trimmed = discordId.trim();
  if (!trimmed) {
    throw new Error("Missing Discord user id.");
  }

  const { workerUrl, syncSecret } = getWorkerSyncConfig();
  const response = await fetchWorker(`${workerUrl}/sync/member`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${syncSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      discordId: trimmed,
      clearSyncState: options?.clearSyncState ?? false,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Discord member sync failed (${response.status}): ${detail}`);
  }

  return (await response.json()) as WorkerMemberSyncResult;
}
