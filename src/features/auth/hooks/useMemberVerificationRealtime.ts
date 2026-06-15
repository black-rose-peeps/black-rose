import { useCallback, useEffect, useRef } from "react";
import type { MemberVerificationStatus } from "@/features/admin/features/members/types";
import { getSupabaseClient } from "@/lib/supabase";

/** Subscribe to verification status changes written by the Discord role bot. */
export function useMemberVerificationRealtime(
  memberId: string | null,
  onStatusChange: (status: MemberVerificationStatus) => void,
): void {
  const callbackRef = useRef(onStatusChange);
  callbackRef.current = onStatusChange;

  useEffect(() => {
    if (!memberId) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`member-verification:${memberId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "members",
          filter: `id=eq.${memberId}`,
        },
        (payload) => {
          const status = (payload.new as { status?: string } | null)?.status;
          if (status === "Verified" || status === "Not Verified") {
            callbackRef.current(status);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [memberId]);
}
