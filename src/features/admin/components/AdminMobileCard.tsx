import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminMobileCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  badge?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  className?: string;
}

/** Compact list row for admin management views on mobile. */
export function AdminMobileCard({
  title,
  subtitle,
  leading,
  badge,
  meta,
  actions,
  onClick,
  className,
}: AdminMobileCardProps) {
  const interactive = Boolean(onClick);

  return (
    <div
      className={cn(
        "border-b border-white/8 px-4 py-3 last:border-b-0",
        interactive && "cursor-pointer transition-colors active:bg-white/5",
        className,
      )}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <div className="flex items-start gap-3">
        {leading}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium leading-snug">{title}</div>
              {subtitle ? (
                <div className="mt-0.5 text-sm text-muted-foreground">{subtitle}</div>
              ) : null}
            </div>
            {badge}
          </div>
          {meta ? <div className="mt-2 text-xs text-muted-foreground">{meta}</div> : null}
        </div>
      </div>
      {actions ? (
        <div
          className="mt-3 flex flex-wrap items-center gap-2"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}

interface AdminResponsiveTableProps {
  mobile: ReactNode;
  desktop: ReactNode;
}

/** Renders card list on mobile and table on md+. */
export function AdminResponsiveTable({ mobile, desktop }: AdminResponsiveTableProps) {
  return (
    <>
      <div className="divide-y divide-white/8 md:hidden">{mobile}</div>
      <div className="hidden overflow-x-auto md:block">{desktop}</div>
    </>
  );
}
