import * as React from "react";

import { cn } from "@/lib/utils";

/** Scrollable region using the app's native `custom-scrollbar` styles. */
const ScrollArea = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("custom-scrollbar overflow-y-auto overflow-x-hidden", className)}
      {...props}
    >
      {children}
    </div>
  ),
);
ScrollArea.displayName = "ScrollArea";

/** @deprecated Use ScrollArea — kept for existing imports. */
const ScrollBar = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(() => null);
ScrollBar.displayName = "ScrollBar";

export { ScrollArea, ScrollBar };
