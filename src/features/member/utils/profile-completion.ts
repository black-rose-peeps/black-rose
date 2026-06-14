import type { MemberProfile } from "../types";

/** Weighted completion score (0–100) from profile fields. */
export function calculateProfileCompletion(profile: {
  avatarUrl: string | null;
  displayName: string;
  bio: string;
  mainGame: string;
  mainRole: string;
  region: string;
  socialLinks: { url: string | null; isPublic: boolean }[];
}): number {
  let score = 0;

  if (profile.avatarUrl?.trim()) score += 18;
  if (profile.displayName.trim()) score += 12;
  if (profile.bio.trim().length >= 20) score += 24;
  if (profile.mainGame.trim()) score += 24;
  if (profile.mainRole.trim()) score += 12;
  if (profile.region.trim()) score += 10;

  return Math.min(100, score);
}

export function isProfileComplete(completion: number): boolean {
  return completion >= 100;
}

export function profileCompletionHint(completion: number): string {
  if (completion >= 100) {
    return "Your profile is fully set up — you're ready for invites, rosters, and your public page.";
  }
  if (completion >= 75) {
    return "Add a bio of at least 20 characters, or finish your remaining game details.";
  }
  if (completion >= 50) return "Set your main game, role, and region to boost your profile.";
  return "Add your avatar, a 20+ character bio, and game info to get started.";
}
