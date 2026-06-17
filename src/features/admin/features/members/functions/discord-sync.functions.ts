import { createServerFn } from "@tanstack/react-start";

interface BoostResponse {
  boosted: boolean;
  alreadyActive?: boolean;
  boostMinutes?: number;
  boostActive: boolean;
  boostUntil: string | null;
  summary?: Record<string, number>;
}

interface BoostStatusResponse {
  boostActive: boolean;
  boostUntil: string | null;
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

export const triggerDiscordSyncBoost = createServerFn({ method: "POST" })
  .validator(() => ({}))
  .handler(async (): Promise<BoostResponse> => {
    const { workerUrl, syncSecret } = getRequiredSyncConfig();

    const response = await fetchWithTimeout(`${workerUrl}/sync/boost`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${syncSecret}`,
      },
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Boost request failed (${response.status}): ${detail}`);
    }

    return (await response.json()) as BoostResponse;
  });

export const fetchDiscordSyncBoostStatus = createServerFn({ method: "POST" })
  .validator(() => ({}))
  .handler(async (): Promise<BoostStatusResponse> => {
    const { workerUrl, syncSecret } = getRequiredSyncConfig();

    const response = await fetchWithTimeout(`${workerUrl}/sync/status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${syncSecret}`,
      },
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Boost status request failed (${response.status}): ${detail}`);
    }

    return (await response.json()) as BoostStatusResponse;
  });
