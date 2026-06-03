// Mock member profile data — frontend placeholder only
import type { MemberProfile } from "@/features/member/types";

export const mockMemberProfile: MemberProfile = {
  slug: "CoyHa",
  displayName: "CoyHa",
  username: "CoyHa",
  headline: "Valorant Duelist / IGL · Black Rose Verified Member",
  bio: "Competing, creating, and representing Black Rose. Main entry fragger and shot-caller for Novellino eSports.",
  avatarInitials: "CH",
  avatarUrl: null,
  mainGame: "Valorant",
  mainRole: "Duelist / IGL",
  region: "PH / APAC",
  isVerified: true,
  profileCompletion: 75,
  riotAccount: {
    gameName: "CoyHa",
    tagline: "APAC",
    region: "APAC",
    isLinked: true,
  },
  socialLinks: [
    {
      platform: "twitch",
      label: "Twitch",
      url: "https://www.twitch.tv/coyha",
      isPublic: true,
    },
    { platform: "youtube", label: "YouTube", url: null, isPublic: false },
    {
      platform: "tiktok",
      label: "TikTok",
      url: "https://tiktok.com/@coyha",
      isPublic: true,
    },
    { platform: "facebook", label: "Facebook Gaming", url: null, isPublic: false },
    { platform: "x", label: "X / Twitter", url: null, isPublic: false },
    { platform: "instagram", label: "Instagram", url: null, isPublic: false },
  ],
  activeRegistrations: [
    {
      tournamentId: "vlr-nightfall",
      tournamentName: "Valorant Nightfall Cup",
      game: "Valorant",
      status: "Pending",
      teamName: "Novellino eSports",
      teamTag: "NE",
    },
  ],
  upcomingMatches: [],
  tournamentHistory: ["Valorant Onyx Series — Top 8", "Valorant Spring Open — Champions"],
};

/**
 * Look up a member profile by slug.
 * Replace with a real API call when the backend is ready.
 */
export function getMemberBySlug(slug: string): MemberProfile | null {
  if (slug.trim().toLowerCase() === mockMemberProfile.slug.trim().toLowerCase())
    return mockMemberProfile;
  return null;
}
