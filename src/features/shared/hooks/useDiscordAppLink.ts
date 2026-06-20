import { useCallback, useState } from "react";
import {
  isDiscordLinked,
  readDiscordAppPromptSkip,
  writeDiscordAppPromptSkip,
} from "@/features/auth/services/discord";
import { openDiscordAppFromUserGesture } from "@/lib/discord-url";

export interface DiscordAppLinkRequest {
  url: string;
  label: string;
  /** OAuth sign-in uses different dialog copy and a browser fallback option. */
  kind?: "link" | "oauth";
}

function shouldOpenDiscordDirectly(kind: DiscordAppLinkRequest["kind"]): boolean {
  if (kind !== "oauth") {
    return readDiscordAppPromptSkip();
  }
  return isDiscordLinked() || readDiscordAppPromptSkip();
}

export function useDiscordAppLink() {
  const [pending, setPending] = useState<DiscordAppLinkRequest | null>(null);

  const requestDiscordAppLink = useCallback(
    (url: string, label = "Discord", kind: DiscordAppLinkRequest["kind"] = "link") => {
      if (typeof window === "undefined") return;

      if (shouldOpenDiscordDirectly(kind)) {
        openDiscordAppFromUserGesture(url);
        return;
      }

      setPending({ url, label, kind });
    },
    [],
  );

  /** Called when the user confirms — navigation is handled by the dialog anchor. */
  const confirmDiscordAppLink = useCallback((dontAskAgain: boolean) => {
    if (dontAskAgain) {
      writeDiscordAppPromptSkip();
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
