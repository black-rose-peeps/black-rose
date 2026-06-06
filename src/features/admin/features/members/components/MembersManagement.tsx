import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminRowActions } from "@/features/admin/components/AdminRowActions";
import { ConfirmDeleteDialog } from "@/features/admin/components/ConfirmDeleteDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminSection } from "@/features/admin/components/AdminSection";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { usePagination } from "@/features/admin/hooks/usePagination";
import { useMembers } from "../hooks";
import type { AdminMember } from "../types";
import { memberStatusBadgeVariant } from "../utils";
import { CreateMemberModal } from "./CreateMemberModal";
import { EditMemberModal } from "./EditMemberModal";
import { useDeleteMember } from "../hooks/useDeleteMember";

export function MembersManagement() {
  const { members, isLoading, error, prependMember, replaceMember, removeMember } = useMembers();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<AdminMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<AdminMember | null>(null);
  const {
    submit: deleteMemberSubmit,
    isDeleting,
    error: deleteError,
    resetError: resetDeleteError,
  } = useDeleteMember();
  const pagination = usePagination(members);

  function handleCreated(member: AdminMember) {
    prependMember(member);
    pagination.setPage(1);
  }

  return (
    <>
      <AdminSection
        eyebrow="Roster Pipeline"
        title="Members"
        description="Register players manually. Registered members can be assigned to teams in the Teams console."
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
        {error && (
          <div className="px-6 pt-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="p-6 pt-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Username
                </TableHead>
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Discord
                </TableHead>
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Registered
                </TableHead>
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Verification
                </TableHead>
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
                      <Skeleton className="ml-auto h-8 w-8 rounded-md" />
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
                  <TableRow key={member.id} className="transition-colors hover:bg-secondary/40">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center border border-border bg-secondary text-[10px] font-tech tracking-wider-2">
                          {member.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium">{member.username}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">@{member.discordUsername}</div>
                      {member.discordId && (
                        <div className="text-xs text-muted-foreground font-mono">
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
                    <TableCell className="text-right">
                      <AdminRowActions
                        onEdit={() => setEditingMember(member)}
                        onDelete={() => {
                          resetDeleteError();
                          setDeletingMember(member);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
