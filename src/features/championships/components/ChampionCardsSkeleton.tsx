import { Skeleton } from "@/components/ui/skeleton";

interface ChampionCardsSkeletonProps {
  count: number;
}

export function ChampionCardsSkeleton({ count }: ChampionCardsSkeletonProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        // matches the aspect-[4/3] film-poster card
        <Skeleton key={index} className="aspect-4/3 w-full rounded-none bg-white/5" />
      ))}
    </div>
  );
}
