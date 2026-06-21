import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TeamRosterTableSkeletonProps {
  rows?: number;
  variant?: "live" | "snapshot";
  showIgnColumn?: boolean;
}

export function TeamRosterTableSkeleton({
  rows = 5,
  variant = "live",
  showIgnColumn = true,
}: TeamRosterTableSkeletonProps) {
  if (variant === "snapshot") {
    return (
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">IGN</TableHead>
            <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">Role</TableHead>
            <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
              Discord
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, index) => (
            <TableRow key={index} className="hover:bg-transparent">
              <TableCell>
                <Skeleton className="h-4 w-24 bg-white/5" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16 bg-white/5" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-28 bg-white/5" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">Player</TableHead>
          {showIgnColumn && (
            <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">IGN</TableHead>
          )}
          <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">Role</TableHead>
          <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, index) => (
          <TableRow key={index} className="hover:bg-transparent">
            <TableCell>
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full bg-white/5" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-24 bg-white/5" />
                  <Skeleton className="h-3 w-20 bg-white/5" />
                </div>
              </div>
            </TableCell>
            {showIgnColumn && (
              <TableCell>
                <Skeleton className="h-4 w-20 bg-white/5" />
              </TableCell>
            )}
            <TableCell>
              <Skeleton className="h-4 w-14 bg-white/5" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-14 rounded-full bg-white/5" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function TournamentHistoryListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <li
          key={index}
          className="flex items-start justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-36 bg-white/5" />
            <Skeleton className="h-3 w-28 bg-white/5" />
          </div>
          <Skeleton className="h-5 w-16 shrink-0 rounded-full bg-white/5" />
        </li>
      ))}
    </ul>
  );
}

/** Member search / picker lists inside admin dialogs. */
export function MemberPickerListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-1 px-2 pb-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-3 py-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full bg-white/5" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32 bg-white/5" />
            <Skeleton className="h-3 w-24 bg-white/5" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0 rounded-md bg-white/5" />
        </div>
      ))}
    </div>
  );
}
