import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CornerAccents } from "@/features/member/components/MemberShell";
import { DiscordIcon } from "@/features/shared/components/DiscordIcon";
import type { DiscordAppLinkRequest } from "@/features/shared/hooks/useDiscordAppLink";
import { isDiscordAppUrl, toDiscordAppUrl } from "@/lib/discord-url";

interface DiscordAppLinkDialogProps {
  pending: DiscordAppLinkRequest | null;
  onConfirm: (dontAskAgain: boolean) => void;
  onCancel: () => void;
  /** Shown for OAuth sign-in when the user has no Discord app installed. */
  onBrowserFallback?: () => void;
}

export function DiscordAppLinkDialog({
  pending,
  onConfirm,
  onCancel,
  onBrowserFallback,
}: DiscordAppLinkDialogProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const isOAuth = pending?.kind === "oauth";
  const appUrl = pending ? toDiscordAppUrl(pending.url) : null;
  const openHref = appUrl && isDiscordAppUrl(appUrl) ? appUrl : pending?.url;

  function handleOpenChange(open: boolean) {
    if (!open) {
      setDontAskAgain(false);
      onCancel();
    }
  }

  function handleConfirmClick() {
    onConfirm(dontAskAgain);
    setDontAskAgain(false);
  }

  return (
    <Dialog open={pending !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden rounded-none border border-white/12 bg-[oklch(0.07_0_0)] p-0 shadow-[0_24px_64px_rgba(0,0,0,0.85)] sm:rounded-none">
        <div className="relative overflow-hidden px-6 pb-5 pt-7">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
          <CornerAccents />

          <DialogHeader className="relative space-y-3 text-left">
            <DialogTitle className="font-display text-2xl leading-tight tracking-display text-foreground">
              {isOAuth ? "Sign in with Discord" : "Open Discord app?"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {isOAuth ? (
                <>
                  Sign in using the account already logged into your Discord app — not your browser.
                  After you approve, your browser will finish sign-in in a new tab.
                </>
              ) : pending ? (
                `This opens ${pending.label} in your Discord desktop app — the account you're already signed into there.`
              ) : (
                "This opens the link in your Discord desktop app."
              )}{" "}
              If your browser asks to allow discord:// links, choose Open or Allow.
            </DialogDescription>
          </DialogHeader>

          <label className="relative mt-4 flex cursor-pointer items-center gap-2.5 text-left">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              className="h-4 w-4 rounded-none border-white/20 bg-white/5 accent-white"
            />
            <span className="text-sm text-muted-foreground">Don&apos;t ask again</span>
          </label>

          {onBrowserFallback && (
            <button
              type="button"
              onClick={() => {
                setDontAskAgain(false);
                onBrowserFallback();
                onCancel();
              }}
              className="relative mt-4 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {isOAuth ? "No Discord app? Continue in browser" : "Open in browser instead"}
            </button>
          )}
        </div>

        <DialogFooter className="relative gap-3 border-t border-white/8 bg-black/20 px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="rounded-none font-tech text-ui-readable uppercase"
          >
            Cancel
          </Button>
          {openHref ? (
            <a
              href={openHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleConfirmClick}
              className="clip-cta inline-flex h-11 items-center gap-2 rounded-none bg-[#5865F2] px-5 font-tech text-ui-readable uppercase text-white transition hover:bg-[#4752c4]"
            >
              <DiscordIcon className="h-3.5 w-3.5 shrink-0" />
              {isOAuth ? "Open Discord" : "Open App"}
            </a>
          ) : (
            <Button
              type="button"
              onClick={handleConfirmClick}
              className="clip-cta inline-flex h-11 items-center gap-2 rounded-none bg-[#5865F2] px-5 font-tech text-ui-readable uppercase text-white hover:bg-[#4752c4]"
            >
              <DiscordIcon className="h-3.5 w-3.5 shrink-0" />
              {isOAuth ? "Open Discord" : "Open App"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
