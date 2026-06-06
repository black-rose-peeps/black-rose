import type { LucideIcon } from "lucide-react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface AdminRowActionItem {
  label: string;
  description?: string;
  icon?: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
}

interface AdminRowActionsProps {
  label?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  items?: AdminRowActionItem[];
}

export function AdminRowActions({
  label = "More",
  onEdit,
  onDelete,
  items = [],
}: AdminRowActionsProps) {
  const hasMenu = onEdit || onDelete || items.length > 0;

  if (!hasMenu) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2.5 font-tech text-[10px] uppercase tracking-wider"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
          <span className="sr-only sm:hidden">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56"
        onClick={(event) => event.stopPropagation()}
      >
        {items.length > 0 && (
          <>
            <DropdownMenuLabel className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              Team
            </DropdownMenuLabel>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <DropdownMenuItem
                  key={item.label}
                  onClick={item.onClick}
                  className={
                    item.destructive ? "text-destructive focus:text-destructive" : undefined
                  }
                >
                  {Icon && <Icon className="mr-2 h-4 w-4 shrink-0" />}
                  <span className="flex min-w-0 flex-col">
                    <span>{item.label}</span>
                    {item.description && (
                      <span className="text-xs font-normal text-muted-foreground">
                        {item.description}
                      </span>
                    )}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {onDelete && (
          <>
            {(onEdit || items.length > 0) && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
