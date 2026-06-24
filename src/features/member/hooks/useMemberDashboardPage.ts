import { useMemo } from "react";
import { useSyncedMemberSession } from "@/features/auth/hooks/useSyncedMemberSession";
import type { AppUser } from "@/features/auth/types";
import type { ChampionshipTitle } from "@/features/championships/types";
import {
  useMemberChampionshipsQuery,
  useMemberProfileQuery,
} from "@/features/member/queries/member-profile-queries";
import { useMemberTournamentDashboardQuery } from "@/features/member/queries/member-dashboard-queries";
import type { MemberProfile } from "@/features/member/types";

function profileFallbackFromSession(session: AppUser): MemberProfile {
  const initials = session.displayName.slice(0, 2).toUpperCase();
  return {
    memberId: session.id,
    slug: session.profileSlug ?? session.username,
    displayName: session.displayName,
    username: session.username,
    discordUsername: session.discordUsername ?? session.username,
    headline: "Black Rose Member",
    bio: "",
    avatarInitials: initials,
    avatarUrl: session.avatarUrl,
    mainGame: "",
    mainRole: "",
    region: "",
    isVerified: true,
    isPublic: true,
    socialLinks: [],
    valorantGameName: "",
    valorantTagline: "",
    tournamentHistory: [],
    activeRegistrations: [],
    upcomingMatches: [],
    profileCompletion: 0,
  };
}

export interface MemberDashboardPageState {
  session: AppUser | null;
  profile: MemberProfile | null;
  championships: ChampionshipTitle[];
  isLoading: boolean;
}

export function useMemberDashboardPage(): MemberDashboardPageState {
  const { session, isSyncing } = useSyncedMemberSession();
  const memberId = session?.id;

  const profileQuery = useMemberProfileQuery(memberId);
  const dashboardQuery = useMemberTournamentDashboardQuery(memberId);
  const championshipsQuery = useMemberChampionshipsQuery(memberId);

  const profile = useMemo(() => {
    if (!session) return null;

    const base = profileQuery.data ?? profileFallbackFromSession(session);
    const tournamentDashboard = dashboardQuery.data;
    if (!tournamentDashboard) return base;

    return {
      ...base,
      activeRegistrations: tournamentDashboard.activeRegistrations,
      upcomingMatches: tournamentDashboard.upcomingMatches,
      tournamentHistory: tournamentDashboard.tournamentHistory,
    };
  }, [session, profileQuery.data, dashboardQuery.data]);

  const isLoading =
    isSyncing ||
    (!!memberId &&
      (profileQuery.isPending || dashboardQuery.isPending || championshipsQuery.isPending));

  return {
    session,
    profile,
    championships: championshipsQuery.data ?? [],
    isLoading,
  };
}
