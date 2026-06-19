type RefetchOptions = { silent?: boolean };
type RefetchFn = (options?: RefetchOptions) => Promise<void>;

export interface DebouncedRefetch {
  (options?: RefetchOptions): void;
  cancel: () => void;
}

/** Coalesce burst Realtime events into a single refetch. */
export function createDebouncedRefetch(
  refetch: RefetchFn,
  delayMs = 3000,
): DebouncedRefetch {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((options?: RefetchOptions) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void refetch(options);
    }, delayMs);
  }) as DebouncedRefetch;

  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return debounced;
}
