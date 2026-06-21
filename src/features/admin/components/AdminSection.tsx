import type { ReactNode } from "react";
import { Emblem } from "@/features/shared/components/Emblem";
import { CornerAccents } from "@/features/member/components/MemberShell";

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
    <section className="relative overflow-hidden border border-white/8 bg-[oklch(0.07_0_0)] clip-tab card-depth">
      <CornerAccents />
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute -right-8 -top-8 opacity-[0.05]">
        <Emblem className="h-40 w-40" spin />
      </div>

      <div className="relative border-b border-white/6 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="font-tech text-label-readable uppercase text-muted-foreground">
              {eyebrow}
            </p>
            <h2 className="font-display text-xl tracking-display sm:text-2xl md:text-3xl">
              {title}
            </h2>
            {description && <p className="max-w-xl text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions ? (
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end [&_button]:min-h-11 sm:[&_button]:min-h-9">
              {actions}
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative">{children}</div>
    </section>
  );
}
