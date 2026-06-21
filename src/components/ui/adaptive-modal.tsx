"use client";

import * as React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/** Dialog on desktop · mobile sheet (top or bottom) — same Radix root. */
const AdaptiveModal = Dialog;

const MOBILE_SHELL_BOTTOM =
  "flex flex-col gap-0 rounded-none border-t border-white/12 bg-[oklch(0.08_0_0)] p-0 safe-bottom";

/** Anchored below the fixed site header (h-16 + safe area). */
const MOBILE_SHELL_TOP =
  "flex flex-col gap-0 rounded-none border-b border-white/12 bg-[oklch(0.08_0_0)] p-0 safe-top !top-[calc(4rem+env(safe-area-inset-top,0px))] shadow-[0_16px_48px_rgba(0,0,0,0.65)]";

type MobileSheetSize = "auto" | "compact" | "tall" | "full";
type MobileSheetSide = "top" | "bottom";

const MOBILE_HEIGHT: Record<MobileSheetSize, string> = {
  auto: "max-h-[92dvh]",
  compact: "h-auto max-h-[min(72dvh,26rem)]",
  tall: "h-[min(92dvh,40rem)]",
  full: "h-[min(96dvh,100%)]",
};

interface AdaptiveModalContentProps extends React.ComponentPropsWithoutRef<typeof DialogContent> {
  /** Mobile sheet height preset. Desktop uses centered dialog. */
  mobileSize?: MobileSheetSize;
  /** Mobile sheet entry edge. Use `top` for header-adjacent panels (search, notifications). */
  mobileSide?: MobileSheetSide;
  /** Hide the drag handle on mobile sheets. */
  hideMobileHandle?: boolean;
}

const AdaptiveModalContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  AdaptiveModalContentProps
>(
  (
    {
      className,
      children,
      mobileSize = "tall",
      mobileSide = "bottom",
      hideMobileHandle = false,
      ...props
    },
    ref,
  ) => {
    const isMobile = useIsMobile();

    if (isMobile) {
      const shell = mobileSide === "top" ? MOBILE_SHELL_TOP : MOBILE_SHELL_BOTTOM;

      return (
        <SheetContent
          side={mobileSide}
          className={cn(shell, MOBILE_HEIGHT[mobileSize], className)}
          {...props}
        >
          {!hideMobileHandle && mobileSide === "bottom" ? (
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/20" aria-hidden />
          ) : null}
          {children}
        </SheetContent>
      );
    }

    return (
      <DialogContent ref={ref} className={cn("rounded-none sm:rounded-none", className)} {...props}>
        {children}
      </DialogContent>
    );
  },
);
AdaptiveModalContent.displayName = "AdaptiveModalContent";

const AdaptiveModalHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <DialogHeader
    className={cn(
      "shrink-0 space-y-1.5 border-b border-white/8 px-4 py-4 text-left sm:px-6 sm:py-5",
      className,
    )}
    {...props}
  />
);
AdaptiveModalHeader.displayName = "AdaptiveModalHeader";

const AdaptiveModalFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <DialogFooter
    className={cn(
      "shrink-0 gap-2 border-t border-white/8 bg-[oklch(0.08_0_0)] px-4 py-4 safe-bottom sm:border-0 sm:bg-transparent sm:px-6 sm:py-0",
      "[&>button]:min-h-11 [&>button]:w-full sm:[&>button]:w-auto",
      className,
    )}
    {...props}
  />
);
AdaptiveModalFooter.displayName = "AdaptiveModalFooter";

const AdaptiveModalBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5",
      className,
    )}
    {...props}
  />
);
AdaptiveModalBody.displayName = "AdaptiveModalBody";

const AdaptiveModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogTitle>,
  React.ComponentPropsWithoutRef<typeof DialogTitle>
>(({ className, ...props }, ref) => (
  <DialogTitle
    ref={ref}
    className={cn("font-display text-xl tracking-display sm:text-2xl", className)}
    {...props}
  />
));
AdaptiveModalTitle.displayName = "AdaptiveModalTitle";

const AdaptiveModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogDescription>,
  React.ComponentPropsWithoutRef<typeof DialogDescription>
>(({ className, ...props }, ref) => (
  <DialogDescription
    ref={ref}
    className={cn("text-sm leading-relaxed text-muted-foreground", className)}
    {...props}
  />
));
AdaptiveModalDescription.displayName = "AdaptiveModalDescription";

const AdaptiveModalClose = DialogClose;
const AdaptiveModalTrigger = DialogTrigger;

export {
  AdaptiveModal,
  AdaptiveModalBody,
  AdaptiveModalClose,
  AdaptiveModalContent,
  AdaptiveModalDescription,
  AdaptiveModalFooter,
  AdaptiveModalHeader,
  AdaptiveModalTitle,
  AdaptiveModalTrigger,
};
