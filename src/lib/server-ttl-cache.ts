interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/** Short-lived in-process cache for coalescing duplicate server reads. */
export function createTtlCache<T>(ttlMs: number) {
  const store = new Map<string, CacheEntry<T>>();

  return {
    get(key: string): T | undefined {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key: string, value: T): void {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    delete(key: string): void {
      store.delete(key);
    },
  };
}

/** Coalesce concurrent async work for the same key into one in-flight promise. */
export function createInflightDeduper<T>() {
  const pending = new Map<string, Promise<T>>();

  return {
    run(key: string, fn: () => Promise<T>): Promise<T> {
      const existing = pending.get(key);
      if (existing) return existing;

      const promise = fn().finally(() => {
        pending.delete(key);
      });
      pending.set(key, promise);
      return promise;
    },
  };
}
