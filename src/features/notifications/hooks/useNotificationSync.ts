import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { syncTeamInviteNotifications } from "../services/team-invite-notifications";

/** Keep team-invite notifications in sync via Supabase Realtime. */
export function useNotificationSync(memberId: string | undefined) {
  useEffect(() => {
    if (!memberId) return;

    const userId = memberId;
    let cancelled = false;

    async function sync() {
      try {
        await syncTeamInviteNotifications(userId);
      } catch (err) {
        if (!cancelled) {
          console.error("[notifications] syncTeamInviteNotifications failed:", err);
        }
      }
    }

    void sync();

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`team-invites:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_members",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void sync();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [memberId]);
}
