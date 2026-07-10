import { Badge } from "@/components/ui/badge";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import {
  formatAuditLogAction,
  formatAuditLogActor,
  formatAuditLogTarget,
  type AdminAuditLog,
} from "@/features/admin/services/audit-log.service";
import { formatLogTimestamp } from "../../utils/display";
import { AuditLogMobileDetails } from "./AuditLogMobileDetails";

interface AuditLogMobileListProps {
  logs: AdminAuditLog[];
  page: number;
  totalPages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
}

/** Mobile-intentional audit log feed — card stack, not a shrunk table. */
export function AuditLogMobileList({
  logs,
  page,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
  onPageChange,
}: AuditLogMobileListProps) {
  return (
    <div className="md:hidden">
      <ul className="divide-y divide-white/8">
        {logs.map((log) => (
          <li key={log.id} className="px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                {formatLogTimestamp(log.createdAt)}
              </p>
              <Badge
                variant="outline"
                className="max-w-[55%] shrink-0 whitespace-normal rounded-none border-white/15 text-left font-tech text-[9px] uppercase leading-snug"
              >
                {formatAuditLogAction(log.action)}
              </Badge>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              {log.metadata?.actorKind === "captain" ? "Captain" : "Admin"} ·{" "}
              <span className="text-foreground/90">{formatAuditLogActor(log)}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Target ·{" "}
              <span className="break-words text-foreground/90">{formatAuditLogTarget(log)}</span>
            </p>

            <AuditLogMobileDetails log={log} />
          </li>
        ))}
      </ul>
      <AdminTablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onPageChange={onPageChange}
        className="px-4"
      />
    </div>
  );
}
