import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { fetchMembers } from "../services/members.service";
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

  useEffect(() => {
    void refetch();

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("admin-members-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => {
        void refetch({ silent: true });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

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
