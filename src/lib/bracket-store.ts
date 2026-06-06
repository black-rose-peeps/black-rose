/**
 * Reactive bracket store — bridges admin BracketManager with the public
 * tournament detail page. Persists to Supabase and subscribes to Realtime so
 * all users see publish + score updates without sharing the same browser tab.
 */

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { BracketRound } from "@/features/tournaments/types";
import {
  fetchPublishedBracket,
  type PersistedBracketPayload,
  resetBracketState,
  savePublishedBracket,
  updatePublishedBracket,
} from "@/features/admin/features/tournament-details/services/bracket.service";

interface StoredBracket {
  rounds: BracketRound[];
  updatedAt: string;
}

// ── Internal store (same-tab fast path) ────────────────────────────────────

const _store = new Map<string, StoredBracket>();
const _listeners = new Map<string, Set<() => void>>();

function _notify(tournamentId: string) {
  _listeners.get(tournamentId)?.forEach((fn) => fn());
}

function _subscribe(tournamentId: string, fn: () => void): () => void {
  if (!_listeners.has(tournamentId)) _listeners.set(tournamentId, new Set());
  _listeners.get(tournamentId)!.add(fn);
  return () => _listeners.get(tournamentId)?.delete(fn);
}

function _setLocal(tournamentId: string, rounds: BracketRound[], updatedAt?: string) {
  _store.set(tournamentId, { rounds, updatedAt: updatedAt ?? new Date().toISOString() });
  _notify(tournamentId);
}

function _clearLocal(tournamentId: string) {
  _store.delete(tournamentId);
  _notify(tournamentId);
}

function _snapshotLocal(tournamentId: string): StoredBracket | undefined {
  return _store.get(tournamentId);
}

function _roundsFromPayload(payload: unknown): BracketRound[] | null {
  if (!payload || typeof payload !== "object") return null;
  const rounds = (payload as PersistedBracketPayload).rounds;
  return Array.isArray(rounds) && rounds.length > 0 ? rounds : null;
}

// ── Public write API (called by admin BracketManager) ─────────────────────

/**
 * Publish or update a bracket. Writes to Supabase (Realtime broadcast) and
 * updates the local store for immediate same-tab feedback.
 */
export async function publishBracket(
  tournamentId: string,
  payload: PersistedBracketPayload,
  options?: { isInitialPublish?: boolean },
): Promise<void> {
  const rounds = payload.rounds;
  const previous = _snapshotLocal(tournamentId);
  _setLocal(tournamentId, rounds);

  try {
    if (options?.isInitialPublish) {
      await savePublishedBracket(tournamentId, payload);
    } else {
      await updatePublishedBracket(tournamentId, payload);
    }
  } catch (err) {
    if (previous) {
      _setLocal(tournamentId, previous.rounds, previous.updatedAt);
    } else {
      _clearLocal(tournamentId);
    }
    console.error("[bracket-store] Failed to persist bracket:", err);
    throw err;
  }
}

/** Clear a published bracket (admin Reset). */
export async function clearPublishedBracket(tournamentId: string): Promise<void> {
  const previous = _snapshotLocal(tournamentId);
  _clearLocal(tournamentId);
  try {
    await resetBracketState(tournamentId);
  } catch (err) {
    if (previous) {
      _setLocal(tournamentId, previous.rounds, previous.updatedAt);
    }
    console.error("[bracket-store] Failed to reset bracket:", err);
    throw err;
  }
}

// ── Public read API ────────────────────────────────────────────────────────

export function getPublishedBracket(tournamentId: string): BracketRound[] | null {
  return _store.get(tournamentId)?.rounds ?? null;
}

/** Hydrate the in-memory store without writing to Supabase (e.g. admin reload). */
export function syncLocalBracket(tournamentId: string, rounds: BracketRound[]): void {
  _setLocal(tournamentId, rounds);
}

export interface LiveBracketState {
  bracket: BracketRound[] | null;
  isLoading: boolean;
}

/**
 * React hook — loads published bracket from Supabase on mount and subscribes
 * to Realtime updates on `tournament_bracket_state`.
 */
export function useLiveBracket(tournamentId: string): LiveBracketState {
  const [bracket, setBracket] = useState<BracketRound[] | null>(
    () => _store.get(tournamentId)?.rounds ?? null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      setIsLoading(true);
      try {
        const rounds = await fetchPublishedBracket(tournamentId);
        if (cancelled) return;
        if (rounds) {
          _setLocal(tournamentId, rounds);
          setBracket(rounds);
        } else {
          _clearLocal(tournamentId);
          setBracket(null);
        }
      } catch (err) {
        console.error("[bracket-store] Failed to load bracket:", err);
        if (!cancelled) {
          _clearLocal(tournamentId);
          setBracket(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadInitial();

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`bracket:${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_bracket_state",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown> | undefined;
          if (!row) {
            _clearLocal(tournamentId);
            setBracket(null);
            return;
          }

          if (row.status === "published") {
            const rounds = _roundsFromPayload(row.bracket_data);
            if (rounds) {
              _setLocal(tournamentId, rounds, row.updated_at as string);
              setBracket(rounds);
            } else {
              _clearLocal(tournamentId);
              setBracket(null);
            }
          } else {
            _clearLocal(tournamentId);
            setBracket(null);
          }
        },
      )
      .subscribe();

    const unsubscribeLocal = _subscribe(tournamentId, () => {
      setBracket(_store.get(tournamentId)?.rounds ?? null);
    });

    return () => {
      cancelled = true;
      unsubscribeLocal();
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  return { bracket, isLoading };
}
