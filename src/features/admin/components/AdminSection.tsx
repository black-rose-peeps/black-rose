import type { ReactNode } from "react";

interface AdminSectionProps {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AdminSection({
  eyebrow,
  title,
  description,
  actions,
  children,
}: AdminSectionProps) {
  return (
    <section className="relative overflow-hidden rounded-lg border border-border bg-card shadow-lg">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-white/[0.03] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-background/40 to-transparent" />

      <div className="relative border-b border-border px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              <span className="h-px w-8 bg-border" />
              {eyebrow}
            </div>
            <h2 className="font-display text-2xl tracking-wider sm:text-3xl">{title}</h2>
            {description && (
              <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      </div>

      <div className="relative">{children}</div>
    </section>
  );
}
