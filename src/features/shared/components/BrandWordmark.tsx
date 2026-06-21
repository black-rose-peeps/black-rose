import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const BRAND_LABELS = ["BLACK ROSE", "BLKROSE", "BR"] as const;

type BrandLabel = (typeof BRAND_LABELS)[number];

interface BrandWordmarkProps {
  className?: string;
}

/** Fits nav width: BLACK ROSE → BLKROSE → BR as space tightens. */
export function BrandWordmark({ className }: BrandWordmarkProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [label, setLabel] = useState<BrandLabel>("BLACK ROSE");

  useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    function pickLabel() {
      const maxWidth = container.clientWidth;
      if (maxWidth <= 0) return;

      for (const text of BRAND_LABELS) {
        measure.textContent = text;
        if (measure.offsetWidth <= maxWidth) {
          setLabel(text);
          return;
        }
      }
      setLabel("BR");
    }

    pickLabel();
    const observer = new ResizeObserver(pickLabel);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <span ref={containerRef} className={cn("min-w-0 flex-1", className)}>
      <span
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] whitespace-nowrap font-display text-lg tracking-wider-2 sm:text-xl"
      />
      <span className="block truncate font-display text-lg tracking-wider-2 sm:text-xl">
        {label}
      </span>
    </span>
  );
}
