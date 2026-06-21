import { Skeleton } from "@/components/ui/skeleton";

export function TournamentDetailSkeleton() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/6 pt-28 pb-12">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-background to-transparent" />

        <div className="relative mx-auto max-w-7xl px-6">
          <Skeleton className="mb-8 h-4 w-36" />

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-6 w-32 rounded-sm" />
              </div>
              <Skeleton className="h-12 w-full max-w-xl sm:h-14 md:h-16" />
              <Skeleton className="h-4 w-full max-w-xl" />
            </div>
            <Skeleton className="h-12 w-40 shrink-0" />
          </div>

          <div className="mt-10 flex flex-wrap gap-px border border-white/8 bg-white/5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-[oklch(0.07_0_0)] px-5 py-4"
              >
                <Skeleton className="h-3.5 w-3.5 shrink-0 rounded-sm" />
                <div className="space-y-1.5">
                  <Skeleton className="h-2.5 w-12" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 bg-white/10 px-5 py-4">
              <div className="space-y-1.5">
                <Skeleton className="h-2.5 w-16 bg-white/20" />
                <Skeleton className="h-6 w-24 bg-white/20" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="sticky sticky-below-header z-20 border-b border-white/8 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-0 px-6 py-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="mx-2 h-4 w-16" />
          ))}
        </div>
      </div>

      {/* Overview content */}
      <main className="relative bg-[oklch(0.05_0_0)]">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />
        <div className="relative mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="flex flex-col gap-8 lg:col-span-2">
              <SkeletonPanel rows={3} />
              <SkeletonPanel rows={4} tall />
            </div>
            <div className="flex flex-col gap-6">
              <SkeletonPanel rows={5} />
              <SkeletonPanel rows={2} tall />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function SkeletonPanel({ rows, tall }: { rows: number; tall?: boolean }) {
  return (
    <div className="border border-white/8 bg-white/2 p-6">
      <Skeleton className="mb-6 h-4 w-36" />
      <div className={`space-y-4 ${tall ? "py-2" : ""}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
