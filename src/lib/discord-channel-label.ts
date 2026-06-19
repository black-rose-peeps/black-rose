/** Discord `:name:` shortcodes → Unicode for web display (not rendered on websites). */
const DISCORD_EMOJI_SHORTCODES: Record<string, string> = {
  white_check_mark: "✅",
  checkered_flag: "🏁",
  rose: "🌹",
};

/**
 * Turn Discord channel label env values into browser-safe text.
 * Vercel/env files sometimes copy `:white_check_mark:` instead of ✅.
 */
export function formatDiscordChannelLabel(label: string): string {
  return label.replace(/:([a-z0-9_]+):/gi, (match, name: string) => {
    return DISCORD_EMOJI_SHORTCODES[name.toLowerCase()] ?? match;
  });
}
