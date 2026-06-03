import type { ReactNode } from "react";

/** Labelled card used throughout the member profile page. */
export function ProfileCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border border-white/8 bg-[oklch(0.07_0_0)]">
      <div className="border-b border-white/6 px-5 py-3">
        <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}
