import type { ReactNode } from "react";

/** Quick-stat tile used in the dashboard stat strip. */
export function QuickStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border border-white/6 bg-[oklch(0.07_0_0)] px-4 py-3">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

/** Card section with a labelled header, optional icon, and optional action slot. */
export function DashboardSection({
  label,
  title,
  icon,
  action,
  children,
}: {
  label: string;
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col border border-white/8 bg-[oklch(0.07_0_0)]">
      <div className="flex items-center justify-between border-b border-white/6 px-5 py-3.5">
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <div>
            <p className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              {label}
            </p>
            <h2 className="font-display text-base tracking-display leading-tight">{title}</h2>
          </div>
        </div>
        {action}
      </div>
      <div className="flex-1 px-5 py-4">{children}</div>
    </div>
  );
}
