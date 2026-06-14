import type { ReactNode } from "react";
import { Emblem } from "./Emblem";
import { cn } from "@/lib/utils";

export interface ArenaEmptyStateProps {
  eyebrow: string;
  title: ReactNode;
  description: string;
  actions?: ReactNode;
  className?: string;
  /** Slightly tighter layout for landing section embeds */
  compact?: boolean;
  /** Minimal inset layout for dashboard panels and profile sections */
  embedded?: boolean;
}

export function ArenaEmptyState({
  eyebrow,
  title,
  description,
  actions,
  className,
  compact = false,
  embedded = false,
}: ArenaEmptyStateProps) {
  if (embedded) {
    return (
      <div
        className={cn(
          "relative border border-white/6 bg-white/[0.02] px-4 py-6 text-left sm:px-5",
          className,
        )}
      >
        <p className="font-tech text-label-readable uppercase text-muted-foreground/70">{eyebrow}</p>
        <h3 className="mt-2 font-display text-xl leading-tight tracking-display sm:text-2xl">
          {title}
        </h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
        {actions ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 [&_a]:font-semibold [&_button]:font-semibold">
            {actions}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden clip-angle-lg border border-white/8 bg-[oklch(0.06_0_0)] text-center",
        compact ? "px-6 py-16 md:py-20" : "px-6 py-20 md:py-28",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_45%,rgba(255,255,255,0.045),transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/12 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/8 to-transparent" />

      <div className="pointer-events-none absolute left-4 top-4 hidden h-10 w-10 border-l border-t border-white/10 sm:block" />
      <div className="pointer-events-none absolute bottom-4 right-4 hidden h-10 w-10 border-r border-b border-white/10 sm:block" />

      <Emblem
        spin
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-64 opacity-[0.04]"
      />
      <Emblem
        spin
        className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-56 opacity-[0.03]"
      />

      <div className="relative mx-auto max-w-xl">
        <div className="mb-6 inline-flex items-center gap-3 border border-white/10 bg-white/3 px-4 py-1.5 font-tech text-label-readable uppercase text-muted-foreground backdrop-blur-sm">
          <span className="h-1.5 w-1.5 bg-foreground/60 animate-pulse-soft" />
          {eyebrow}
        </div>

        <h2 className="font-display text-3xl leading-[1.05] tracking-display sm:text-4xl md:text-5xl">
          {title}
        </h2>

        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-muted-foreground">{description}</p>

        {actions ? (
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row [&_a]:font-semibold [&_button]:font-semibold">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
