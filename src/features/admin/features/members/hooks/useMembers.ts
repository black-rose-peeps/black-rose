import { useCallback, useEffect, useState } from "react";
import { fetchMembers } from "../services/members.service";
import type { AdminMember } from "../types";

export function useMembers() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMembers();
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const prependMember = useCallback((member: AdminMember) => {
    setMembers((prev) => [member, ...prev]);
  }, []);

  return { members, isLoading, error, refetch, prependMember };
}
