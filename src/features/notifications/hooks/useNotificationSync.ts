import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { syncTeamMembershipNotifications } from "../services/team-membership-notifications";
import { syncTournamentRegistrationNotifications } from "../services/tournament-registration-notifications";

/** Keep member notifications in sync via Supabase Realtime. */
export function useNotificationSync(memberId: string | undefined) {
  useEffect(() => {
    if (!memberId) return;

    const userId = memberId;
    let cancelled = false;

    async function syncAll() {
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
    }

    void syncAll();

    const supabase = getSupabaseClient();
    const channel = supabase
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
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_registrations",
        },
        () => {
          void syncAll();
        },
      )
      .subscribe();

    function handleFocus() {
      void syncAll();
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocus);
      void supabase.removeChannel(channel);
    };
  }, [memberId]);
}
