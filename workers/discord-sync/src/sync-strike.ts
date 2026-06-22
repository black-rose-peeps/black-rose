import type { MemberStatus } from "./sync-queue";

export interface MemberRow {
  id: string;
  discord_id: string;
  status: MemberStatus;
  discord_not_in_guild_strikes: number;
  discord_sync_paused_at: string | null;
}

export function buildStrikeUpdate(
  member: MemberRow,
  notInGuild: boolean,
  strikeLimit: number,
): {
  strikes: number;
  pausedAt: string | null;
  pausedNow: boolean;
  reset: boolean;
  clearPause: boolean;
} {
  if (notInGuild) {
    if (member.discord_sync_paused_at) {
      return {
        strikes: member.discord_not_in_guild_strikes,
        pausedAt: member.discord_sync_paused_at,
        pausedNow: false,
        reset: false,
        clearPause: false,
      };
    }

    const strikes = member.discord_not_in_guild_strikes + 1;
    const pausedNow = strikes >= strikeLimit;
    return {
      strikes,
      pausedAt: pausedNow ? new Date().toISOString() : null,
      pausedNow,
      reset: false,
      clearPause: false,
    };
  }

  const hadStrikes = member.discord_not_in_guild_strikes > 0;
  return {
    strikes: 0,
    pausedAt: null,
    pausedNow: false,
    reset: hadStrikes,
    clearPause: hadStrikes,
  };
}
