/**
 * Reactive bracket store — bridges admin BracketManager with the public
 * tournament detail page. Persists to Supabase and subscribes to Realtime so
 * all users see publish + score updates without sharing the same browser tab.
 */

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { BracketRound, PrizeTier } from "@/features/tournaments/types";
import type { TournamentPlacement } from "@/features/tournaments/utils/tournament-placements";
import {
  fetchPublishedBracketPayload,
  type PersistedBracketPayload,
  resetBracketState,
  savePublishedBracket,
  updatePublishedBracket,
} from "@/features/admin/features/tournament-details/services/bracket.service";

interface StoredBracket {
  rounds: BracketRound[];
  placements: TournamentPlacement[] | null;
  prizeBreakdown: PrizeTier[] | null;
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

function isBracketRound(value: unknown): value is BracketRound {
  if (!value || typeof value !== "object") return false;
  const round = value as Record<string, unknown>;
  if (typeof round.label !== "string" || !Array.isArray(round.matches)) return false;
  return round.matches.every((match) => match && typeof match === "object");
}

function _payloadFromUnknown(payload: unknown): PersistedBracketPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as Record<string, unknown>;
  if (!Array.isArray(candidate.rounds) || !candidate.rounds.every(isBracketRound)) {
    return null;
  }
  if (candidate.placements != null && !Array.isArray(candidate.placements)) return null;
  if (candidate.prizeBreakdown != null && !Array.isArray(candidate.prizeBreakdown)) return null;
  return payload as PersistedBracketPayload;
}

function _setLocal(tournamentId: string, payload: PersistedBracketPayload, updatedAt?: string) {
  _store.set(tournamentId, {
    rounds: payload.rounds,
    placements: payload.placements ?? null,
    prizeBreakdown: payload.prizeBreakdown ?? null,
    updatedAt: updatedAt ?? new Date().toISOString(),
  });
  _notify(tournamentId);
}

function _clearLocal(tournamentId: string) {
  _store.delete(tournamentId);
  _notify(tournamentId);
}

function _snapshotLocal(tournamentId: string): StoredBracket | undefined {
  return _store.get(tournamentId);
}

// ── Public write API (called by admin BracketManager) ─────────────────────

/**
 * Publish or update a bracket. Writes to Supabase (Realtime broadcast) and
 * updates the local store for immediate same-tab feedback.
 *
 * Pass `tournamentName` on live updates so the champion row in
 * `tournament_champions` is kept in sync whenever a final result is recorded.
 */
export async function publishBracket(
  tournamentId: string,
  payload: PersistedBracketPayload,
  tournamentNameOrOptions?: string | { isInitialPublish?: boolean },
): Promise<void> {
  // Normalise overloaded third argument
  const tournamentName =
    typeof tournamentNameOrOptions === "string" ? tournamentNameOrOptions : undefined;
  const isInitialPublish =
    typeof tournamentNameOrOptions === "object"
      ? (tournamentNameOrOptions.isInitialPublish ?? false)
      : false;

  const previous = _snapshotLocal(tournamentId);
  _setLocal(tournamentId, payload);

  try {
    if (isInitialPublish) {
      await savePublishedBracket(tournamentId, payload);
    } else {
      // Pass tournamentName so syncTournamentChampion fires when a champion exists
      await updatePublishedBracket(tournamentId, payload, tournamentName);
    }
  } catch (err) {
    if (previous) {
      _setLocal(
        tournamentId,
        {
          rounds: previous.rounds,
          placements: previous.placements ?? undefined,
          prizeBreakdown: previous.prizeBreakdown ?? undefined,
        },
        previous.updatedAt,
      );
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
      _setLocal(
        tournamentId,
        {
          rounds: previous.rounds,
          placements: previous.placements ?? undefined,
          prizeBreakdown: previous.prizeBreakdown ?? undefined,
        },
        previous.updatedAt,
      );
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
  const existing = _snapshotLocal(tournamentId);
  _store.set(tournamentId, {
    rounds,
    placements: existing?.placements ?? null,
    prizeBreakdown: existing?.prizeBreakdown ?? null,
    updatedAt: existing?.updatedAt ?? new Date().toISOString(),
  });
  _notify(tournamentId);
}

export interface LiveBracketState {
  bracket: BracketRound[] | null;
  placements: TournamentPlacement[] | null;
  prizeBreakdown: PrizeTier[] | null;
  isLoading: boolean;
}

/**
 * React hook — loads published bracket from Supabase on mount and subscribes
 * to Realtime updates on `tournament_bracket_state`.
 */
export function useLiveBracket(tournamentId: string): LiveBracketState {
  const snapshot = _store.get(tournamentId);
  const [bracket, setBracket] = useState<BracketRound[] | null>(snapshot?.rounds ?? null);
  const [placements, setPlacements] = useState<TournamentPlacement[] | null>(
    snapshot?.placements ?? null,
  );
  const [prizeBreakdown, setPrizeBreakdown] = useState<PrizeTier[] | null>(
    snapshot?.prizeBreakdown ?? null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      setIsLoading(true);
      try {
        const published = await fetchPublishedBracketPayload(tournamentId);
        if (cancelled) return;
        if (published?.rounds?.length) {
          _setLocal(tournamentId, published);
          setBracket(published.rounds);
          setPlacements(published.placements ?? null);
          setPrizeBreakdown(published.prizeBreakdown ?? null);
        } else {
          _clearLocal(tournamentId);
          setBracket(null);
          setPlacements(null);
          setPrizeBreakdown(null);
        }
      } catch (err) {
        console.error("[bracket-store] Failed to load bracket:", err);
        if (!cancelled) {
          _clearLocal(tournamentId);
          setBracket(null);
          setPlacements(null);
          setPrizeBreakdown(null);
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
            setPlacements(null);
            setPrizeBreakdown(null);
            return;
          }

          if (row.status === "published") {
            const parsed = _payloadFromUnknown(row.bracket_data);
            if (parsed?.rounds?.length) {
              _setLocal(tournamentId, parsed, row.updated_at as string);
              setBracket(parsed.rounds);
              setPlacements(parsed.placements ?? null);
              setPrizeBreakdown(parsed.prizeBreakdown ?? null);
            } else {
              _clearLocal(tournamentId);
              setBracket(null);
              setPlacements(null);
              setPrizeBreakdown(null);
            }
          } else {
            _clearLocal(tournamentId);
            setBracket(null);
            setPlacements(null);
            setPrizeBreakdown(null);
          }
        },
      )
      .subscribe();

    const unsubscribeLocal = _subscribe(tournamentId, () => {
      const stored = _store.get(tournamentId);
      setBracket(stored?.rounds ?? null);
      setPlacements(stored?.placements ?? null);
      setPrizeBreakdown(stored?.prizeBreakdown ?? null);
    });

    return () => {
      cancelled = true;
      unsubscribeLocal();
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  return { bracket, placements, prizeBreakdown, isLoading };
}
