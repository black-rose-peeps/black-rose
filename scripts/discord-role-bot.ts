#!/usr/bin/env node
/**
 * Discord Gateway worker — syncs ROSE role changes to Supabase.
 *
 * Run alongside the web app:
 *   npm run discord-bot
 *
 * Requires Server Members Intent enabled in the Discord Developer Portal.
 */
import { startDiscordRoleBot } from "../src/features/auth/server/discord-role-bot.server.ts";

startDiscordRoleBot().catch((err) => {
  console.error("[discord-bot] Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
