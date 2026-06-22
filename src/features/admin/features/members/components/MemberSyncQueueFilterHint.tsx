import { getSyncQueueFilterDescription } from "../utils/sync-queue";
import type { MemberSyncQueueConfig, MemberSyncQueueFilter } from "../types";

interface MemberSyncQueueFilterHintProps {
  filter: MemberSyncQueueFilter;
  config: MemberSyncQueueConfig;
}

export function MemberSyncQueueFilterHint({ filter, config }: MemberSyncQueueFilterHintProps) {
  const description = getSyncQueueFilterDescription(filter, config);
  if (!description) return null;

  return (
    <p className="text-xs leading-relaxed text-muted-foreground" role="note">
      {description}
    </p>
  );
}
