import { useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const INTERACTIVE_SELECTOR =
  "button, a, input, select, textarea, [role='button'], [role='combobox'], [role='listbox'], [role='option'], [data-bracket-interactive]";

interface BracketCanvasProps {
  children: ReactNode;
  className?: string;
  minHeight?: number;
}

export function BracketCanvas({ children, className, minHeight = 480 }: BracketCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const isDragging = useRef(false);

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof Element && !!target.closest(INTERACTIVE_SELECTOR);

  const onWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.ctrlKey || event.metaKey) {
      const delta = -event.deltaY * 0.0015;
      setScale((current) => clamp(parseFloat((current + delta).toFixed(2)), 0.35, 1.8));
      return;
    }

    setTy((current) => current - event.deltaY);
    setTx((current) => current - event.deltaX);
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (isInteractiveTarget(event.target)) return;
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
      event.preventDefault();
      event.stopPropagation();
    };

    element.addEventListener("wheel", handler, { passive: false });
    return () => element.removeEventListener("wheel", handler);
  }, []);

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-border bg-card/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]",
        className,
      )}
      style={{ minHeight }}
      onWheel={onWheel}
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
        className="relative h-full w-full cursor-grab touch-none active:cursor-grabbing"
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

      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 border border-border bg-popover/95 p-1 backdrop-blur">
        <button
          type="button"
          onClick={() => setScale((current) => clamp(parseFloat((current - 0.1).toFixed(2)), 0.35, 1.8))}
          className="grid h-8 w-8 place-items-center text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="min-w-12 text-center font-tech text-xs tabular-nums text-muted-foreground">
          {Math.round(scale * 100)}%
        </div>
        <button
          type="button"
          onClick={() => setScale((current) => clamp(parseFloat((current + 0.1).toFixed(2)), 0.35, 1.8))}
          className="grid h-8 w-8 place-items-center text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </button>
        <div className="mx-1 h-5 w-px bg-border" />
        <button
          type="button"
          onClick={reset}
          className="grid h-8 w-8 place-items-center text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Reset view"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      <div className="pointer-events-none absolute left-3 top-3 z-10 border border-border bg-popover/85 px-3 py-1.5 font-tech text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur">
        Drag to pan · Scroll to move · Ctrl + scroll to zoom
      </div>
    </div>
  );
}
