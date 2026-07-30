import { SOCIAL_PLATFORM_ORDER } from "../constants";
import type { MemberProfile, SocialPlatform } from "../types";
import { resolveProfileMainGame } from "./profile-main-game";

export type ProfileSocialFormState = Record<SocialPlatform, { url: string; isPublic: boolean }>;

export interface ProfileFormState {
  displayName: string;
  headline: string;
  bio: string;
  mainGame: string;
  mainRole: string;
  region: string;
  valorantGameName: string;
  valorantTagline: string;
  gameIdentities: Record<string, string>;
  isPublic: boolean;
  socials: ProfileSocialFormState;
}

export function socialsFromProfile(profile: MemberProfile): ProfileSocialFormState {
  const state = {} as ProfileSocialFormState;
  for (const platform of SOCIAL_PLATFORM_ORDER) {
    const link = profile.socialLinks.find((s) => s.platform === platform);
    state[platform] = {
      url: link?.url ?? "",
      isPublic: link?.isPublic ?? true,
    };
  }
  return state;
}

export function profileFormStateFromMember(data: MemberProfile): ProfileFormState {
  return {
    displayName: data.displayName,
    headline: data.headline,
    bio: data.bio,
    mainGame: resolveProfileMainGame(data.mainGame),
    mainRole: data.mainRole,
    region: data.region.trim(),
    valorantGameName: data.valorantGameName,
    valorantTagline: data.valorantTagline,
    gameIdentities: { ...data.gameIdentities },
    isPublic: data.isPublic,
    socials: socialsFromProfile(data),
  };
}
