import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";

/** Refetch when roster rows for a team change (invite, accept, remove). */
export function useTeamMembersRealtime(teamId: string | undefined, onUpdate: () => void) {
  useEffect(() => {
    if (!teamId || typeof window === "undefined") return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`team-members:${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_members",
          filter: `team_id=eq.${teamId}`,
        },
        () => onUpdate(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [teamId, onUpdate]);
}

/** Refetch when the signed-in member's team memberships change. */
export function useMemberTeamMembershipRealtime(
  memberId: string | undefined,
  onUpdate: () => void,
) {
  useEffect(() => {
    if (!memberId || typeof window === "undefined") return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`member-teams:${memberId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_members",
          filter: `user_id=eq.${memberId}`,
        },
        () => onUpdate(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [memberId, onUpdate]);
}
