/** Admin UI sync queue thresholds — fetched from the Discord sync Worker. */

import type { MemberSyncQueueConfig } from "../types";

export const DEFAULT_MEMBER_SYNC_QUEUE_CONFIG: MemberSyncQueueConfig = {
  hotDays: 30,
  coldSweepIntervalMinutes: 1440,
};

export type { MemberSyncQueueConfig };

export function formatColdSweepCadence(minutes: number): string {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    const days = minutes / 1440;
    return days === 1 ? "daily" : `every ${days} days`;
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "hourly" : `every ${hours} hours`;
  }
  return `every ${minutes} minutes`;
}

export function normalizeWorkerQueueConfig(value: unknown): MemberSyncQueueConfig | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const hotDays = Number(record.hotDays);
  const coldSweepIntervalMinutes = Number(record.coldSweepIntervalMinutes);

  if (!Number.isFinite(hotDays) || hotDays < 1) return null;
  if (!Number.isFinite(coldSweepIntervalMinutes) || coldSweepIntervalMinutes < 15) {
    return null;
  }

  return {
    hotDays: Math.min(hotDays, 365),
    coldSweepIntervalMinutes: Math.min(coldSweepIntervalMinutes, 60 * 24 * 30),
  };
}
