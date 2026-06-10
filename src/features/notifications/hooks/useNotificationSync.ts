import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { fetchActiveMemberTeams } from "@/features/tournaments/services/team-registration.service";
import { syncTeamMembershipNotifications } from "../services/team-membership-notifications";
import { syncTournamentRegistrationNotifications } from "../services/tournament-registration-notifications";

/** Keep member notifications in sync via Supabase Realtime. */
export function useNotificationSync(memberId: string | undefined) {
  useEffect(() => {
    if (!memberId) return;

    const userId = memberId;
    let cancelled = false;
    let syncTail = Promise.resolve();

    function syncAll() {
      syncTail = syncTail.then(async () => {
        if (cancelled) return;
        try {
          await Promise.all([
            syncTeamMembershipNotifications(userId),
            syncTournamentRegistrationNotifications(userId),
          ]);
        } catch (err) {
          if (!cancelled) {
            console.error("[notifications] sync failed:", err);
          }
        }
      });
      return syncTail;
    }

    void syncAll();

    const supabase = getSupabaseClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribe() {
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

      channel = nextChannel.subscribe();
    }

    void subscribe();

    function handleFocus() {
      void syncAll();
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocus);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [memberId]);
}
