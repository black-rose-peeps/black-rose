import { Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TeamMobileRowActionsProps {
  onRoster: () => void;
  onAddMember: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TeamMobileRowActions({
  onRoster,
  onAddMember,
  onEdit,
  onDelete,
}: TeamMobileRowActionsProps) {
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
        <DropdownMenuItem onClick={onRoster}>
          <Users className="mr-2 h-4 w-4" />
          View roster
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddMember}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add member
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit team
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete team
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
