import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionAccent = "primary" | "accent" | "warning";

interface BracketSectionHeaderProps {
  title: string;
  accent?: SectionAccent;
}

export function BracketSectionHeader({ title, accent = "primary" }: BracketSectionHeaderProps) {
  const dotClass =
    accent === "primary"
      ? "bg-primary shadow-[0_0_10px_rgba(255,255,255,0.35)]"
      : accent === "accent"
        ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]"
        : "bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.55)]";

  return (
    <div className="mb-4 flex items-center gap-3">
      <span className={cn("h-2 w-2 shrink-0", dotClass)} />
      <h3 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-foreground">
        {title}
      </h3>
      <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
    </div>
  );
}

interface GrandFinalSectionProps {
  title?: string;
  children: ReactNode;
}

export function GrandFinalSection({ title = "Grand Final", children }: GrandFinalSectionProps) {
  return (
    <section className="space-y-4">
      <BracketSectionHeader title={title} accent="warning" />
      <div className="mx-auto max-w-3xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 via-transparent to-primary/5 p-5">
        {children}
      </div>
    </section>
  );
}
