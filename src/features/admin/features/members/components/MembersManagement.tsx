import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ChevronRight, Loader2, UserPlus, Zap } from "lucide-react";
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
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminEmptyTitle } from "@/features/admin/constants/empty-state-titles";
import { MemberAvatar } from "@/features/member/components/MemberAvatar";
import { MEMBERS_TABLE_COLUMNS } from "@/features/admin/constants/table-columns";
import { SortableTableHead } from "@/features/admin/components/SortableTableHead";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { usePagination } from "@/features/admin/hooks/usePagination";
import { useTableSort } from "@/features/admin/hooks/useTableSort";
import { useMembers, useUpdateMemberVerification } from "../hooks";
import type { AdminMember } from "../types";
import { compareByOrder, compareStrings } from "@/features/admin/utils/sort-comparators";
import { memberStatusBadgeVariant, initialsFromName } from "../utils";
import { CreateMemberModal } from "./CreateMemberModal";
import { EditMemberModal } from "./EditMemberModal";
import { useDeleteMember } from "../hooks/useDeleteMember";
import {
  fetchDiscordSyncBoostStatus,
  triggerDiscordSyncBoost,
} from "../functions/discord-sync.functions";

export function MembersManagement() {
  const navigate = useNavigate();
  const { members, isLoading, error, prependMember, replaceMember, removeMember } = useMembers();
  const {
    updatingId,
    error: verificationError,
    updateVerification,
    resetError: resetVerificationError,
  } = useUpdateMemberVerification();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBoostConfirmOpen, setIsBoostConfirmOpen] = useState(false);
  const [isBoostingSync, setIsBoostingSync] = useState(false);
  const [isBoostActive, setIsBoostActive] = useState(false);
  const [boostUntil, setBoostUntil] = useState<string | null>(null);
  const [syncBoostMessage, setSyncBoostMessage] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<AdminMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<AdminMember | null>(null);
  const {
    submit: deleteMemberSubmit,
    isDeleting,
    error: deleteError,
    resetError: resetDeleteError,
  } = useDeleteMember();
  const verificationOrder = useMemo(() => ["Not Verified", "Verified"] as const, []);
  const sortComparators = useMemo(
    () => ({
      registered: (a: AdminMember, b: AdminMember) =>
        compareStrings(a.createdAt, b.createdAt),
      verification: (a: AdminMember, b: AdminMember) =>
        compareByOrder(verificationOrder, a.status, b.status),
    }),
    [verificationOrder],
  );
  const { sortedItems, sortKey, direction, toggleSort } = useTableSort(
    members,
    sortComparators,
    "registered",
    "desc",
  );
  const pagination = usePagination(sortedItems);

  useEffect(() => {
    pagination.setPage(1);
  }, [sortKey, direction, pagination.setPage]);

  function handleCreated(member: AdminMember) {
    prependMember(member);
    pagination.setPage(1);
  }

  useEffect(() => {
    let cancelled = false;

    async function refreshBoostStatus() {
      try {
        const status = await fetchDiscordSyncBoostStatus({});
        if (cancelled) return;
        setIsBoostActive(status.boostActive);
        setBoostUntil(status.boostUntil);
        return status.boostActive;
      } catch {
        // Keep UI non-blocking if status check fails.
        return false;
      }
    }

    // One check on load (e.g. page refresh during an active boost window).
    void refreshBoostStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isBoostActive) return;

    let cancelled = false;

    async function pollWhileBoosted() {
      try {
        const status = await fetchDiscordSyncBoostStatus({});
        if (cancelled) return;
        setIsBoostActive(status.boostActive);
        setBoostUntil(status.boostUntil);
      } catch {
        // Keep UI non-blocking if status check fails.
      }
    }

    const interval = window.setInterval(() => {
      void pollWhileBoosted();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isBoostActive]);

  async function handleBoostSyncConfirm() {
    setIsBoostingSync(true);
    setSyncBoostMessage(null);
    try {
      const response = await triggerDiscordSyncBoost({});
      setIsBoostActive(response.boostActive);
      setBoostUntil(response.boostUntil);
      const until = response.boostUntil
        ? new Date(response.boostUntil).toLocaleTimeString()
        : "soon";
      if (response.alreadyActive) {
        setSyncBoostMessage(`Boost already active until ${until}.`);
      } else {
        setSyncBoostMessage(
          `1-minute boost active for ${response.boostMinutes ?? 10} minutes (until ${until}).`,
        );
      }
      setIsBoostConfirmOpen(false);
    } catch (err) {
      setSyncBoostMessage(
        err instanceof Error ? err.message : "Failed to activate sync boost.",
      );
    } finally {
      setIsBoostingSync(false);
    }
  }

  return (
    <>
      <AdminSection
        eyebrow="Roster Pipeline"
        title="Members"
        description="Register players manually. Click a member to view their profile, socials, and verification details."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBoostingSync || isBoostActive}
              className="gap-2 font-tech uppercase tracking-wider"
              onClick={() => {
                if (isBoostActive) return;
                setIsBoostConfirmOpen(true);
              }}
            >
              {isBoostingSync || isBoostActive ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {isBoostActive ? "Live Syncing..." : "Boost Sync (10m)"}
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
        }
      >
        {(error || verificationError || syncBoostMessage || (isBoostActive && boostUntil)) && (
          <div className="px-6 pt-4">
            {error || verificationError ? (
              <Alert variant="destructive">
                <AlertDescription>{error ?? verificationError}</AlertDescription>
              </Alert>
            ) : null}
            {syncBoostMessage ? (
              <Alert className="mt-2 border-white/10 bg-white/2">
                <AlertDescription>{syncBoostMessage}</AlertDescription>
              </Alert>
            ) : null}
            {isBoostActive && boostUntil ? (
              <Alert className="mt-2 border-white/10 bg-white/2">
                <AlertDescription>
                  Boost is active until {new Date(boostUntil).toLocaleTimeString()}. Boost button is
                  temporarily locked to prevent duplicate runs.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        )}

        <div className="p-6 pt-4">
          {isLoading ? (
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
          ) : members.length === 0 ? (
            <AdminEmptyState
              eyebrow="Roster Pipeline"
              title={<AdminEmptyTitle noun="members" />}
              description="Members appear here when they sign in with Discord on Black Rose. New accounts land on the waitlist as Not Verified. Assign the ROSE role on the Discord server after briefing — the site picks that up automatically and unlocks the dashboard, teams, and tournament registration."
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
                    onClick={() => navigate({ to: "/admin/users/$memberId", params: { memberId: member.id } })}
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
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={updatingId !== null || member.status === "Verified"}
                          className="font-tech text-[10px] uppercase tracking-wider-2"
                          onClick={async () => {
                            resetVerificationError();
                            try {
                              const updated = await updateVerification(member.id, "Verified");
                              replaceMember(updated);
                            } catch {
                              // verificationError shown in alert
                            }
                          }}
                        >
                          Verify
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={updatingId !== null || member.status === "Not Verified"}
                          className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground hover:text-destructive"
                          onClick={async () => {
                            resetVerificationError();
                            try {
                              const updated = await updateVerification(member.id, "Not Verified");
                              replaceMember(updated);
                            } catch {
                              // verificationError shown in alert
                            }
                          }}
                        >
                          Unverify
                        </Button>
                        <AdminRowActions
                          groupLabel="Member"
                          onEdit={() => setEditingMember(member)}
                          onDelete={() => {
                            resetDeleteError();
                            setDeletingMember(member);
                          }}
                        />
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
        title="Delete member?"
        description={`This permanently removes ${deletingMember?.username ?? "this member"}. They must not be on an active team roster.${deleteError ? ` ${deleteError}` : ""}`}
        isDeleting={isDeleting}
        onClose={() => {
          resetDeleteError();
          setDeletingMember(null);
        }}
        onConfirm={async () => {
          if (!deletingMember) return;
          resetDeleteError();
          try {
            await deleteMemberSubmit(deletingMember.id);
            removeMember(deletingMember.id);
            resetDeleteError();
            setDeletingMember(null);
          } catch {
            // deleteError shown in dialog description
          }
        }}
      />

      <AlertDialog
        open={isBoostConfirmOpen}
        onOpenChange={(next) => {
          if (!isBoostingSync) setIsBoostConfirmOpen(next);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Discord Sync Boost?</AlertDialogTitle>
            <AlertDialogDescription>
              This will trigger an immediate ROSE sync against the official Black Rose Discord
              server, then temporarily check every 1 minute for 10 minutes. Members who already
              have the ROSE role can be marked as Verified faster during this window.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBoostingSync}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isBoostingSync}
              onClick={(event) => {
                event.preventDefault();
                void handleBoostSyncConfirm();
              }}
            >
              {isBoostingSync ? "Activating..." : "Activate Boost"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
