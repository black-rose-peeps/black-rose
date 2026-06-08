import { Skeleton } from "@/components/ui/skeleton";

const ROW_COUNT = 6;

export function InviteMemberSearchSkeleton() {
  return (
    <ul className="divide-y divide-white/6" aria-busy="true" aria-label="Loading members">
      {Array.from({ length: ROW_COUNT }).map((_, index) => (
        <li key={index} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-none bg-white/5" />
            <Skeleton className="h-4 w-28 rounded-none bg-white/5 sm:w-36" />
          </div>
          <Skeleton className="h-8 w-14 rounded-none bg-white/5" />
        </li>
      ))}
    </ul>
  );
}
