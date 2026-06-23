import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { MemberAvatar } from "@/features/member/components/MemberAvatar";
import { memberStatusBadgeVariant, initialsFromName } from "../../utils";
import type { AdminMember } from "../../types";
import { MemberMobileRowActions } from "./MemberMobileRowActions";

interface MemberMobileListProps {
  members: AdminMember[];
  page: number;
  totalPages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  hotDays: number;
  updatingId: string | null;
  resettingId: string | null;
  syncingMemberId: string | null;
  isDeleting: boolean;
  onPageChange: (page: number) => void;
  onOpen: (memberId: string) => void;
  onUnpause: (member: AdminMember) => void;
  onSyncMember: (member: AdminMember) => void;
  onRemoveStale: (member: AdminMember) => void;
  onVerify: (member: AdminMember) => void;
  onUnverify: (member: AdminMember) => void;
  onEdit: (member: AdminMember) => void;
  onDelete: (member: AdminMember) => void;
  memberNeedsSyncQueueReset: (member: AdminMember) => boolean;
  memberIsStaleSyncCandidate: (member: AdminMember, hotDays: number) => boolean;
}

/** Mobile-intentional member directory. */
export function MemberMobileList({
  members,
  page,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
  hotDays,
  updatingId,
  resettingId,
  syncingMemberId,
  isDeleting,
  onPageChange,
  onOpen,
  onUnpause,
  onSyncMember,
  onRemoveStale,
  onVerify,
  onUnverify,
  onEdit,
  onDelete,
  memberNeedsSyncQueueReset,
  memberIsStaleSyncCandidate,
}: MemberMobileListProps) {
  return (
    <div className="md:hidden">
      <ul className="divide-y divide-white/8">
        {members.map((member) => (
          <li key={member.id}>
            <div className="flex items-start gap-3 px-4 py-4">
              <button
                type="button"
                onClick={() => onOpen(member.id)}
                className="flex min-w-0 flex-1 items-start gap-3 text-left transition active:opacity-80"
              >
                <MemberAvatar
                  avatarUrl={member.avatarUrl}
                  initials={initialsFromName(member.displayName)}
                  name={member.displayName}
                  className="h-11 w-11 shrink-0 text-[10px] font-tech tracking-wider-2"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-snug">{member.displayName}</p>
                    <Badge variant={memberStatusBadgeVariant(member.status)} className="shrink-0">
                      {member.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">@{member.discordUsername}</p>
                  <p className="mt-1 font-tech text-label-readable uppercase text-muted-foreground">
                    Registered {member.registeredAt}
                  </p>
                </div>
              </button>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <MemberMobileRowActions
                  member={member}
                  updatingId={updatingId}
                  resettingId={resettingId}
                  syncingMemberId={syncingMemberId}
                  isDeleting={isDeleting}
                  showUnpause={memberNeedsSyncQueueReset(member)}
                  showRemoveStale={memberIsStaleSyncCandidate(member, hotDays)}
                  onSyncMember={() => onSyncMember(member)}
                  onUnpause={() => onUnpause(member)}
                  onRemoveStale={() => onRemoveStale(member)}
                  onVerify={() => onVerify(member)}
                  onUnverify={() => onUnverify(member)}
                  onEdit={() => onEdit(member)}
                  onDelete={() => onDelete(member)}
                />
                <button
                  type="button"
                  onClick={() => onOpen(member.id)}
                  className="touch-target inline-flex items-center justify-center text-muted-foreground/50"
                  aria-label={`Open ${member.displayName}`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
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
