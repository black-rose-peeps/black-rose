import type { ReactNode } from "react";

interface AdminTopbarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AdminTopbar({ title, subtitle, actions }: AdminTopbarProps) {
  return (
    <div className="border-b border-white/8 bg-[oklch(0.06_0_0)] px-6 py-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-display">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>
    </div>
  );
}
