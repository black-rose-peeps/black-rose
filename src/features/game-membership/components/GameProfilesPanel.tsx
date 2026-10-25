import { useEffect, useState, useSyncExternalStore } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { matchesCatalogGame } from "../rules";
import type { GameProfileEntry } from "./game-profile-editor";
import { GameProfileCard } from "./GameProfileCard";

const STATUS_LABELS = {
  interested: "Interested",
  applying: "Applying",
  accepted: "Accepted",
  inactive: "Inactive",
  left: "Left",
};

function GameListItem({
  entry,
  selected,
  onSelect,
}: {
  entry: GameProfileEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  const state = useSyncExternalStore(
    entry.editor.subscribe,
    entry.editor.getSnapshot,
    entry.editor.getSnapshot,
  );
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-controls={selected ? `game-profile-${entry.game.id}` : undefined}
      className={`flex min-h-16 w-full items-center justify-between gap-3 border-l-2 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${selected ? "border-white bg-white/10" : "border-transparent hover:bg-white/5"}`}
    >
      <span className="min-w-0">
        <span className="block break-words text-sm font-medium">{entry.game.display_name}</span>
        <span
          className={`mt-1 block text-xs ${state.membership?.status === "accepted" ? "text-emerald-400" : "text-muted-foreground"}`}
        >
          {state.membership ? STATUS_LABELS[state.membership.status] : "Not joined"}
          {!entry.game.is_active ? " · Game inactive" : ""}
        </span>
      </span>
      {(state.busy || state.dirty) && (
        <span className="shrink-0 text-xs text-amber-300">
          {state.busy ? "Saving…" : state.hasUserChanges ? "Unsaved" : "Review profile"}
        </span>
      )}
    </button>
  );
}

export function GameProfilesPanel({
  entries: allEntries,
  loading,
  error,
  onRetry,
  focusGame,
  onSelectGame,
}: {
  entries: GameProfileEntry[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  focusGame?: string;
  onSelectGame?: (gameId: string) => void;
}) {
  const entries = allEntries.filter(({ game }) => game.is_active);
  const [selectedId, setSelectedId] = useState<string>();
  const [filter, setFilter] = useState("");
  const focused = entries.find(
    ({ game }) => game.id === focusGame || (focusGame && matchesCatalogGame(focusGame, game)),
  );
  const selected = entries.find(({ game }) => game.id === selectedId) ?? focused ?? entries[0];
  const focusedId = focused?.game.id;
  const selectedGameId = selected?.game.id;
  useEffect(() => {
    if (!focusedId) return;
    setSelectedId(focusedId);
    setFilter("");
  }, [focusedId]);
  useEffect(() => {
    if (!focusedId || focusedId !== selectedGameId) return;
    const target = document.getElementById(`game-profile-${focusedId}`);
    target?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
  }, [focusedId, selectedGameId]);
  const visible = entries.filter(({ game }) =>
    game.display_name.toLowerCase().includes(filter.toLowerCase().trim()),
  );

  return (
    <section aria-labelledby="game-profiles-title" className="mt-6 min-w-0 space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 id="game-profiles-title" className="font-display text-2xl">
          Game profiles &amp; memberships
        </h2>
        <details className="min-w-0 text-xs text-muted-foreground">
          <summary className="w-fit cursor-pointer py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            How profiles &amp; privacy work
          </summary>
          <div className="mt-2 max-w-prose space-y-2 leading-relaxed">
            <p>
              Keep one primary character per game. Each game profile and membership is saved
              separately from your common profile and Main Game preference.
            </p>
            <p>
              Your public profile privacy settings stay unchanged. Accepted membership badges show
              game names and icons only. Class, server and faction details are not automatically
              public; existing in-game identity visibility stays unchanged.
            </p>
            <p>
              Switch games freely. Unsaved drafts stay here until you save, discard or leave My
              Games.
            </p>
          </div>
        </details>
      </div>
      {loading && <p role="status">Loading your game profiles…</p>}
      {error && (
        <div role="alert" className="space-y-2 text-sm text-red-400">
          <p>{error}</p>
          <Button type="button" variant="outline" onClick={onRetry}>
            Retry loading game profiles
          </Button>
        </div>
      )}
      {!loading && !error && entries.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No games available. Try again later; your saved profile is unchanged.
        </p>
      )}
      {entries.length > 0 && (
        <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]">
          <div className="min-w-0 border border-white/10 bg-[oklch(0.07_0_0)] lg:sticky lg:top-24">
            <div className="p-3">
              <Input
                aria-label="Find a game"
                placeholder="Find a game…"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="min-h-11 rounded-none"
              />
            </div>
            <nav
              aria-label="Your games"
              className="custom-scrollbar max-h-44 overflow-y-auto overscroll-contain lg:max-h-[32rem]"
            >
              {visible.map((entry) => (
                <GameListItem
                  key={entry.game.id}
                  entry={entry}
                  selected={entry === selected}
                  onSelect={() => {
                    setSelectedId(entry.game.id);
                    onSelectGame?.(entry.game.id);
                  }}
                />
              ))}
              {visible.length === 0 && (
                <p role="status" className="p-3 text-sm text-muted-foreground">
                  No matching games.
                </p>
              )}
            </nav>
          </div>
          {selected && (
            <GameProfileCard key={selected.game.id} game={selected.game} editor={selected.editor} />
          )}
        </div>
      )}
    </section>
  );
}
