import { Skeleton } from "@/components/ui/skeleton";

const ROW_COUNT = 3;

export function RegisterNowButtonSkeleton() {
  return (
    <Skeleton
      className="h-12 w-44 rounded-none bg-white/10"
      aria-busy="true"
      aria-label="Loading registration"
    />
  );
}

export function TournamentCardCtaSkeleton() {
  return (
    <Skeleton
      className="h-10 w-full rounded-none bg-white/10"
      aria-busy="true"
      aria-label="Loading registration status"
    />
  );
}

export function SelectTeamRegistrationSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading your teams">
      <ul className="space-y-2">
        {Array.from({ length: ROW_COUNT }).map((_, index) => (
          <li
            key={index}
            className="flex items-center gap-4 border border-white/8 bg-white/2 px-4 py-4"
          >
            <Skeleton className="h-12 w-12 shrink-0 rounded-none bg-white/5" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-36 rounded-none bg-white/5" />
              <Skeleton className="h-3 w-20 rounded-none bg-white/5" />
              <Skeleton className="h-3 w-28 rounded-none bg-white/5" />
            </div>
            <Skeleton className="h-5 w-5 shrink-0 rounded-full bg-white/5" />
          </li>
        ))}
      </ul>
      <Skeleton className="h-3 w-full max-w-xs rounded-none bg-white/5" />
      <Skeleton className="h-11 w-full rounded-none bg-white/10" />
    </div>
  );
}
