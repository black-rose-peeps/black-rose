import { useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const INTERACTIVE_SELECTOR =
  "button, a, input, select, textarea, option, label, [role='button'], [role='combobox'], [role='listbox'], [role='option'], [data-bracket-interactive]";

interface BracketCanvasProps {
  children: ReactNode;
  className?: string;
  minHeight?: number;
}

export function BracketCanvas({ children, className, minHeight = 480 }: BracketCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(scale);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const isDragging = useRef(false);
  const pinch = useRef<{ dist: number; scale: number } | null>(null);

  scaleRef.current = scale;

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof Element && !!target.closest(INTERACTIVE_SELECTOR);

  const onPointerDown = (event: React.PointerEvent) => {
    if (isInteractiveTarget(event.target)) {
      event.stopPropagation();
      return;
    }
    if (event.button !== 0) return;

    isDragging.current = false;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, tx, ty };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag.current) return;

    const deltaX = event.clientX - drag.current.x;
    const deltaY = event.clientY - drag.current.y;
    if (!isDragging.current && Math.hypot(deltaX, deltaY) < 4) return;

    isDragging.current = true;
    setTx(drag.current.tx + deltaX);
    setTy(drag.current.ty + deltaY);
  };

  const onPointerUp = (event: React.PointerEvent) => {
    drag.current = null;
    isDragging.current = false;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  };

  const reset = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const handler = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;

      event.preventDefault();
      const delta = -event.deltaY * 0.0015;
      setScale((current) => clamp(parseFloat((current + delta).toFixed(2)), 0.35, 1.8));
    };

    element.addEventListener("wheel", handler, { passive: false });
    return () => element.removeEventListener("wheel", handler);
  }, []);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    function touchDistance(touches: TouchList): number {
      if (touches.length < 2) return 0;
      return Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
      );
    }

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length === 2) {
        drag.current = null;
        isDragging.current = false;
        pinch.current = { dist: touchDistance(event.touches), scale: scaleRef.current };
      }
    }

    function onTouchMove(event: TouchEvent) {
      if (event.touches.length !== 2 || !pinch.current) return;
      event.preventDefault();

      const dist = touchDistance(event.touches);
      if (pinch.current.dist <= 0) return;

      const next = pinch.current.scale * (dist / pinch.current.dist);
      setScale(clamp(parseFloat(next.toFixed(2)), 0.35, 1.8));
    }

    function onTouchEnd() {
      pinch.current = null;
    }

    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd);
    element.addEventListener("touchcancel", onTouchEnd);

    return () => {
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  const zoomButtonClass =
    "touch-target grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80";

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-border bg-card/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]",
        className,
      )}
      style={{ minHeight }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--foreground) 10%, transparent) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div
        ref={viewportRef}
        className="relative h-full w-full cursor-grab touch-none active:cursor-grabbing [&_[data-bracket-interactive]_button]:cursor-pointer"
        style={{ minHeight }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="origin-top-left"
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transition: drag.current ? "none" : "transform 0.18s ease-out",
            padding: 28,
            width: "max-content",
          }}
        >
          {children}
        </div>
      </div>

      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 border border-border bg-popover/95 p-1 safe-bottom backdrop-blur">
        <button
          type="button"
          onClick={() =>
            setScale((current) => clamp(parseFloat((current - 0.1).toFixed(2)), 0.35, 1.8))
          }
          className={zoomButtonClass}
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="min-w-12 text-center font-tech text-xs tabular-nums text-muted-foreground">
          {Math.round(scale * 100)}%
        </div>
        <button
          type="button"
          onClick={() =>
            setScale((current) => clamp(parseFloat((current + 0.1).toFixed(2)), 0.35, 1.8))
          }
          className={zoomButtonClass}
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </button>
        <div className="mx-1 h-5 w-px bg-border" />
        <button type="button" onClick={reset} className={zoomButtonClass} aria-label="Reset view">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[calc(100%-6rem)] border border-border bg-popover/85 px-3 py-1.5 font-tech text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur">
        <span className="hidden sm:inline">Drag to pan · Ctrl+scroll to zoom</span>
        <span className="sm:hidden">Drag to pan · Pinch to zoom</span>
      </div>
    </div>
  );
}
