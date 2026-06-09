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

  if (profile.avatarUrl?.trim()) score += 15;
  if (profile.displayName.trim()) score += 10;
  if (profile.bio.trim().length >= 20) score += 20;
  if (profile.mainGame.trim()) score += 20;
  if (profile.mainRole.trim()) score += 10;
  if (profile.region.trim()) score += 10;

  const publicSocials = profile.socialLinks.filter(
    (s) => Boolean(s.url?.trim() && s.isPublic),
  );
  if (publicSocials.length >= 1) score += 15;

  return Math.min(100, score);
}

export function profileCompletionHint(completion: number): string {
  if (completion >= 100) return "Profile fully set up.";
  if (completion >= 75) return "Add a public social link or finish your bio to complete your profile.";
  if (completion >= 50) return "Set your main game, role, and region to boost your profile.";
  return "Add your avatar, bio, and game info to get started.";
}
