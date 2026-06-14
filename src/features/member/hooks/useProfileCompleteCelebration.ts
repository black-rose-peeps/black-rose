import { useCallback, useState } from "react";
import {
  hasSeenProfileCompleteCelebration,
  markProfileCompleteCelebrationSeen,
  shouldCelebrateProfileComplete,
} from "../utils/profile-completion-celebration";

export function useProfileCompleteCelebration(memberId: string | undefined) {
  const [open, setOpen] = useState(false);

  const maybeCelebrate = useCallback(
    (previousCompletion: number, nextCompletion: number) => {
      if (!memberId) return;
      if (!shouldCelebrateProfileComplete(memberId, previousCompletion, nextCompletion)) {
        return;
      }
      setOpen(true);
    },
    [memberId],
  );

  const celebrateIfUnseen = useCallback(
    (completion: number) => {
      if (!memberId || completion < 100) return;
      if (hasSeenProfileCompleteCelebration(memberId)) return;
      setOpen(true);
    },
    [memberId],
  );

  const dismissCelebration = useCallback(() => {
    if (memberId) markProfileCompleteCelebrationSeen(memberId);
    setOpen(false);
  }, [memberId]);

  return {
    celebrationOpen: open,
    maybeCelebrate,
    celebrateIfUnseen,
    dismissCelebration,
  };
}
