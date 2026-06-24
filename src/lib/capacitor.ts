import { Capacitor } from "@capacitor/core";

export function isCapacitorNative(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}
