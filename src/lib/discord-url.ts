/** Convert a https://discord.com URL into a discord:// deep link for the desktop app. */
export function toDiscordAppUrl(httpsUrl: string): string {
  try {
    const parsed = new URL(httpsUrl);
    if (parsed.hostname === "discord.com" || parsed.hostname === "www.discord.com") {
      return `discord://discord.com${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // Fall through to the original URL.
  }
  return httpsUrl;
}

/** Open a Discord link in the desktop app only — never falls back to the browser. */
export function launchDiscordDesktopApp(httpsUrl: string): void {
  const appUrl = toDiscordAppUrl(httpsUrl);
  if (!appUrl.startsWith("discord://")) return;

  // Direct navigation from a user click brings Discord to the foreground on most desktops.
  window.location.href = appUrl;
}

/** @deprecated Use launchDiscordDesktopApp via useDiscordAppLink for the consent modal flow. */
export function openDiscordLink(httpsUrl: string): void {
  launchDiscordDesktopApp(httpsUrl);
}
