import type { ReactNode } from "react";
import { Emblem } from "@/features/shared/components/Emblem";
import { cn } from "@/lib/utils";

export interface FeaturePanelStat {
  label: string;
  value: number | string;
  accent?: boolean;
}

export interface FeaturePanelHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  stats?: FeaturePanelStat[];
  headerExtra?: ReactNode;
  className?: string;
  embedded?: boolean;
}

export function FeaturePanelHeader({
  eyebrow,
  title,
  subtitle,
  stats = [],
  headerExtra,
  className,
  embedded = false,
}: FeaturePanelHeaderProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[oklch(0.07_0_0)]",
        embedded ? "border-0" : "border border-white/[0.08]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/[0.05] via-transparent to-transparent" />
      <div className="pointer-events-none absolute -right-6 -top-8 opacity-[0.07]">
        <Emblem className="h-36 w-36" />
      </div>

      <div className="relative flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center border border-white/15 bg-white/[0.04]">
            <Emblem className="h-8 w-8 opacity-90" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="font-tech text-[10px] uppercase tracking-[0.22em] text-white/45">
              {eyebrow}
            </p>
            <h2 className="font-display text-2xl tracking-display text-white">{title}</h2>
            {subtitle ? (
              <p className="max-w-xl text-sm text-white/50">{subtitle}</p>
            ) : null}
          </div>
        </div>

        {(stats.length > 0 || headerExtra) && (
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            {headerExtra ? (
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">{headerExtra}</div>
            ) : null}
            {stats.length > 0 ? (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="min-w-[4.5rem] border border-white/10 bg-white/[0.03] px-3 py-2 text-center"
                  >
                    <p
                      className={cn(
                        "font-mono text-lg font-bold tabular-nums leading-none",
                        stat.accent ? "text-amber-300" : "text-white",
                      )}
                    >
                      {stat.value}
                    </p>
                    <p className="mt-1 font-tech text-[9px] uppercase tracking-wider text-white/40">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export interface FeaturePanelShellProps extends FeaturePanelHeaderProps {
  children: ReactNode;
  contentClassName?: string;
  actionsBar?: ReactNode;
  unified?: boolean;
}

export function FeaturePanelShell({
  eyebrow,
  title,
  subtitle,
  stats = [],
  headerExtra,
  children,
  className,
  contentClassName,
  actionsBar,
  unified = false,
}: FeaturePanelShellProps) {
  const header = (
    <FeaturePanelHeader
      embedded={unified}
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      stats={stats}
      headerExtra={headerExtra}
    />
  );

  if (unified) {
    return (
      <section className={cn("relative", className)}>
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.22]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative overflow-hidden border border-white/[0.08] bg-[oklch(0.07_0_0)]">
          {header}
          {actionsBar ? (
            <div className="border-t border-white/[0.06] bg-[oklch(0.06_0_0)] px-4 py-3 sm:px-6">
              {actionsBar}
            </div>
          ) : null}
          <div className={cn("relative", contentClassName)}>{children}</div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("relative", className)}>
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.22]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative mb-6">{header}</div>

      <div className={cn("relative", contentClassName)}>{children}</div>
    </section>
  );
}

export function FeatureEmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden border border-dashed border-white/15 bg-[oklch(0.06_0_0)] px-6 py-16 text-center">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />
      <div className="relative mx-auto flex max-w-md flex-col items-center gap-4">
        <div className="grid h-16 w-16 place-items-center border border-white/15 bg-white/[0.04]">
          <Emblem className="h-10 w-10 opacity-80" />
        </div>
        <div className="space-y-2">
          <p className="font-display text-xl tracking-display text-white">{title}</p>
          {message ? <p className="text-sm text-white/45">{message}</p> : null}
        </div>
        {action}
      </div>
    </div>
  );
}

export function FeatureLoadingState() {
  return (
    <div className="space-y-4">
      <div className="h-28 animate-pulse border border-white/10 bg-white/[0.03]" />
      <div className="h-72 animate-pulse border border-white/10 bg-white/[0.02]" />
    </div>
  );
}
