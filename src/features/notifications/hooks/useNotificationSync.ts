import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { fetchActiveMemberTeams } from "@/features/tournaments/services/team-registration.service";
import { setNotificationMemberId } from "../store";
import { syncTeamMembershipNotifications } from "../services/team-membership-notifications";
import { syncProfileCommentNotifications } from "../services/profile-comment-notifications";
import { syncTournamentRegistrationRequestNotifications } from "../services/tournament-registration-request-notifications";
import { syncTournamentRegistrationNotifications } from "../services/tournament-registration-notifications";
import { syncTournamentLiveNotifications } from "../services/tournament-live-notifications";

function teamIdsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

/** Keep member notifications in sync via Supabase Realtime. */
export function useNotificationSync(memberId: string | undefined) {
  useEffect(() => {
    setNotificationMemberId(memberId ?? null);
    if (!memberId) return;

    const userId = memberId;
    let cancelled = false;
    let syncTail = Promise.resolve();
    const supabase = getSupabaseClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let subscribedTeamIds: string[] = [];

    function syncAll() {
      syncTail = syncTail.then(async () => {
        if (cancelled) return;
        try {
          await Promise.all([
            syncTeamMembershipNotifications(userId),
            syncTournamentRegistrationNotifications(userId),
            syncTournamentRegistrationRequestNotifications(userId),
            syncTournamentLiveNotifications(userId),
            syncProfileCommentNotifications(userId),
          ]);
        } catch (err) {
          if (!cancelled) {
            console.error("[notifications] sync failed:", err);
          }
        }
      });
      return syncTail;
    }

    async function teardownChannel() {
      if (!channel) return;
      await supabase.removeChannel(channel);
      channel = null;
    }

    async function refreshSubscriptionIfTeamsChanged() {
      if (cancelled) return;
      try {
        const teams = await fetchActiveMemberTeams(userId);
        const teamIds = teams.map((team) => team.id);
        if (!teamIdsEqual(subscribedTeamIds, teamIds)) {
          await subscribe();
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("[notifications] Failed to refresh registration filter:", err);
        }
      }
    }

    async function subscribe() {
      await teardownChannel();

      let teamIds: string[] = [];
      try {
        const teams = await fetchActiveMemberTeams(userId);
        teamIds = teams.map((team) => team.id);
      } catch (err) {
        if (!cancelled) {
          console.warn("[notifications] Failed to load teams for registration filter:", err);
        }
      }

      if (cancelled) return;

      subscribedTeamIds = teamIds;

      let nextChannel = supabase
        .channel(`member-notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "team_members",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void syncAll();
            void refreshSubscriptionIfTeamsChanged();
          },
        );

      if (teamIds.length > 0) {
        nextChannel = nextChannel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tournament_registrations",
            filter: `roster_team_id=in.(${teamIds.join(",")})`,
          },
          () => {
            void syncAll();
          },
        );
      }

      nextChannel = nextChannel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profile_comments",
          filter: `profile_member_id=eq.${userId}`,
        },
        () => {
          void syncAll();
        },
      );

      nextChannel = nextChannel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournaments",
        },
        () => {
          void syncAll();
        },
      );

      channel = nextChannel.subscribe();
    }

    void syncAll();
    void subscribe();

    function handleFocus() {
      void syncAll();
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocus);
      void teardownChannel();
      setNotificationMemberId(null);
    };
  }, [memberId]);
}
