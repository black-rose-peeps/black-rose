import { Skeleton } from "@/components/ui/skeleton";
import {
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";

interface GamesTableSkeletonProps {
  rows?: number;
}

export function GamesTableSkeleton({ rows = 5 }: GamesTableSkeletonProps) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, index) => (
        <TableRow key={index} className="hover:bg-transparent">
          <TableCell>
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-8 w-8 shrink-0 rounded-md bg-white/5" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-24 bg-white/5" />
                <Skeleton className="h-3 w-20 bg-white/5" />
              </div>
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16 rounded-full bg-white/5" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-8 bg-white/5" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16 rounded-full bg-white/5" />
          </TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end gap-2">
              <Skeleton className="h-8 w-8 rounded-md bg-white/5" />
              <Skeleton className="h-8 w-8 rounded-md bg-white/5" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}
