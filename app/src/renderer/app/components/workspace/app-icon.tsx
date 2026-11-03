import { PackageIcon } from "lucide-react";
import * as React from "react";
import { cn } from "~/lib/utils";

// An app's icon, from the SVG its manifest carries (an iconify icon: 24×24, stroke currentColor). The glyph alone for
// rail rows, where it reads like any other nav icon; the colored tile for cards, headers and the launcher.

type Iconed = { name: string; icon?: string | null; color?: string | null };

/** True for an SVG we will put in the page: one root <svg>, nothing that runs. */
export function safeSvg(svg: string | null | undefined): svg is string {
  if (!svg) return false;
  const t = svg.trim();
  return t.startsWith("<svg") && t.endsWith("</svg>") && !/<script|\son[a-z]+\s*=|javascript:|<foreignObject|<iframe|<object|<embed|xlink:href\s*=\s*"(?!#)/i.test(t);
}

/** The icon itself, sized by the parent's `[&_svg]:size-*`; the package icon when the app has none. */
export function AppGlyph({ app, className }: { app: Iconed; className?: string }): React.ReactElement {
  if (!safeSvg(app.icon)) return <PackageIcon className={className} />;
  return <span aria-hidden className={cn("inline-flex [&_svg]:size-full [&_svg]:fill-none", className)} dangerouslySetInnerHTML={{ __html: app.icon }} />;
}

const sizes = {
  xs: "size-4 rounded-[4px] [&_svg]:size-2.5",
  sm: "size-5 rounded-md [&_svg]:size-3",
  md: "size-6 rounded-md [&_svg]:size-3.5",
  lg: "size-10 rounded-xl [&_svg]:size-5",
  xl: "size-14 rounded-2xl [&_svg]:size-7",
};

/** The colored tile that stands for an app: its glyph in white on its color (the active color when it has none). */
export function AppIcon({ app, size = "md", className }: { app: Iconed; size?: keyof typeof sizes; className?: string }): React.ReactElement {
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]", sizes[size], className)} style={{ background: app.color ?? "var(--active)" }} aria-hidden="true">
      <AppGlyph app={app} className="size-full items-center justify-center [&_svg]:size-[60%]" />
    </span>
  );
}
