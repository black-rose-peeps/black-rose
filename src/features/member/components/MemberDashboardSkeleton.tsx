import { Skeleton } from "@/components/ui/skeleton";
import { MemberPageLayout } from "./MemberShell";

export function MemberDashboardSkeleton() {
  return (
    <MemberPageLayout>
      <Skeleton className="mb-8 h-48 w-full rounded-none bg-white/5" />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-none bg-white/5" />
        ))}
      </div>
      <div className="mb-6 grid gap-5 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-none bg-white/5" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-52 rounded-none bg-white/5" />
        <Skeleton className="h-52 rounded-none bg-white/5" />
      </div>
    </MemberPageLayout>
  );
}
