import { Archive, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TournamentMobileActionsMenuProps {
  showArchive?: boolean;
  onArchive?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** Overflow menu for tournament detail header actions on mobile. */
export function TournamentMobileActionsMenu({
  showArchive,
  onArchive,
  onEdit,
  onDelete,
}: TournamentMobileActionsMenuProps) {
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
        {showArchive && onArchive ? (
          <>
            <DropdownMenuItem onClick={onArchive}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit tournament
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete tournament
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
