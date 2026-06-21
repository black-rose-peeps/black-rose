import { Loader2, MoreHorizontal, UserPlus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MemberSectionActionsMenuProps {
  isSyncing: boolean;
  onSync: () => void;
  onRegister: () => void;
}

export function MemberSectionActionsMenu({
  isSyncing,
  onSync,
  onRegister,
}: MemberSectionActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="touch-target min-h-11 gap-1.5 font-tech text-[10px] uppercase tracking-wider md:hidden"
        >
          <MoreHorizontal className="h-4 w-4" />
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem disabled={isSyncing} onClick={onSync}>
          {isSyncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Zap className="mr-2 h-4 w-4" />
          )}
          {isSyncing ? "Syncing…" : "Sync Discord now"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onRegister}>
          <UserPlus className="mr-2 h-4 w-4" />
          Register member
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
