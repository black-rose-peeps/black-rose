import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { createAdminSilentRefetch } from "@/lib/admin-realtime-refetch";
import { fetchMembers } from "../services/members.service";
import { normalizeMemberStatus } from "../utils";
import type { AdminMember } from "../types";

export function useMembers() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const data = await fetchMembers();
      setMembers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members.");
    } finally {
      if (!options?.silent) setIsLoading(false);
    }
  }, []);

  const debouncedRefetch = useMemo(
    () => createAdminSilentRefetch(refetch),
    [refetch],
  );

  useEffect(() => {
    void refetch();

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("admin-members-list")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "members" },
        (payload) => {
          const row = payload.new as Record<string, unknown> | undefined;
          if (!row?.id) {
            debouncedRefetch({ silent: true });
            return;
          }
          const memberId = row.id as string;
          setMembers((prev) => {
            if (!prev.some((member) => member.id === memberId)) {
              debouncedRefetch({ silent: true });
              return prev;
            }
            return prev.map((member) =>
              member.id === memberId
                ? {
                    ...member,
                    username: (row.username as string) ?? member.username,
                    discordUsername: (row.discord_username as string) ?? member.discordUsername,
                    discordId: (row.discord_id as string | null | undefined) ?? member.discordId,
                    status: normalizeMemberStatus(String(row.status ?? member.status)),
                  }
                : member,
            );
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "members" },
        (payload) => {
          const id = (payload.old as Record<string, unknown> | undefined)?.id as string | undefined;
          if (id) {
            setMembers((prev) => {
              if (!prev.some((member) => member.id === id)) {
                debouncedRefetch({ silent: true });
                return prev;
              }
              return prev.filter((member) => member.id !== id);
            });
            return;
          }
          debouncedRefetch({ silent: true });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "members" },
        () => {
          debouncedRefetch({ silent: true });
        },
      )
      .subscribe();

    return () => {
      debouncedRefetch.cancel();
      supabase.removeChannel(channel);
    };
  }, [refetch, debouncedRefetch]);

  const prependMember = useCallback((member: AdminMember) => {
    setMembers((prev) => [member, ...prev]);
  }, []);

  const replaceMember = useCallback((member: AdminMember) => {
    setMembers((prev) => prev.map((item) => (item.id === member.id ? member : item)));
  }, []);

  const removeMember = useCallback((memberId: string) => {
    setMembers((prev) => prev.filter((item) => item.id !== memberId));
  }, []);

  return { members, isLoading, error, refetch, prependMember, replaceMember, removeMember };
}
