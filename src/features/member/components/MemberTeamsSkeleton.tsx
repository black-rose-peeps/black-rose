import { Skeleton } from "@/components/ui/skeleton";
import { MemberPageLayout } from "./MemberShell";

export function MemberTeamsSkeleton() {
  return (
    <MemberPageLayout>
      <Skeleton className="mb-8 h-44 w-full rounded-none bg-white/5 sm:h-48" />
      <div className="flex flex-col gap-5">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden border border-white/8 bg-[oklch(0.07_0_0)]"
          >
            <Skeleton className="h-[3px] w-full rounded-none bg-white/10" />
            <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-5">
                <Skeleton className="h-16 w-16 shrink-0 rounded-none bg-white/5" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-48 rounded-none bg-white/5" />
                  <Skeleton className="h-4 w-24 rounded-none bg-white/5" />
                  <Skeleton className="h-3 w-36 rounded-none bg-white/5" />
                </div>
              </div>
              <Skeleton className="h-11 w-32 rounded-none bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </MemberPageLayout>
  );
}
