import { useCallback, useState } from "react";
import { openDiscordApp } from "@/lib/discord-url";

const SKIP_PROMPT_KEY = "br_discord_app_prompt_skip";

function readSkipPrompt(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SKIP_PROMPT_KEY) === "1";
  } catch {
    return false;
  }
}

function writeSkipPrompt(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SKIP_PROMPT_KEY, "1");
  } catch {
    // Storage may be unavailable (private mode, quota).
  }
}

export interface DiscordAppLinkRequest {
  url: string;
  label: string;
  /** OAuth sign-in uses different dialog copy and a browser fallback option. */
  kind?: "link" | "oauth";
}

export function useDiscordAppLink() {
  const [pending, setPending] = useState<DiscordAppLinkRequest | null>(null);

  const requestDiscordAppLink = useCallback(
    (url: string, label = "Discord", kind: DiscordAppLinkRequest["kind"] = "link") => {
      if (typeof window === "undefined") return;

      if (readSkipPrompt()) {
        openDiscordApp(url);
        return;
      }

      setPending({ url, label, kind });
    },
    [],
  );

  /** Called when the user confirms — navigation is handled by the dialog anchor. */
  const confirmDiscordAppLink = useCallback((dontAskAgain: boolean) => {
    if (dontAskAgain) {
      writeSkipPrompt();
    }
    setPending(null);
  }, []);

  const cancelDiscordAppLink = useCallback(() => {
    setPending(null);
  }, []);

  return {
    pending,
    requestDiscordAppLink,
    confirmDiscordAppLink,
    cancelDiscordAppLink,
  };
}
