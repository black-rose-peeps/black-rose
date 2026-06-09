import { Skeleton } from "@/components/ui/skeleton";
import { MemberPageLayout } from "./MemberShell";

/** Skeleton matching the public member profile layout. */
export function MemberProfileSkeleton() {
  return (
    <MemberPageLayout maxWidth="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-4 w-28 rounded-none bg-white/5" />
        <Skeleton className="h-8 w-24 rounded-none bg-white/5" />
      </div>

      {/* Hero banner */}
      <div className="relative mb-6 overflow-hidden border border-white/8 bg-[oklch(0.06_0_0)] clip-angle-lg">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
        <div className="relative flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:px-8">
          <Skeleton className="h-24 w-24 shrink-0 rounded-none bg-white/8" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-10 w-56 max-w-full rounded-none bg-white/8" />
            <Skeleton className="h-4 w-72 max-w-full rounded-none bg-white/5" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-20 rounded-none bg-white/5" />
              <Skeleton className="h-5 w-24 rounded-none bg-white/5" />
              <Skeleton className="h-5 w-16 rounded-none bg-white/5" />
            </div>
          </div>
        </div>
      </div>

      {/* Social chips row */}
      <div className="mb-6 flex flex-wrap gap-2 border border-white/8 bg-[oklch(0.07_0_0)] p-4 clip-tab">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-none bg-white/5" />
        ))}
      </div>

      {/* Content grid */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="border border-white/8 bg-[oklch(0.07_0_0)] p-5 clip-tab">
            <Skeleton className="mb-4 h-3 w-16 rounded-none bg-white/5" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-full rounded-none bg-white/5" />
              <Skeleton className="h-3 w-full rounded-none bg-white/5" />
              <Skeleton className="h-3 w-4/5 rounded-none bg-white/5" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <div className="border border-white/8 bg-[oklch(0.07_0_0)] p-5 clip-tab">
            <Skeleton className="mb-4 h-3 w-20 rounded-none bg-white/5" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-2 w-14 rounded-none bg-white/5" />
                  <Skeleton className="h-4 w-28 rounded-none bg-white/8" />
                </div>
              ))}
            </div>
          </div>
          <div className="border border-white/8 bg-[oklch(0.07_0_0)] p-5 clip-tab">
            <Skeleton className="mb-4 h-3 w-24 rounded-none bg-white/5" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-3 w-20 rounded-none bg-white/5" />
                  <Skeleton className="h-3 w-12 rounded-none bg-white/5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MemberPageLayout>
  );
}
