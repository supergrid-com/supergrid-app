import type * as React from "react";

// One section of the organization modal: a header row (title, description, actions) over a
// scrolling, padded body. The modal's content area has a fixed height and no padding, so this
// fills it and scrolls on its own.
export function SectionPage({
  title,
  description,
  actions,
  width = 960,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** The body's max width in pixels. */
  width?: number;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b px-6 py-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-heading text-xl font-bold leading-tight tracking-tight">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex w-full flex-col gap-6 px-6 py-6" style={{ maxWidth: width }}>
          {children}
        </div>
      </div>
    </div>
  );
}
