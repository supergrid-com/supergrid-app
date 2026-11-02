import { ClipboardListIcon, FunnelIcon, HandIcon, LayoutTemplateIcon, type LucideProps } from "lucide-react";
import type * as React from "react";
import { appColors, type AppId } from "~/lib/mock";
import { cn } from "~/lib/utils";

const icons: Record<AppId, React.ComponentType<LucideProps>> = {
  pages: LayoutTemplateIcon,
  funnels: FunnelIcon,
  forms: ClipboardListIcon,
  hello: HandIcon,
};

// The bare glyph, for places that want an app to look like any other nav item.
export function AppGlyph({ app, className, ...props }: { app: AppId } & LucideProps): React.ReactElement {
  const Icon = icons[app];
  return <Icon className={className} {...props} />;
}

// The colored tile that stands for an app everywhere: tabs, launcher, home, dashboard.
export function AppIcon({ app, size = "md", className }: { app: AppId; size?: "xs" | "sm" | "md" | "lg" | "xl"; className?: string }): React.ReactElement {
  const Icon = icons[app];
  const sizes = {
    xs: "size-4 rounded-[4px] [&_svg]:size-2.5",
    sm: "size-5 rounded-md [&_svg]:size-3",
    md: "size-6 rounded-md [&_svg]:size-3.5",
    lg: "size-10 rounded-xl [&_svg]:size-5",
    xl: "size-14 rounded-2xl [&_svg]:size-7",
  };
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]", sizes[size], className)}
      style={{ background: appColors[app] }}
      aria-hidden="true"
    >
      <Icon strokeWidth={2.25} />
    </span>
  );
}

// A 2x2 cluster of the apps in a workspace, like a folder thumbnail.
export function AppCluster({ apps, className }: { apps: AppId[]; className?: string }): React.ReactElement {
  const shown = apps.slice(0, 4);
  return (
    <div className={cn("flex size-14 items-center justify-center rounded-xl border bg-background shadow-xs/5", className)}>
      {shown.length === 0 ? (
        <span className="size-5 rounded-md border border-dashed" />
      ) : shown.length === 1 ? (
        <AppIcon app={shown[0]} size="lg" className="rounded-lg" />
      ) : (
        <div className="grid grid-cols-2 gap-1">
          {shown.map((a) => (
            <AppIcon key={a} app={a} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}
