import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ChevronRight, Loader2, RotateCcw, Trash2, UserPlus, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminRowActions } from "@/features/admin/components/AdminRowActions";
import { ConfirmDeleteDialog } from "@/features/admin/components/ConfirmDeleteDialog";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AdminManagementTable,
  adminTableCellClip,
  adminTableTextTruncate,
} from "@/features/admin/components/AdminManagementTable";
import { AdminSection } from "@/features/admin/components/AdminSection";
import { useIsMobile } from "@/hooks/use-mobile";
import { MemberMobileList, MemberMobileSyncFilters, MemberSectionActionsMenu } from "./mobile";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminEmptyTitle } from "@/features/admin/constants/empty-state-titles";
import { MemberAvatar } from "@/features/member/components/MemberAvatar";
import { MEMBERS_TABLE_COLUMNS } from "@/features/admin/constants/table-columns";
import { AdminMobileSortBar } from "@/features/admin/components/AdminMobileSortBar";
import { SortableTableHead } from "@/features/admin/components/SortableTableHead";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { AdminTableSearch } from "@/features/admin/components/AdminTableSearch";
import { usePagination } from "@/features/admin/hooks/usePagination";
import { useTableSort } from "@/features/admin/hooks/useTableSort";
import { matchesAdminMemberDirectorySearch } from "@/features/admin/utils/search";
import { useMembers, useResetMemberDiscordSync, useUpdateMemberVerification } from "../hooks";
import type { AdminMember, MemberSyncQueueConfig, MemberSyncQueueFilter } from "../types";
import { compareByOrder, compareStrings } from "@/features/admin/utils/sort-comparators";
import {
  countMembersBySyncQueueFilter,
  matchesSyncQueueFilter,
  memberIsStaleSyncCandidate,
  memberNeedsSyncQueueReset,
  memberStatusBadgeVariant,
  initialsFromName,
} from "../utils";
import { CreateMemberModal } from "./CreateMemberModal";
import { EditMemberModal } from "./EditMemberModal";
import { MemberSyncQueueFilters } from "./MemberSyncQueueFilters";
import { useDeleteMember } from "../hooks/useDeleteMember";
import { DEFAULT_SYNC_HOT_DAYS } from "../constants";
import { getMemberSyncQueueConfig, triggerDiscordSync } from "../functions/discord-sync.functions";
import { formatDiscordSyncMessage } from "../utils/discord-sync-config";
import { ADMIN_AUDIT_ACTIONS, logAdminAction } from "@/features/admin/services/audit-log.service";

