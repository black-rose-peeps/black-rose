import type { ReactNode } from "react";
import { Emblem } from "@/features/shared/components/Emblem";
import { MemberNav } from "./MemberNav";
import { cn } from "@/lib/utils";

/** Shared input / select styling for member console forms. */
export const techFieldClass =
  "rounded-none border-white/12 bg-white/[0.03] shadow-none focus-visible:ring-white/20";

/** L-shaped corner marks — cyberpunk panel accent. */
export function CornerAccents({ className }: { className?: string }) {
  return (
    <>
      <span
        className={cn(
          "pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-white/25",
          className,
        )}
      />
      <span
        className={cn(
          "pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r border-white/25",
          className,
        )}
      />
    </>
  );
}

/** Page shell — nav, grid backdrop, content area. */
export function MemberPageLayout({
  children,
  className,
  maxWidth = "max-w-7xl",
}: {
  children: ReactNode;
  className?: string;
  maxWidth?: string;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MemberNav />
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-25" />
      <div className={cn("relative mx-auto px-6 pb-16 pt-24", maxWidth, className)}>{children}</div>
    </div>
  );
}

/** Labelled tech panel used across dashboard and profile. */
export function TechPanel({
  label,
  title,
  icon,
  action,
  children,
  className,
  noPadding,
}: {
  label?: string;
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative border border-white/8 bg-[oklch(0.07_0_0)] card-depth clip-tab",
        className,
      )}
    >
      <CornerAccents />
      {(label || title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-white/6 px-5 py-4">
          <div className="min-w-0">
            {label && (
              <p className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                {label}
              </p>
            )}
            {title && (
              <div className="mt-0.5 flex items-center gap-2">
                {icon && <span className="text-muted-foreground">{icon}</span>}
                <h2 className="font-display text-lg tracking-display">{title}</h2>
              </div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(noPadding ? "" : "p-5")}>{children}</div>
    </div>
  );
}

/** Hero banner with emblem watermark — matches public profile aesthetic. */
export function MemberHeroBanner({
  eyebrow,
  title,
  subtitle,
  meta,
  actions,
  emblemSize = "h-72 w-72",
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  emblemSize?: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative mb-8 overflow-hidden border border-white/8 bg-[oklch(0.06_0_0)] clip-angle-lg">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(ellipse_80%_60%_at_20%_50%,rgba(255,255,255,0.04),transparent)]" />
      <div className={cn("pointer-events-none absolute -right-12 -top-12 opacity-[0.07]", emblemSize)}>
        <Emblem className={emblemSize} spin />
      </div>

      <div className="relative px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-center">
            {children}
            <div className="min-w-0 flex-1">
              {eyebrow && (
                <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                  {eyebrow}
                </p>
              )}
              <h1 className="mt-1 font-display text-4xl tracking-display sm:text-5xl">{title}</h1>
              {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
              {meta && <div className="mt-3">{meta}</div>}
            </div>
          </div>
          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Empty state block inside panels. */
export function PanelEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <span className="text-muted-foreground/30">{icon}</span>
      <p className="text-sm text-muted-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground/50">{description}</p>}
      {action}
    </div>
  );
}
