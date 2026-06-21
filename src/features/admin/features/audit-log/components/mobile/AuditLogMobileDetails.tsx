import { useState } from "react";
import {
  AdaptiveModal,
  AdaptiveModalBody,
  AdaptiveModalContent,
  AdaptiveModalHeader,
  AdaptiveModalTitle,
} from "@/components/ui/adaptive-modal";
import {
  formatAuditLogDetails,
  type AdminAuditLog,
} from "@/features/admin/services/audit-log.service";

const EXPANDABLE_DETAILS_LENGTH = 64;

interface AuditLogMobileDetailsProps {
  log: AdminAuditLog;
}

export function AuditLogMobileDetails({ log }: AuditLogMobileDetailsProps) {
  const [open, setOpen] = useState(false);
  const details = formatAuditLogDetails(log);

  if (details === "—") {
    return <p className="mt-2 text-sm text-muted-foreground/50">No extra details</p>;
  }

  if (details.length <= EXPANDABLE_DETAILS_LENGTH) {
    return <p className="mt-2 text-sm leading-snug text-muted-foreground">{details}</p>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 w-full text-left transition active:opacity-80"
      >
        <p className="line-clamp-3 text-sm leading-snug text-muted-foreground">{details}</p>
        <span className="mt-1 inline-block font-tech text-[10px] uppercase tracking-wider text-muted-foreground/80">
          View full details
        </span>
      </button>

      <AdaptiveModal open={open} onOpenChange={setOpen}>
        <AdaptiveModalContent mobileSize="compact" className="border-border bg-card sm:max-w-md">
          <AdaptiveModalHeader>
            <AdaptiveModalTitle>Entry details</AdaptiveModalTitle>
          </AdaptiveModalHeader>
          <AdaptiveModalBody>
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{details}</p>
          </AdaptiveModalBody>
        </AdaptiveModalContent>
      </AdaptiveModal>
    </>
  );
}
