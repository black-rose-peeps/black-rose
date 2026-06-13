import type { ReactNode } from "react";
import { CornerAccents } from "./MemberShell";
import { TechPanel } from "./MemberShell";

/** Quick-stat tile used in the dashboard stat strip. */
export function QuickStat({
  icon,
  label,
  value,
  empty,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  empty?: boolean;
}) {
  return (
    <div className="relative flex items-center gap-3 border border-white/8 bg-[oklch(0.07_0_0)] px-4 py-3.5 card-depth clip-tab">
      <CornerAccents />
      <span className="relative shrink-0 text-muted-foreground">{icon}</span>
      <div className="relative min-w-0">
        <p className="font-tech text-label-readable uppercase text-muted-foreground">
          {label}
        </p>
        <p
          className={`mt-0.5 truncate text-sm font-medium ${empty ? "text-muted-foreground/50" : ""}`}
        >
          {value || "—"}
        </p>
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
  className,
}: {
  label: string;
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <TechPanel
      label={label}
      title={title}
      icon={icon}
      action={action}
      className={className}
    >
      {children}
    </TechPanel>
  );
}
