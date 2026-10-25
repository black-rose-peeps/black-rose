export function createMainGamePreference(
  savedValue: string | null,
  save: (gameId: string | null) => Promise<void>,
) {
  let baseline = savedValue;
  let state = {
    value: savedValue,
    dirty: false,
    busy: false,
    error: null as string | null,
    message: null as string | null,
  };
  const listeners = new Set<() => void>();
  function update(patch: Partial<typeof state>) {
    state = { ...state, ...patch };
    state.dirty = state.value !== baseline;
    listeners.forEach((listener) => listener());
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reconcile(value: string | null) {
      if (!state.dirty && !state.busy && value !== baseline) {
        baseline = value;
        update({ value });
      }
    },
    edit(value: string | null) {
      if (!state.busy) update({ value, error: null, message: null });
    },
    discard() {
      if (!state.busy) update({ value: baseline, error: null, message: null });
    },
    async save() {
      if (state.busy || !state.dirty) return;
      update({ busy: true, error: null, message: null });
      try {
        await save(state.value);
        baseline = state.value;
        update({ message: "Main Game preference saved. Memberships unchanged." });
      } catch (error) {
        update({
          error: error instanceof Error ? error.message : "Could not save Main Game. Try again.",
        });
      } finally {
        update({ busy: false });
      }
    },
  };
}
