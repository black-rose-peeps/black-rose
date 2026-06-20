import type { AnchorHTMLAttributes } from "react";
import { getDiscordLinkHandoff } from "@/lib/discord-url";

interface DiscordAppAnchorProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel"> {
  /** https://discord.com/... invite, channel, or OAuth authorize URL */
  discordUrl: string;
}

/**
 * Opens Discord invites/channels in the app on click.
 * Mobile: https + same tab (OS universal links → Discord app).
 * Desktop: discord:// in a new tab so this page stays open.
 */
export function DiscordAppAnchor({
  discordUrl,
  className,
  children,
  onClick,
  ...props
}: DiscordAppAnchorProps) {
  const { href, openInNewTab } = getDiscordLinkHandoff(discordUrl);

  return (
    <a
      href={href}
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
      className={className}
      onClick={onClick}
      {...props}
    >
      {children}
    </a>
  );
}
