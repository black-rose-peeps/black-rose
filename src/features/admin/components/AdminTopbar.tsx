import React from "react";

interface AdminTopbarProps {
  title: string;
  subtitle?: string;
}

export function AdminTopbar({ title, subtitle }: AdminTopbarProps) {
  return (
    <div className="border-b border-border bg-card px-6 py-4">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-wider-2">{title}</h1>
        {subtitle && <p className="mt-1 text-sm-readable text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}
