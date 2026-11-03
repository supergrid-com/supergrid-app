import * as React from "react";
import { cn } from "~/lib/utils";

// The pieces every Components page is drawn with: a titled specimen on a canvas (the page's own
// ground, or the admin layer behind the cards), and a labelled row of variants inside it.

export function Specimen({
  title,
  about,
  canvas = "page",
  className,
  children,
}: {
  title: string;
  about?: React.ReactNode;
  /** "admin" draws it on the layer behind the cards (rail, sub nav), in the admin theme. */
  canvas?: "page" | "admin" | "none";
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="flex flex-col gap-2.5">
      <div>
        <h2 className="text-[13px] font-semibold">{title}</h2>
        {about && <p className="text-xs text-muted-foreground">{about}</p>}
      </div>
      {canvas === "none" ? (
        children
      ) : (
        <div className={cn("flex flex-col gap-4 rounded-xl border p-5", canvas === "admin" ? "border-admin-line bg-admin text-admin-fg" : "bg-background", className)}>{children}</div>
      )}
    </section>
  );
}

/** One row of variants: its name on the left, the pieces wrapping beside it. */
export function Variants({ label, className, children }: { label: string; className?: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <div className="w-28 shrink-0 font-mono text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("flex min-w-0 flex-1 flex-wrap items-center gap-2", className)}>{children}</div>
    </div>
  );
}

/** A count that moves whenever the theme does (page theme, admin theme, accent), so swatches read their colors again. */
export function useThemeVersion(): number {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const mo = new MutationObserver(() => setV((n) => n + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-admin-theme"] });
    return () => mo.disconnect();
  }, []);
  return v;
}

let probe: CanvasRenderingContext2D | null = null;

/** Any CSS color (oklch, color-mix, color(srgb …)) as #rrggbb, with its alpha when it has one. */
export function toHex(color: string): string {
  if (!color) return "";
  probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!probe) return color;
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
  const hex = `#${[r, g, b].map((n) => (n ?? 0).toString(16).padStart(2, "0")).join("")}`;
  return a === 255 ? hex : `${hex} · ${Math.round(((a ?? 0) / 255) * 100)}%`;
}

export const checkerStyle: React.CSSProperties = {
  backgroundImage: "repeating-conic-gradient(rgb(128 128 128 / 14%) 0 25%, transparent 0 50%)",
  backgroundSize: "12px 12px",
};
