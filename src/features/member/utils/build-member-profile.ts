import type { AdminMember } from "@/features/admin/features/members/types";
import { SOCIAL_PLATFORM_LABELS, SOCIAL_PLATFORM_ORDER } from "../constants";
import type { MemberProfile, SocialLink, SocialPlatform } from "../types";
import { parseGameIdentitiesFromRow } from "./game-identity";
import { calculateProfileCompletion } from "./profile-completion";

export interface MemberProfileRow {
  id: string;
  member_id: string;
  slug: string;
  display_name: string;
  headline: string;
  bio: string;
  main_game: string | null;
  main_role: string;
  region: string;
  valorant_game_name: string | null;
  valorant_tagline: string | null;
  ingame_display_name: string | null;
  game_identities?: unknown;
  avatar_url: string | null;
  banner_url: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemberSocialLinkRow {
  id: string;
  member_id: string;
  platform: string;
  url: string | null;
  is_public: boolean;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function rowToSocialLink(row: MemberSocialLinkRow): SocialLink {
  const platform = row.platform as SocialPlatform;
  return {
    platform,
    label: SOCIAL_PLATFORM_LABELS[platform] ?? row.platform,
    url: row.url,
    isPublic: row.is_public,
  };
}

export function buildMemberProfile(
  member: AdminMember,
  profileRow: MemberProfileRow,
  socialRows: MemberSocialLinkRow[],
): MemberProfile {
  const socialByPlatform = new Map(socialRows.map((row) => [row.platform, row]));

  const socialLinks: SocialLink[] = SOCIAL_PLATFORM_ORDER.map((platform) => {
    const row = socialByPlatform.get(platform);
    if (row) return rowToSocialLink(row);
    return {
      platform,
      label: SOCIAL_PLATFORM_LABELS[platform],
      url: null,
      isPublic: true,
    };
  });

  const displayName = profileRow.display_name.trim() || member.username;
  const mainGame = profileRow.main_game?.trim() ?? "";
  const mainRole = profileRow.main_role.trim();
  const region = profileRow.region.trim();
  const avatarUrl = profileRow.avatar_url;

  const profileCompletion = calculateProfileCompletion({
    avatarUrl,
    displayName,
    bio: profileRow.bio,
    mainGame,
    mainRole,
    region,
    socialLinks,
  });

  const gameIdentities = parseGameIdentitiesFromRow(profileRow);

  return {
    memberId: member.id,
    slug: profileRow.slug,
    displayName,
    username: member.username,
    discordUsername: member.discordUsername,
    headline: profileRow.headline.trim() || "Black Rose Member",
    bio: profileRow.bio,
    avatarInitials: initialsFromName(displayName),
    avatarUrl,
    mainGame,
    mainRole,
    region,
    isVerified: member.status === "Verified",
    isPublic: profileRow.is_public,
    socialLinks,
    valorantGameName: profileRow.valorant_game_name?.trim() ?? "",
    valorantTagline: profileRow.valorant_tagline?.trim() ?? "",
    gameIdentities,
    ingameDisplayName: gameIdentities[mainGame] ?? profileRow.ingame_display_name?.trim() ?? "",
    tournamentHistory: [],
    activeRegistrations: [],
    upcomingMatches: [],
    profileCompletion,
  };
}
