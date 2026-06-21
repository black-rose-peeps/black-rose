import type { ReactNode } from "react";
import { AdminMobileNav } from "./AdminMobileNav";

interface AdminTopbarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AdminTopbar({ title, subtitle, actions }: AdminTopbarProps) {
  return (
    <div className="sticky top-0 z-30 border-b border-white/8 bg-[oklch(0.06_0_0)]/95 px-4 py-3 backdrop-blur safe-top sm:px-6 sm:py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <AdminMobileNav />
          <div className="min-w-0">
            <h1 className="truncate font-title text-xl tracking-display sm:text-2xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end [&_button]:min-h-11 sm:[&_button]:min-h-9">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
