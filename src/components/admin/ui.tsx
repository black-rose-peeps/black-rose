import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-border bg-card ${className}`}>{children}</div>
  );
}

export function PanelHeader({
  title,
  eyebrow,
  actions,
}: {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-6 py-4">
      <div className="flex flex-col leading-tight">
        {eyebrow && (
          <span className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
            {eyebrow}
          </span>
        )}
        <h3 className="font-display text-lg tracking-wider-2">{title}</h3>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string | number;
  delta?: string;
}) {
  return (
    <Panel className="clip-angle p-5">
      <div className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
        {label}
      </div>
      <div className="mt-3 font-display text-4xl tracking-display">{value}</div>
      {delta && (
        <div className="mt-2 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          {delta}
        </div>
      )}
    </Panel>
  );
}

const statusStyles: Record<string, string> = {
  // Tournament
  Draft: "border-border text-muted-foreground",
  "Registration Open": "border-foreground/70 text-foreground",
  "Registration Closed": "border-border text-muted-foreground",
  Live: "border-foreground text-foreground bg-foreground/10",
  Completed: "border-border text-muted-foreground",
  Archived: "border-border text-muted-foreground/60",
  // Team
  Pending: "border-foreground/40 text-foreground",
  Approved: "border-foreground text-foreground bg-foreground/10",
  Rejected: "border-border text-muted-foreground/60 line-through",
  // User
  Active: "border-foreground/60 text-foreground",
  Suspended: "border-border text-muted-foreground",
  Banned: "border-border text-muted-foreground/60 line-through",
};

export function StatusPill({ status }: { status: string }) {
  const cls = statusStyles[status] ?? "border-border text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-tech uppercase tracking-wider-2 ${cls}`}
    >
      <span className="h-1.5 w-1.5 bg-current" />
      {status}
    </span>
  );
}

export function PrimaryButton({
  children,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="clip-cta inline-flex h-9 items-center bg-foreground px-4 text-[10px] font-tech uppercase tracking-wider-2 text-background transition hover:bg-foreground/90"
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center border border-border bg-secondary px-4 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:border-foreground/60 hover:text-foreground"
    >
      {children}
    </button>
  );
}
