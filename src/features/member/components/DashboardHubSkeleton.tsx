import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/** Shell-free loading state: hub links remain available while data loads. */
export function DashboardHubSkeleton({ navigation }: { navigation: ReactNode }) {
  return (
    <>
      <Skeleton
        aria-label="Loading member console"
        className="mb-8 h-44 w-full rounded-none bg-white/5 sm:h-48"
      />
      {navigation}
      <div aria-busy="true" className="grid gap-5 sm:grid-cols-2">
        <Skeleton className="h-48 rounded-none bg-white/5" />
        <Skeleton className="h-48 rounded-none bg-white/5" />
      </div>
    </>
  );
}
