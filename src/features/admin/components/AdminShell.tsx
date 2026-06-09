import type { ReactNode } from "react";
import { Emblem } from "@/features/shared/components/Emblem";
import { cn } from "@/lib/utils";

export { CornerAccents, TechPanel } from "@/features/member/components/MemberShell";

/** Admin page header with emblem watermark. */
export function AdminPageHero({
  eyebrow,
  title,
  description,
  actions,
  backLink,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  backLink?: ReactNode;
}) {
  return (
    <div className="relative mb-6 overflow-hidden border border-white/8 bg-[oklch(0.06_0_0)] clip-angle-lg">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(ellipse_80%_60%_at_20%_50%,rgba(255,255,255,0.04),transparent)]" />
      <div className="pointer-events-none absolute -right-10 -top-10 opacity-[0.06]">
        <Emblem className="h-48 w-48" spin />
      </div>

      <div className="relative px-6 py-6 sm:px-8">
        {backLink && <div className="mb-4">{backLink}</div>}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {eyebrow && (
              <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-1 font-display text-3xl tracking-display sm:text-4xl">{title}</h1>
            {description && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

export function AdminDetailGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("grid gap-5 lg:grid-cols-3", className)}>{children}</div>;
}
