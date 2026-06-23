import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { isCapacitorNative } from "@/lib/capacitor";
import { isDiscordNativeRedirectUri } from "@/lib/discord-mobile-oauth";

function parseNativeOAuthCallback(url: string): Record<string, string> | null {
  const queryIndex = url.indexOf("?");
  const base = queryIndex === -1 ? url : url.slice(0, queryIndex);
  if (!isDiscordNativeRedirectUri(base)) return null;

  const search = queryIndex === -1 ? "" : url.slice(queryIndex + 1);
  const params = new URLSearchParams(search);
  const callbackSearch: Record<string, string> = {};
  params.forEach((value, key) => {
    callbackSearch[key] = value;
  });
  return callbackSearch;
}

/** Routes Discord mobile deep-link OAuth callbacks into `/auth/callback`. */
export function CapacitorOAuthBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isCapacitorNative()) return;

    let removeListener: (() => void) | undefined;

    const handleUrlOpen = (event: URLOpenListenerEvent) => {
      const search = parseNativeOAuthCallback(event.url);
      if (!search) return;

      void navigate({
        to: "/auth/callback",
        search,
        replace: true,
      });
    };

    void App.addListener("appUrlOpen", handleUrlOpen).then((handle) => {
      removeListener = () => void handle.remove();
    });

    void App.getLaunchUrl().then((result) => {
      if (result?.url) {
        handleUrlOpen({ url: result.url });
      }
    });

    return () => {
      removeListener?.();
    };
  }, [navigate]);

  return null;
}
