import * as React from "react";
import { cn } from "~/lib/utils";

// A drag handle in the gap on a panel's right edge: dragging right widens the panel, a double
// click puts it back. `onChange` keeps the width within its limits.
export function ResizeHandle({
  label,
  width,
  defaultWidth,
  onChange,
  onDragging,
  className,
  style,
}: {
  label: string;
  width: number;
  defaultWidth: number;
  onChange: (width: number) => void;
  onDragging?: (dragging: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
}): React.ReactElement {
  const [dragging, setDragging] = React.useState(false);
  const set = (on: boolean) => {
    setDragging(on);
    onDragging?.(on);
  };
  const start = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    set(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const move = (ev: PointerEvent) => onChange(width + (ev.clientX - startX));
    const up = () => {
      set(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      onPointerDown={start}
      onDoubleClick={() => onChange(defaultWidth)}
      className={cn("group relative z-10 shrink-0 cursor-col-resize touch-none", className)}
      style={style}
    >
      {/* a wider hit area than the gap it sits in */}
      <div className="absolute inset-y-0 -inset-x-1.5" />
      <div className={cn("absolute inset-y-3 left-1/2 w-0.5 -translate-x-1/2 rounded-full transition-colors group-hover:bg-admin-accent", dragging ? "bg-admin-accent" : "bg-transparent")} />
    </div>
  );
}
