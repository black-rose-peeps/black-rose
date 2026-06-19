import { useCallback, useEffect, useMemo, useState } from "react";
import type { MockTeam } from "@/lib/mock-data";
import { getSupabaseClient } from "@/lib/supabase";
import { createAdminSilentRefetch } from "@/lib/admin-realtime-refetch";
import { fetchTournamentRegistrations } from "../services/tournament-registrations.service";

export function useTournamentRegistrations(tournamentId: string) {
  const [registrations, setRegistrations] = useState<MockTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const data = await fetchTournamentRegistrations(tournamentId);
        setRegistrations(data);
        setError(null);
      } catch (err) {
        if (!options?.silent) {
          setError(err instanceof Error ? err.message : "Failed to load registrations.");
        }
      } finally {
        if (!options?.silent) setIsLoading(false);
      }
    },
    [tournamentId],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchTournamentRegistrations(tournamentId);
        if (!cancelled) {
          setRegistrations(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load registrations.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  const debouncedRefetch = useMemo(
    () => createAdminSilentRefetch(refetch),
    [refetch],
  );

  // Keep in sync when registrations are approved/updated elsewhere (e.g. Participants page).
  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`tournament-regs:${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_registrations",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          debouncedRefetch({ silent: true });
        },
      )
      .subscribe();

    return () => {
      debouncedRefetch.cancel();
      void supabase.removeChannel(channel);
    };
  }, [tournamentId, refetch, debouncedRefetch]);

  const prependRegistration = useCallback((registration: MockTeam) => {
    setRegistrations((prev) => [registration, ...prev]);
  }, []);

  const prependRegistrations = useCallback((items: MockTeam[]) => {
    if (!items.length) return;
    setRegistrations((prev) => {
      const seen = new Set(prev.map((row) => row.id));
      const fresh = items.filter((row) => !seen.has(row.id));
      if (!fresh.length) return prev;
      return [...fresh, ...prev];
    });
  }, []);

  const updateRegistration = useCallback((registration: MockTeam) => {
    setRegistrations((prev) =>
      prev.map((item) => (item.id === registration.id ? registration : item)),
    );
  }, []);

  const removeRegistration = useCallback((registrationId: string) => {
    setRegistrations((prev) => prev.filter((item) => item.id !== registrationId));
  }, []);

  return {
    registrations,
    isLoading,
    error,
    refetch,
    prependRegistration,
    prependRegistrations,
    updateRegistration,
    removeRegistration,
  };
}
