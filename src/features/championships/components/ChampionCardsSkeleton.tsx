import { Skeleton } from "@/components/ui/skeleton";

interface ChampionCardsSkeletonProps {
  count: number;
}

export function ChampionCardsSkeleton({ count }: ChampionCardsSkeletonProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="clip-angle-lg flex flex-col border border-white/8 bg-[oklch(0.055_0_0)]"
        >
          <Skeleton className="h-40 rounded-none bg-white/5 sm:h-52" />
          <div className="flex flex-col gap-3 p-4 sm:p-5">
            <Skeleton className="h-7 w-3/4 rounded-none bg-white/5" />
            <Skeleton className="h-3 w-full rounded-none bg-white/5" />
            <Skeleton className="h-3 w-1/3 rounded-none bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
