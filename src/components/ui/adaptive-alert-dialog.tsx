"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

/** Centered alert on desktop · bottom sheet on mobile. */
const AdaptiveAlertDialog = AlertDialog;
const AdaptiveAlertDialogAction = AlertDialogAction;
const AdaptiveAlertDialogCancel = AlertDialogCancel;
const AdaptiveAlertDialogTrigger = AlertDialogTrigger;

const AdaptiveAlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogContent>,
  React.ComponentPropsWithoutRef<typeof AlertDialogContent>
>(({ className, children, ...props }, ref) => (
  <AlertDialogContent
    ref={ref}
    className={cn(
      "gap-0 overflow-hidden rounded-none border-white/12 bg-[oklch(0.09_0_0)] p-0",
      "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:max-h-[88dvh] max-md:translate-x-0 max-md:translate-y-0",
      "max-md:data-[state=closed]:slide-out-to-bottom max-md:data-[state=open]:slide-in-from-bottom",
      "md:max-w-lg md:p-6",
      "md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95",
      className,
    )}
    {...props}
  >
    <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20 md:hidden" aria-hidden />
    {children}
  </AlertDialogContent>
));
AdaptiveAlertDialogContent.displayName = "AdaptiveAlertDialogContent";

const AdaptiveAlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <AlertDialogHeader
    className={cn("space-y-2 px-4 pb-4 pt-2 text-left md:px-0 md:pb-0 md:pt-0", className)}
    {...props}
  />
);
AdaptiveAlertDialogHeader.displayName = "AdaptiveAlertDialogHeader";

const AdaptiveAlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <AlertDialogFooter
    className={cn(
      "gap-2 border-t border-white/8 px-4 py-4 safe-bottom md:border-0 md:px-0 md:py-0",
      "[&>button]:min-h-11 [&>button]:w-full sm:[&>button]:w-auto",
      className,
    )}
    {...props}
  />
);
AdaptiveAlertDialogFooter.displayName = "AdaptiveAlertDialogFooter";

const AdaptiveAlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogTitle>,
  React.ComponentPropsWithoutRef<typeof AlertDialogTitle>
>(({ className, ...props }, ref) => (
  <AlertDialogTitle
    ref={ref}
    className={cn("font-display text-xl tracking-display sm:text-2xl", className)}
    {...props}
  />
));
AdaptiveAlertDialogTitle.displayName = "AdaptiveAlertDialogTitle";

const AdaptiveAlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogDescription>,
  React.ComponentPropsWithoutRef<typeof AlertDialogDescription>
>(({ className, ...props }, ref) => (
  <AlertDialogDescription
    ref={ref}
    className={cn("text-sm leading-relaxed text-muted-foreground", className)}
    {...props}
  />
));
AdaptiveAlertDialogDescription.displayName = "AdaptiveAlertDialogDescription";

export {
  AdaptiveAlertDialog,
  AdaptiveAlertDialogAction,
  AdaptiveAlertDialogCancel,
  AdaptiveAlertDialogContent,
  AdaptiveAlertDialogDescription,
  AdaptiveAlertDialogFooter,
  AdaptiveAlertDialogHeader,
  AdaptiveAlertDialogTitle,
  AdaptiveAlertDialogTrigger,
};
