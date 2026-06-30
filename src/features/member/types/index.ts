export type SocialPlatform =
  | "twitch"
  | "youtube"
  | "tiktok"
  | "facebook"
  | "x"
  | "instagram"
  | "discord";

export interface SocialLink {
  platform: SocialPlatform;
  label: string;
  url: string | null;
  isPublic: boolean;
}

export interface TournamentEntry {
  tournamentId: string;
  tournamentName: string;
  game: string;
  status: "Pending" | "Approved" | "Rejected";
  teamName: string;
  teamTag: string;
}

export interface UpcomingMatch {
  matchId: string;
  tournamentName: string;
  opponent: string;
  scheduledAt: string;
  round: string;
}

export interface MemberProfile {
  memberId: string;
  slug: string;
  displayName: string;
  username: string;
  discordUsername: string;
  headline: string;
  bio: string;
  avatarInitials: string;
  /** Data URL or remote URL of the uploaded avatar. null = show initials fallback. */
  avatarUrl: string | null;
  mainGame: string;
  mainRole: string;
  region: string;
  isVerified: boolean;
  isPublic: boolean;
  socialLinks: SocialLink[];
  valorantGameName: string;
  valorantTagline: string;
  /** Per-title in-game identities (non-Valorant). Valorant uses valorantGameName/tagline. */
  gameIdentities: Record<string, string>;
  /** @deprecated Use gameIdentities[mainGame] — kept for legacy reads during migration. */
  ingameDisplayName: string;
  tournamentHistory: string[];
  activeRegistrations: TournamentEntry[];
  upcomingMatches: UpcomingMatch[];
  profileCompletion: number; // 0-100
}
