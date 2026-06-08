import type { ReactNode } from "react";
import { Table } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface AdminManagementTableProps {
  columnWidths: readonly string[];
  children: ReactNode;
  className?: string;
}

export function AdminManagementTable({
  columnWidths,
  children,
  className,
}: AdminManagementTableProps) {
  return (
    <Table className={cn("table-fixed", className)}>
      <colgroup>
        {columnWidths.map((width, index) => (
          <col key={index} style={{ width }} />
        ))}
      </colgroup>
      {children}
    </Table>
  );
}

/** Use on cells that should clip long text instead of resizing the table. */
export const adminTableCellClip = "min-w-0 overflow-hidden";

/** Use on primary text inside clipped cells. */
export const adminTableTextTruncate = "block truncate";
