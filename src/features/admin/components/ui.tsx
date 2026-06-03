import React from "react";
import { cn } from "@/lib/utils";

// Basic UI Components for Admin
export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-border bg-card shadow-lg ${className}`}>
      {children}
    </div>
  );
}

export function PanelHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow?: string;
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          {eyebrow && (
            <div className="text-xs-readable font-tech font-medium uppercase tracking-wider-2 text-muted-foreground mb-1">
              {eyebrow}
            </div>
          )}
          <h2 className="text-xl font-display font-bold tracking-wider-2">{title}</h2>
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}

export function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-border bg-transparent px-4 py-2 text-sm-readable font-tech font-medium uppercase tracking-wider-2 text-muted-foreground transition hover:border-foreground/60 hover:text-foreground"
    >
      {children}
    </button>
  );
}

export function PrimaryButton({
  children,
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded bg-foreground px-4 py-2 text-sm-readable font-tech font-medium uppercase tracking-wider-2 text-background transition hover:bg-foreground/90 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function StatusPill({ status }: { status: string }) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
      case "active":
        return "border-emerald-400/40 bg-emerald-400/10 text-emerald-400";
      case "pending":
        return "border-amber-400/40 bg-amber-400/10 text-amber-400";
      case "rejected":
      case "banned":
        return "border-red-400/40 bg-red-400/10 text-red-400";
      case "live":
        return "border-sky-400/40 bg-sky-400/10 text-sky-400";
      case "registration open":
        return "border-emerald-400/40 bg-emerald-400/10 text-emerald-400";
      case "registration closed":
        return "border-amber-400/40 bg-amber-400/10 text-amber-400";
      case "completed":
        return "border-violet-400/40 bg-violet-400/10 text-violet-400";
      case "draft":
        return "border-border bg-muted/50 text-muted-foreground";
      case "archived":
        return "border-border bg-muted/50 text-muted-foreground";
      case "suspended":
        return "border-orange-400/40 bg-orange-400/10 text-orange-400";
      default:
        return "border-border bg-muted text-muted-foreground";
    }
  };

  return (
    <span
      className={`inline-block rounded-full border px-3 py-1 text-xs-readable font-tech font-medium uppercase tracking-wider-2 ${getStatusColor(status)}`}
    >
      {status}
    </span>
  );
}
export function StatCard({
  title,
  value,
  change,
  icon,
}: {
  title: string;
  value: string | number;
  change?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {change && <p className="text-xs text-muted-foreground mt-1">{change}</p>}
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
    </div>
  );
}
