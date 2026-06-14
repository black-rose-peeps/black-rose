import type { ReactNode } from "react";
import { ArenaEmptyState } from "@/features/shared/components/ArenaEmptyState";
import { cn } from "@/lib/utils";

interface AdminEmptyStateProps {
  eyebrow: string;
  title: ReactNode;
  description: string;
  actions?: ReactNode;
  className?: string;
  /** Inset layout for dashboard panels and nested admin sections */
  embedded?: boolean;
}

/** Compact Arena empty state tuned for admin management panels. */
export function AdminEmptyState({
  eyebrow,
  title,
  description,
  actions,
  className,
  embedded = false,
}: AdminEmptyStateProps) {
  return (
    <ArenaEmptyState
      compact={!embedded}
      embedded={embedded}
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={actions}
      className={cn(
        embedded ? "border-white/6 bg-transparent" : "mx-0 border-white/6 bg-[oklch(0.06_0_0)]",
        className,
      )}
    />
  );
}
