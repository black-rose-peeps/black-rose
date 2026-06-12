import { Link } from "@tanstack/react-router";
import { Emblem } from "@/features/shared/components/Emblem";
import type { ReactNode } from "react";

export function AuthShell({
  headline,
  subheadline,
  children,
}: {
  headline: string;
  subheadline: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground lg:grid lg:grid-cols-2">
      {/* LEFT — brand panel */}
      <aside className="relative hidden overflow-hidden border-r border-border bg-black lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="absolute inset-0 radial-fade" />
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] opacity-[0.07]">
          <Emblem className="h-full w-full" spin />
        </div>

        <Link to="/" className="relative z-10 flex items-center gap-3">
          <Emblem className="h-9 w-9" />
          <span className="font-display text-2xl tracking-wider-2">BLACK ROSE</span>
        </Link>

        <div className="relative z-10 max-w-md">
          <div className="mb-5 flex items-center gap-3 font-tech text-label-readable uppercase text-muted-foreground">
            <span className="h-px w-10 bg-border" />
            Tournament Access
          </div>
          <h1 className="font-display text-5xl tracking-display sm:text-6xl">{headline}</h1>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">{subheadline}</p>
        </div>

        <div className="relative z-10 flex items-center justify-between font-tech text-label-readable uppercase text-muted-foreground">
          <span>EST. MMXXVI</span>
          <span>Black Rose / Operations</span>
        </div>
      </aside>

      {/* RIGHT — form panel */}
      <main className="flex min-h-screen flex-col px-6 py-10 sm:px-12 lg:px-16 lg:py-16">
        <Link to="/" className="mb-10 inline-flex items-center gap-3 lg:hidden">
          <Emblem className="h-7 w-7" />
          <span className="font-display text-lg tracking-wider-2">BLACK ROSE</span>
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          {children}
        </div>
      </main>
    </div>
  );
}

export function SocialButton({
  label,
  hint,
  disabled,
}: {
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="group relative flex h-11 w-full items-center justify-center gap-3 border border-border bg-secondary px-4 text-xs font-tech uppercase tracking-wider-2 text-foreground transition hover:border-foreground/60 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span>{label}</span>
      {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
    </button>
  );
}
