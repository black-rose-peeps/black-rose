import type { AnchorHTMLAttributes } from "react";
import { isDiscordAppUrl, openDiscordInBrowser, toDiscordAppUrl } from "@/lib/discord-url";

interface DiscordAppAnchorProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel"> {
  /** https://discord.com/... invite, channel, or OAuth authorize URL */
  discordUrl: string;
}

/**
 * Native anchor that opens Discord in the desktop/mobile app on click.
 * Prefer this over programmatic navigation — browsers only hand off discord://
 * reliably from a direct user click on an <a href="discord://...">.
 */
export function DiscordAppAnchor({
  discordUrl,
  className,
  children,
  onClick,
  ...props
}: DiscordAppAnchorProps) {
  const appUrl = toDiscordAppUrl(discordUrl);
  const href = isDiscordAppUrl(appUrl) ? appUrl : discordUrl;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (!isDiscordAppUrl(appUrl)) {
          event.preventDefault();
          openDiscordInBrowser(discordUrl);
        }
      }}
      {...props}
    >
      {children}
    </a>
  );
}
