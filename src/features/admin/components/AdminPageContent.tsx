import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminPageContentProps {
  children: ReactNode;
  className?: string;
  gap?: "default" | "loose";
}

/** Standard admin route content padding — tighter on mobile, unchanged on desktop. */
export function AdminPageContent({ children, className, gap = "default" }: AdminPageContentProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-10",
        gap === "loose" ? "gap-8" : "gap-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
