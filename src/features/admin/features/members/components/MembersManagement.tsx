import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ChevronRight, UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { MEMBERS_TABLE_COLUMNS } from "@/features/admin/constants/table-columns";
import { SortableTableHead } from "@/features/admin/components/SortableTableHead";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { usePagination } from "@/features/admin/hooks/usePagination";
import { useTableSort } from "@/features/admin/hooks/useTableSort";
import { useMembers, useUpdateMemberVerification } from "../hooks";
import type { AdminMember } from "../types";
import { compareByOrder, compareStrings } from "@/features/admin/utils/sort-comparators";
import { memberStatusBadgeVariant } from "../utils";
import { CreateMemberModal } from "./CreateMemberModal";
import { EditMemberModal } from "./EditMemberModal";
import { useDeleteMember } from "../hooks/useDeleteMember";

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

  return (
    <>
      <AdminSection
        eyebrow="Roster Pipeline"
        title="Members"
        description="Register players manually. Click a member to view their profile, socials, and verification details."
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
      >
        {(error || verificationError) && (
          <div className="px-6 pt-4">
            <Alert variant="destructive">
              <AlertDescription>{error ?? verificationError}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="p-6 pt-4">
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
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    {/* Username */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 shrink-0" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </TableCell>
                    {/* Discord */}
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    {/* Registered */}
                    <TableCell>
                      <Skeleton className="h-3.5 w-20" />
                    </TableCell>
                    {/* Verification */}
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
                ))
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No members yet. Register the first member to continue.
                  </TableCell>
                </TableRow>
              ) : (
                pagination.paginatedItems.map((member) => (
                  <TableRow
                    key={member.id}
                    className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                    onClick={() => navigate({ to: "/admin/users/$memberId", params: { memberId: member.id } })}
                  >
                    <TableCell className={adminTableCellClip}>
                      <Link
                        to="/admin/users/$memberId"
                        params={{ memberId: member.id }}
                        className="flex min-w-0 items-center gap-3 hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="grid h-8 w-8 shrink-0 place-items-center border border-white/10 bg-white/5 text-[10px] font-tech tracking-wider-2">
                          {member.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span className={cn("font-medium", adminTableTextTruncate)}>
                          {member.username}
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
                ))
              )}
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
    </>
  );
}
