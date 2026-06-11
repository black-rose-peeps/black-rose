import { useCallback, useEffect, useState } from "react";
import {
  fetchParticipants,
  setParticipantStatus,
  setParticipantStatuses,
} from "../services/participants.service";
import type { MockTeam } from "@/lib/mock-data";
import type { ParticipantRow } from "../types";

export function useParticipants() {
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

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
    async (registrationId: string, status: MockTeam["status"]): Promise<ParticipantRow> => {
      setUpdatingId(registrationId);
      try {
        const updated = await setParticipantStatus(registrationId, status);
        setParticipants((prev) => prev.map((p) => (p.id === registrationId ? updated : p)));
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update status.");
        throw err;
      } finally {
        setUpdatingId(null);
      }
    },
    [],
  );

  const updateStatusesBulk = useCallback(
    async (
      registrationIds: string[],
      status: MockTeam["status"],
    ): Promise<{ updated: ParticipantRow[]; failed: string[] }> => {
      if (!registrationIds.length) return { updated: [], failed: [] };

      setIsBulkUpdating(true);
      try {
        const result = await setParticipantStatuses(registrationIds, status);
        if (result.updated.length) {
          const byId = new Map(result.updated.map((row) => [row.id, row]));
          setParticipants((prev) => prev.map((p) => byId.get(p.id) ?? p));
        }
        if (result.failed.length) {
          setError(`Failed to update ${result.failed.length} registration(s).`);
        }
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update registrations.");
        throw err;
      } finally {
        setIsBulkUpdating(false);
      }
    },
    [],
  );

  return {
    participants,
    isLoading,
    error,
    updatingId,
    isBulkUpdating,
    refetch,
    updateStatus,
    updateStatusesBulk,
  };
}