export function MembersManagement() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { members, isLoading, error, prependMember, replaceMember, removeMember } = useMembers();
  const {
    updatingId,
    error: verificationError,
    updateVerification,
    resetError: resetVerificationError,
  } = useUpdateMemberVerification();
  const {
    resettingId,
    error: syncResetError,
    resetSyncQueue,
    resetError: resetSyncResetError,
  } = useResetMemberDiscordSync();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isSyncError, setIsSyncError] = useState(false);
  const [editingMember, setEditingMember] = useState<AdminMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<AdminMember | null>(null);
  const [deleteMode, setDeleteMode] = useState<"default" | "stale">("default");
  const [searchQuery, setSearchQuery] = useState("");
  const [syncQueueFilter, setSyncQueueFilter] = useState<MemberSyncQueueFilter>("all");
  const [syncQueueConfig, setSyncQueueConfig] = useState<MemberSyncQueueConfig>(() => ({
    hotDays: DEFAULT_SYNC_HOT_DAYS,
    coldSweepIntervalMinutes: 1440,
  }));
  const {
    submit: deleteMemberSubmit,
    isDeleting,
    error: deleteError,
    resetError: resetDeleteError,
  } = useDeleteMember();
  const queueCounts = useMemo(
    () => countMembersBySyncQueueFilter(members, syncQueueConfig.hotDays),
    [members, syncQueueConfig.hotDays],
  );

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      if (!matchesSyncQueueFilter(member, syncQueueFilter, syncQueueConfig.hotDays)) return false;
      if (!searchQuery.trim()) return true;
      return matchesAdminMemberDirectorySearch(searchQuery, member);
    });
  }, [members, searchQuery, syncQueueFilter, syncQueueConfig.hotDays]);

  const verificationOrder = useMemo(() => ["Not Verified", "Verified"] as const, []);
  const sortComparators = useMemo(
    () => ({
      registered: (a: AdminMember, b: AdminMember) => compareStrings(a.createdAt, b.createdAt),
      verification: (a: AdminMember, b: AdminMember) =>
        compareByOrder(verificationOrder, a.status, b.status),
    }),
    [verificationOrder],
  );
  const memberSortOptions = useMemo(
    () => [
      { key: "registered", label: "Registered" },
      { key: "verification", label: "Verification" },
    ],
    [],
  );
  const { sortedItems, sortKey, direction, toggleSort } = useTableSort(
    filteredMembers,
    sortComparators,
    "registered",
    "desc",
  );
  const pagination = usePagination(sortedItems);

  useEffect(() => {
    pagination.setPage(1);
  }, [sortKey, direction, searchQuery, syncQueueFilter, pagination.setPage]);

  useEffect(() => {
    void getMemberSyncQueueConfig({})
      .then(setSyncQueueConfig)
      .catch(() => {
        // Keep defaults aligned with Worker when env is unavailable locally.
      });
  }, []);

  function handleCreated(member: AdminMember) {
    prependMember(member);
    pagination.setPage(1);
  }

  async function handleSyncConfirm() {
    setIsSyncing(true);
    setSyncMessage(null);
    setIsSyncError(false);
    try {
      const summary = await triggerDiscordSync({});
      void logAdminAction({
        action: ADMIN_AUDIT_ACTIONS.DISCORD_SYNC_TRIGGERED,
        entityType: "discord_sync",
        metadata: {
          checked: summary.checked,
          verified: summary.verified,
          unverified: summary.unverified,
        },
      });
      setSyncMessage(formatDiscordSyncMessage(summary, summary.syncQueueConfig ?? syncQueueConfig));
      setIsSyncConfirmOpen(false);
    } catch (err) {
      setIsSyncError(true);
      setSyncMessage(err instanceof Error ? err.message : "Failed to run Discord sync.");
    } finally {
      setIsSyncing(false);
    }
  }

  function openMember(memberId: string) {
    navigate({ to: "/admin/users/$memberId", params: { memberId } });
  }

  async function handleUnpause(member: AdminMember) {
    resetSyncResetError();
    try {
      const updated = await resetSyncQueue(member.id);
      replaceMember(updated);
    } catch {
      // syncResetError shown in alert
    }
  }

  function handleRemoveStale(member: AdminMember) {
    resetDeleteError();
    setDeleteMode("stale");
    setDeletingMember(member);
  }

  async function handleVerify(member: AdminMember) {
    resetVerificationError();
    try {
      const updated = await updateVerification(member.id, "Verified");
      replaceMember(updated);
    } catch {
      // verificationError shown in alert
    }
  }

  async function handleUnverify(member: AdminMember) {
    resetVerificationError();
    try {
      const updated = await updateVerification(member.id, "Not Verified");
      replaceMember(updated);
    } catch {
      // verificationError shown in alert
    }
  }

  function handleEdit(member: AdminMember) {
    setEditingMember(member);
  }

  function handleDelete(member: AdminMember) {
    resetDeleteError();
    setDeleteMode("default");
    setDeletingMember(member);
  }

  function renderMemberActions(member: AdminMember) {
    return (
      <>
        {memberNeedsSyncQueueReset(member) ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={resettingId !== null || updatingId !== null}
            className="min-h-11 gap-1.5 font-tech text-[10px] uppercase tracking-wider-2 sm:min-h-9"
            onClick={() => void handleUnpause(member)}
          >
            {resettingId === member.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Unpause
          </Button>
        ) : null}
        {memberIsStaleSyncCandidate(member, syncQueueConfig.hotDays) ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isDeleting || updatingId !== null || resettingId !== null}
            className="min-h-11 gap-1.5 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground hover:text-destructive sm:min-h-9"
            onClick={() => handleRemoveStale(member)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove stale
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={updatingId !== null || member.status === "Verified"}
          className="min-h-11 font-tech text-[10px] uppercase tracking-wider-2 sm:min-h-9"
          onClick={() => void handleVerify(member)}
        >
          Verify
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={updatingId !== null || member.status === "Not Verified"}
          className="min-h-11 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground hover:text-destructive sm:min-h-9"
          onClick={() => void handleUnverify(member)}
        >
          Unverify
        </Button>
        <AdminRowActions
          groupLabel="Member"
          onEdit={() => handleEdit(member)}
          onDelete={() => handleDelete(member)}
        />
      </>
    );
  }

  return (
    <>
      <AdminSection
        eyebrow="Roster Pipeline"
        title="Members"
        description="Register players manually. Click a member to view their profile, socials, and verification details."
        actions={
          <>
            <MemberSectionActionsMenu
              isSyncing={isSyncing}
              onSync={() => setIsSyncConfirmOpen(true)}
              onRegister={() => setIsCreateOpen(true)}
            />
            <div className="hidden items-center gap-2 md:flex">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSyncing}
                className="gap-2 font-tech uppercase tracking-wider"
                onClick={() => setIsSyncConfirmOpen(true)}
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {isSyncing ? "Syncing..." : "Sync Discord now"}
              </Button>
              <Button
                onClick={() => setIsCreateOpen(true)}
                size="sm"
                className="gap-2 font-tech uppercase tracking-wider"
              >
                <UserPlus className="h-4 w-4" />
                Register Member
              </Button>
            </div>
          </>
        }
      >
        {(error || verificationError || syncResetError || syncMessage) && (
          <div className="px-4 pt-4 sm:px-6">
            {error || verificationError || syncResetError ? (
              <Alert variant="destructive">
                <AlertDescription>{error ?? verificationError ?? syncResetError}</AlertDescription>
              </Alert>
            ) : null}
            {syncMessage ? (
              <Alert
                variant={isSyncError ? "destructive" : undefined}
                className={isSyncError ? "mt-2" : "mt-2 border-white/10 bg-white/2"}
              >
                <AlertDescription>{syncMessage}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        )}

        <div className="p-4 pt-4 sm:p-6">
          {isLoading ? (
            isMobile ? (
              <ul className="divide-y divide-white/8 md:hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <li key={i} className="flex items-start gap-3 px-4 py-4">
                    <Skeleton className="h-11 w-11 shrink-0 rounded-none" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <AdminManagementTable columnWidths={MEMBERS_TABLE_COLUMNS}>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                      Username
                    </TableHead>
                    <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                      Discord
                    </TableHead>
                    <SortableTableHead
                      label="Registered"
                      sortKey="registered"
                      activeKey={sortKey}
                      direction={direction}
                      onSort={toggleSort}
                    />
                    <SortableTableHead
                      label="Verification"
                      sortKey="verification"
                      activeKey={sortKey}
                      direction={direction}
                      onSort={toggleSort}
                    />
                    <TableHead className="text-right text-[10px] font-tech uppercase tracking-wider-2">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i} className="hover:bg-transparent">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 shrink-0" />
                          <Skeleton className="h-4 w-28" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-3.5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-14 rounded-full" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="ml-auto flex items-center justify-end gap-2">
                          <Skeleton className="h-7 w-16 rounded-md" />
                          <Skeleton className="h-7 w-16 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </AdminManagementTable>
            )
          ) : members.length === 0 ? (
            <AdminEmptyState
              eyebrow="Roster Pipeline"
              title={<AdminEmptyTitle noun="members" />}
              description="Members appear here when they sign in with Discord on Black Rose. New accounts land on the waitlist as Not Verified. Most members self-verify by reacting for ROSE in #tourna-roles on Discord — the site picks that up automatically and unlocks the dashboard, teams, and tournament registration."
              actions={
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  size="sm"
                  className="gap-2 font-tech uppercase tracking-wider"
                >
                  <UserPlus className="h-4 w-4" />
                  Register Member
                </Button>
              }
            />
          ) : (
            <>
              <div className="mb-4 space-y-3">
                <MemberMobileSyncFilters
                  value={syncQueueFilter}
                  counts={queueCounts}
                  onChange={setSyncQueueFilter}
                />
                <AdminMobileSortBar
                  options={memberSortOptions}
                  sortKey={sortKey}
                  direction={direction}
                  onSort={toggleSort}
                />
                <div className="hidden md:block">
                  <MemberSyncQueueFilters
                    value={syncQueueFilter}
                    counts={queueCounts}
                    onChange={setSyncQueueFilter}
                  />
                </div>
                {(queueCounts.cold > 0 || queueCounts.paused > 0) && (
                  <p className="text-xs text-muted-foreground">
                    Hot queue members are checked every cron run. Cold and paused rows are swept
                    daily by the Discord sync Worker — unpause to re-check sooner, or remove stale
                    abandoned signups.
                  </p>
                )}
              </div>
              <AdminTableSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by display name or Discord username…"
              />
              {filteredMembers.length === 0 ? (
                <AdminEmptyState
                  embedded
                  eyebrow="No Matches"
                  title={
                    <>
                      Nobody on the <span className="text-stroke">roster.</span>
                    </>
                  }
                  description={
                    searchQuery.trim()
                      ? `No members match "${searchQuery.trim()}" with the current sync filter.`
                      : "No members match the current sync queue filter."
                  }
                  actions={
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {syncQueueFilter !== "all" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="font-tech uppercase tracking-wider"
                          onClick={() => setSyncQueueFilter("all")}
                        >
                          Show all members
                        </Button>
                      ) : null}
                      {searchQuery.trim() ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="font-tech uppercase tracking-wider"
                          onClick={() => setSearchQuery("")}
                        >
                          Clear search
                        </Button>
                      ) : null}
                    </div>
                  }
                />
              ) : (
                <>
                  <MemberMobileList
                    members={pagination.paginatedItems}
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    total={pagination.total}
                    rangeStart={pagination.rangeStart}
                    rangeEnd={pagination.rangeEnd}
                    hotDays={syncQueueConfig.hotDays}
                    updatingId={updatingId}
                    resettingId={resettingId}
                    isDeleting={isDeleting}
                    onPageChange={pagination.setPage}
                    onOpen={openMember}
                    onUnpause={handleUnpause}
                    onRemoveStale={handleRemoveStale}
                    onVerify={handleVerify}
                    onUnverify={handleUnverify}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    memberNeedsSyncQueueReset={memberNeedsSyncQueueReset}
                    memberIsStaleSyncCandidate={memberIsStaleSyncCandidate}
                  />
                  <div className="hidden md:block">
                    <AdminManagementTable columnWidths={MEMBERS_TABLE_COLUMNS}>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                            Username
                          </TableHead>
                          <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                            Discord
                          </TableHead>
                          <SortableTableHead
                            label="Registered"
                            sortKey="registered"
                            activeKey={sortKey}
                            direction={direction}
                            onSort={toggleSort}
                          />
                          <SortableTableHead
                            label="Verification"
                            sortKey="verification"
                            activeKey={sortKey}
                            direction={direction}
                            onSort={toggleSort}
                          />
                          <TableHead className="text-right text-[10px] font-tech uppercase tracking-wider-2">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagination.paginatedItems.map((member) => (
                          <TableRow
                            key={member.id}
                            className="cursor-pointer transition-colors hover:bg-white/3"
                            onClick={() => openMember(member.id)}
                          >
                            <TableCell className={adminTableCellClip}>
                              <Link
                                to="/admin/users/$memberId"
                                params={{ memberId: member.id }}
                                className="flex min-w-0 items-center gap-3 hover:text-foreground"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MemberAvatar
                                  avatarUrl={member.avatarUrl}
                                  initials={initialsFromName(member.displayName)}
                                  name={member.displayName}
                                  className="h-8 w-8 shrink-0 text-[10px] font-tech tracking-wider-2"
                                />
                                <span className={cn("font-medium", adminTableTextTruncate)}>
                                  {member.displayName}
                                </span>
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                              </Link>
                            </TableCell>
                            <TableCell className={adminTableCellClip}>
                              <div className={cn("text-sm", adminTableTextTruncate)}>
                                @{member.discordUsername}
                              </div>
                              {member.discordId && (
                                <div
                                  className={cn(
                                    "text-xs text-muted-foreground font-mono",
                                    adminTableTextTruncate,
                                  )}
                                >
                                  {member.discordId}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {member.registeredAt}
                            </TableCell>
                            <TableCell>
                              <Badge variant={memberStatusBadgeVariant(member.status)}>
                                {member.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                {renderMemberActions(member)}
                              </div>
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
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </AdminSection>

      <CreateMemberModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        existingMembers={members}
        onCreated={handleCreated}
      />

      <EditMemberModal
        open={editingMember !== null}
        member={editingMember}
        existingMembers={members}
        onClose={() => setEditingMember(null)}
        onUpdated={replaceMember}
      />

      <ConfirmDeleteDialog
        open={deletingMember !== null}
        title={deleteMode === "stale" ? "Remove stale signup?" : "Delete member?"}
        description={
          deleteMode === "stale"
            ? `This permanently removes ${deletingMember?.username ?? "this member"} — a cold or paused Not Verified signup that never finished Discord verification. They must not be on an active team roster.${deleteError ? ` ${deleteError}` : ""}`
            : `This permanently removes ${deletingMember?.username ?? "this member"}. They must not be on an active team roster.${deleteError ? ` ${deleteError}` : ""}`
        }
        isDeleting={isDeleting}
        onClose={() => {
          resetDeleteError();
          setDeleteMode("default");
          setDeletingMember(null);
        }}
        onConfirm={async () => {
          if (!deletingMember) return;
          resetDeleteError();
          try {
            await deleteMemberSubmit(deletingMember.id, {
              stale: deleteMode === "stale",
            });
            removeMember(deletingMember.id);
            resetDeleteError();
            setDeleteMode("default");
            setDeletingMember(null);
          } catch {
            // deleteError shown in dialog description
          }
        }}
      />

      <AlertDialog
        open={isSyncConfirmOpen}
        onOpenChange={(next) => {
          if (!isSyncing) setIsSyncConfirmOpen(next);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run Discord sync now?</AlertDialogTitle>
            <AlertDialogDescription>
              Checks ROSE roles on the official Black Rose Discord server and updates member
              verification status. You can run this again anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSyncing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSyncing}
              onClick={(event) => {
                event.preventDefault();
                void handleSyncConfirm();
              }}
            >
              {isSyncing ? "Syncing..." : "Run sync now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
