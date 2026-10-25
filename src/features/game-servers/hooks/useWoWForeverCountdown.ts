import { useEffect, useState } from "react";
import {
  getWoWForeverCountdown,
  WOW_FOREVER_LAUNCH_MS,
  type LaunchCountdown,
} from "../utils/wow-forever-launch";

/** Only the promoted icon ticks; SSR and first hydration use the normal destination. */
export function useWoWForeverCountdown(enabled: boolean): LaunchCountdown | null {
  const [countdown, setCountdown] = useState<LaunchCountdown | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    function refresh() {
      window.clearTimeout(timer);
      const now = Date.now();
      const next = getWoWForeverCountdown(now);
      setCountdown(next);
      if (next && !document.hidden) {
        timer = window.setTimeout(refresh, Math.min(1000, WOW_FOREVER_LAUNCH_MS - now));
      }
    }
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [enabled]);

  return enabled ? countdown : null;
}
