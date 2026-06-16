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

export const triggerDiscordSyncBoost = createServerFn({ method: "POST" })
  .validator(() => ({}))
  .handler(async (): Promise<BoostResponse> => {
    const workerUrl =
      process.env.DISCORD_SYNC_WORKER_URL?.trim() ||
      "https://blackrose-discord-sync.domasigreoner.workers.dev";
    const syncSecret = process.env.DISCORD_SYNC_SECRET?.trim();

    if (!syncSecret) {
      throw new Error("Missing DISCORD_SYNC_SECRET in app server env.");
    }

    const response = await fetch(`${workerUrl}/sync/boost`, {
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
    const workerUrl =
      process.env.DISCORD_SYNC_WORKER_URL?.trim() ||
      "https://blackrose-discord-sync.domasigreoner.workers.dev";
    const syncSecret = process.env.DISCORD_SYNC_SECRET?.trim();

    if (!syncSecret) {
      throw new Error("Missing DISCORD_SYNC_SECRET in app server env.");
    }

    const response = await fetch(`${workerUrl}/sync/status`, {
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
