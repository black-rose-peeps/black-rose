import { useCallback, useEffect, useState } from "react";
import { fetchParticipants, setParticipantStatus } from "../services/participants.service";
import type { MockTeam } from "@/lib/mock-data";
import type { ParticipantRow } from "../types";

export function useParticipants() {
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchParticipants();
      setParticipants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load participants.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const updateStatus = useCallback(
    async (registrationId: string, status: MockTeam["status"]) => {
      setUpdatingId(registrationId);
      try {
        const updated = await setParticipantStatus(registrationId, status);
        setParticipants((prev) => prev.map((p) => (p.id === registrationId ? updated : p)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update status.");
        throw err;
      } finally {
        setUpdatingId(null);
      }
    },
    [],
  );

  return { participants, isLoading, error, updatingId, refetch, updateStatus };
}
