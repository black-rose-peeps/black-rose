const STORAGE_PREFIX = "bra-profile-complete-seen:";

function storageKey(memberId: string): string {
  return `${STORAGE_PREFIX}${memberId}`;
}

export function hasSeenProfileCompleteCelebration(memberId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(storageKey(memberId)) === "1";
  } catch {
    return true;
  }
}

export function markProfileCompleteCelebrationSeen(memberId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(memberId), "1");
  } catch {
    // ignore quota / private mode
  }
}

/** True when completion crosses into 100% for the first time. */
export function shouldCelebrateProfileComplete(
  memberId: string,
  previousCompletion: number,
  nextCompletion: number,
): boolean {
  if (previousCompletion >= 100 || nextCompletion < 100) return false;
  return !hasSeenProfileCompleteCelebration(memberId);
}
