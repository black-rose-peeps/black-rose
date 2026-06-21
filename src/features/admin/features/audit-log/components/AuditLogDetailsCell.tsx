import { ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  formatAuditLogDetails,
  type AdminAuditLog,
} from "@/features/admin/services/audit-log.service";

/** Beyond this length, details use a click-to-expand popover instead of inline only. */
const EXPANDABLE_DETAILS_LENGTH = 64;

interface AuditLogDetailsCellProps {
  log: AdminAuditLog;
}

export function AuditLogDetailsCell({ log }: AuditLogDetailsCellProps) {
  const details = formatAuditLogDetails(log);

  if (details === "—") {
    return <span className="text-sm text-muted-foreground/50">—</span>;
  }

  if (details.length <= EXPANDABLE_DETAILS_LENGTH) {
    return (
      <span className="block line-clamp-2 text-sm leading-snug text-muted-foreground">{details}</span>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group flex w-full min-w-0 items-start gap-1.5 rounded-sm text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="View full audit log details"
        >
          <span className="line-clamp-2 flex-1 text-sm leading-snug text-muted-foreground group-hover:text-foreground">
            {details}
          </span>
          <ChevronRight
            className={cn(
              "mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform",
              "group-hover:translate-x-0.5 group-hover:text-foreground",
            )}
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        className="w-80 max-w-[min(20rem,90vw)] space-y-2 border-white/12 bg-[oklch(0.1_0_0)] p-4"
      >
        <p className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
          Full details
        </p>
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{details}</p>
      </PopoverContent>
    </Popover>
  );
}
