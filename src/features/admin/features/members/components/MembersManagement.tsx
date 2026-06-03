import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export function MembersManagement() {
  const { members, isLoading, error, prependMember } = useMembers();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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
                  Role
                </TableHead>
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Registered
                </TableHead>
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Loading members…
                  </TableCell>
                </TableRow>
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
                    <TableCell className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                      {member.role}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {member.registrationDate}
                    </TableCell>
                    <TableCell>
                      <Badge variant={memberStatusBadgeVariant(member.status)}>
                        {member.status}
                      </Badge>
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
    </>
  );
}
