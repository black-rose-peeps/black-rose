import { Loader2, Pencil, RotateCcw, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminMember } from "../../types";

interface MemberMobileRowActionsProps {
  member: AdminMember;
  updatingId: string | null;
  resettingId: string | null;
  isDeleting: boolean;
  showUnpause: boolean;
  showRemoveStale: boolean;
  onUnpause: () => void;
  onRemoveStale: () => void;
  onVerify: () => void;
  onUnverify: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function MemberMobileRowActions({
  member,
  updatingId,
  resettingId,
  isDeleting,
  showUnpause,
  showRemoveStale,
  onUnpause,
  onRemoveStale,
  onVerify,
  onUnverify,
  onEdit,
  onDelete,
}: MemberMobileRowActionsProps) {
  const busy = updatingId !== null || resettingId !== null || isDeleting;
  const isResetting = resettingId === member.id;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="touch-target min-h-11 gap-1 px-2.5 font-tech text-[10px] uppercase tracking-wider"
          onClick={(event) => event.stopPropagation()}
        >
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
        {member.status !== "Verified" ? (
          <DropdownMenuItem disabled={busy} onClick={onVerify}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Verify
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled={busy} onClick={onUnverify}>
            <ShieldOff className="mr-2 h-4 w-4" />
            Unverify
          </DropdownMenuItem>
        )}
        {showUnpause ? (
          <DropdownMenuItem disabled={busy} onClick={onUnpause}>
            {isResetting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Unpause sync
          </DropdownMenuItem>
        ) : null}
        {showRemoveStale ? (
          <DropdownMenuItem
            disabled={busy}
            onClick={onRemoveStale}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove stale
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={busy} onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit member
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={busy}
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete member
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
