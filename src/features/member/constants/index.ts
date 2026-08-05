import type { SocialPlatform } from "../types";

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  twitch: "Twitch",
  youtube: "YouTube",
  tiktok: "TikTok",
  facebook: "Facebook",
  x: "X / Twitter",
  instagram: "Instagram",
  discord: "Discord",
};

export const SOCIAL_PLATFORM_ORDER: SocialPlatform[] = [
  "twitch",
  "youtube",
  "tiktok",
  "facebook",
  "x",
  "instagram",
  "discord",
];

export const PROFILE_REGION_OPTIONS = ["PH", "SEA", "APAC", "Global"] as const;
