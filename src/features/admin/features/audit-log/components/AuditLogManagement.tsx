import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  AdminManagementTable,
  adminTableCellClip,
  adminTableTextTruncate,
} from "@/features/admin/components/AdminManagementTable";
import { AdminSection } from "@/features/admin/components/AdminSection";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminEmptyTitle } from "@/features/admin/constants/empty-state-titles";
import { AUDIT_LOG_TABLE_COLUMNS } from "@/features/admin/constants/table-columns";
import { SortableTableHead } from "@/features/admin/components/SortableTableHead";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { AdminTableSearch } from "@/features/admin/components/AdminTableSearch";
import { usePagination } from "@/features/admin/hooks/usePagination";
import { useTableSort } from "@/features/admin/hooks/useTableSort";
import { compareStrings } from "@/features/admin/utils/sort-comparators";
import {
  fetchAdminAuditLogs,
  formatAuditLogAction,
  formatAuditLogDetails,
  formatAuditLogTarget,
  type AdminAuditLog,
} from "@/features/admin/services/audit-log.service";
import { AuditLogDetailsCell } from "./AuditLogDetailsCell";

function formatLogTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function matchesAuditLogSearch(query: string, log: AdminAuditLog): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return [
    log.actorAdminUsername,
    log.action,
    formatAuditLogAction(log.action),
    log.entityType,
    log.entityId ?? "",
    formatAuditLogTarget(log),
    formatAuditLogDetails(log),
    JSON.stringify(log.metadata ?? {}),
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export function AuditLogManagement() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchAdminAuditLogs();
        if (!cancelled) setLogs(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load audit logs.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    return logs.filter((log) => matchesAuditLogSearch(searchQuery, log));
  }, [logs, searchQuery]);

  const sortComparators = useMemo(
    () => ({
      createdAt: (a: AdminAuditLog, b: AdminAuditLog) =>
        compareStrings(a.createdAt, b.createdAt),
      actor: (a: AdminAuditLog, b: AdminAuditLog) =>
        compareStrings(a.actorAdminUsername, b.actorAdminUsername),
      action: (a: AdminAuditLog, b: AdminAuditLog) => compareStrings(a.action, b.action),
      target: (a: AdminAuditLog, b: AdminAuditLog) =>
        compareStrings(formatAuditLogTarget(a), formatAuditLogTarget(b)),
      details: (a: AdminAuditLog, b: AdminAuditLog) =>
        compareStrings(formatAuditLogDetails(a), formatAuditLogDetails(b)),
    }),
    [],
  );

  const { sortedItems, sortKey, direction, toggleSort } = useTableSort(
    filteredLogs,
    sortComparators,
    "createdAt",
    "desc",
  );

  const pagination = usePagination(sortedItems);

  if (isLoading) {
    return (
      <AdminSection eyebrow="Activity" title="Audit Log">
        <div className="space-y-3 p-6 pt-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </AdminSection>
    );
  }

  return (
    <AdminSection
      eyebrow="Activity"
      title="Audit Log"
      description="Recent admin actions — approvals, deletions, status changes, and more."
    >
      {error && (
        <div className="px-6 pt-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="p-6 pt-4">
        <div className="mb-4 flex flex-col gap-3 border border-white/8 bg-white/2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <AdminTableSearch
            value={searchQuery}
            onChange={(value) => {
              setSearchQuery(value);
              pagination.setPage(1);
            }}
            placeholder="Search admin, action, or target…"
            className="mb-0 min-w-0 flex-1 sm:max-w-none"
          />
          <Badge
            variant="outline"
            className="w-fit shrink-0 border-white/10 font-tech text-[10px] uppercase tracking-wider"
          >
            {filteredLogs.length} entr{filteredLogs.length === 1 ? "y" : "ies"}
          </Badge>
        </div>

        {sortedItems.length === 0 ? (
          <AdminEmptyState
            embedded
            eyebrow={searchQuery.trim() ? "No Matches" : "Activity"}
            title={
              searchQuery.trim() ? (
                <>
                  No entries <span className="text-stroke">found.</span>
                </>
              ) : (
                <AdminEmptyTitle noun="audit log entries" />
              )
            }
            description={
              error
                ? "Fix the setup issue above, then refresh."
                : searchQuery.trim()
                  ? `No audit log entries match "${searchQuery.trim()}". Try a different admin, action, or target.`
                  : "Admin actions will appear here once someone performs them."
            }
            actions={
              searchQuery.trim() ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-tech uppercase tracking-wider"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <AdminManagementTable columnWidths={AUDIT_LOG_TABLE_COLUMNS}>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <SortableTableHead
                    label="When"
                    sortKey="createdAt"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <SortableTableHead
                    label="Admin"
                    sortKey="actor"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <SortableTableHead
                    label="Action"
                    sortKey="action"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <SortableTableHead
                    label="Target"
                    sortKey="target"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <SortableTableHead
                    label="Details"
                    sortKey="details"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paginatedItems.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className={adminTableCellClip}>
                      <span className={adminTableTextTruncate}>
                        {formatLogTimestamp(log.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className={adminTableCellClip}>
                      <span className={adminTableTextTruncate}>{log.actorAdminUsername}</span>
                    </TableCell>
                    <TableCell className={adminTableCellClip}>
                      <span className={adminTableTextTruncate}>
                        {formatAuditLogAction(log.action)}
                      </span>
                    </TableCell>
                    <TableCell className={adminTableCellClip}>
                      <span className={adminTableTextTruncate}>{formatAuditLogTarget(log)}</span>
                    </TableCell>
                    <TableCell className={adminTableCellClip}>
                      <AuditLogDetailsCell log={log} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </AdminManagementTable>

            <AdminTablePagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              rangeStart={pagination.rangeStart}
              rangeEnd={pagination.rangeEnd}
              onPageChange={pagination.setPage}
            />
          </>
        )}
      </div>
    </AdminSection>
  );
}
