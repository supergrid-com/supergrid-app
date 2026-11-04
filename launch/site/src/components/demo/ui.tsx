import { PlusIcon, type LucideIcon } from "lucide-react";
import { createContext, useContext, type ReactNode } from "react";

// The demo's own small kit, in the app's tokens (theme.ts): --i-* for the page in the card,
// --a-* for the admin layer around it.

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(" ");
}

/** The page's one main action (New Post, New Row), set by the window for whatever page is open. */
export const PageAction = createContext<{ label: string; run: () => void } | undefined>(undefined);

/**
 * A page inside the card: its title, an optional row of tabs or chips beside it, then at the far
 * end any controls of its own and the page's main action as a quiet ghost button, then the body.
 */
export function Page({ title, aside, end, children, className }: { title: ReactNode; aside?: ReactNode; end?: ReactNode; children: ReactNode; className?: string }) {
  const action = useContext(PageAction);
  return (
    <div className={cx("flex h-full min-h-0 flex-col", className)}>
      <div className="flex h-[66px] shrink-0 items-center gap-3 px-6 pt-1">
        <h3 className="text-[21px] font-medium text-(--i-strong)">{title}</h3>
        {aside}
        <span className="flex-1" />
        {end}
        {action ? (
          <button type="button" onClick={action.run} className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-(--i-line) px-3 text-[13.5px] whitespace-nowrap text-(--i-fg) transition-colors hover:bg-(--i-fill) hover:text-(--i-strong)">
            <PlusIcon className="size-3.5 text-(--i-muted)" />
            {action.label}
          </button>
        ) : null}
      </div>
      <div className="demo-scroll min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
    </div>
  );
}

export function Btn({ children, primary, onClick, disabled, className }: { children: ReactNode; primary?: boolean; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13.5px] whitespace-nowrap transition-[background-color,opacity] disabled:cursor-default disabled:opacity-60",
        primary ? "bg-(--i-accent) text-(--i-on-accent) hover:opacity-90" : "border border-(--i-line) bg-(--i-card) text-(--i-strong) hover:bg-(--i-fill)",
        className,
      )}
    >
      {children}
    </button>
  );
}

type Tone = "neutral" | "accent" | "success" | "warning" | "meta";

export function Tag({ children, tone = "neutral", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  const look = {
    neutral: "bg-(--i-fill) text-(--i-fg)",
    accent: "bg-(--i-accent-soft) text-(--i-accent)",
    success: "bg-(--i-success-soft) text-(--i-success)",
    warning: "bg-(--i-warning-soft) text-(--i-warning)",
    meta: "bg-(--i-meta-soft) text-(--i-meta)",
  }[tone];
  return <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12.5px] whitespace-nowrap", look, className)}>{children}</span>;
}

/** A card on the page. */
export function Box({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cx("rounded-xl border border-(--i-line) bg-(--i-card) text-left", onClick && "w-full cursor-pointer transition-colors hover:border-(--i-input)", className)}
    >
      {children}
    </Tag>
  );
}

export function BoxTitle({ icon: Icon, children, aside }: { icon?: LucideIcon; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[14.5px] text-(--i-strong)">
      {Icon ? <Icon className="size-4 text-(--i-muted)" /> : null}
      <span className="flex-1">{children}</span>
      {aside}
    </div>
  );
}

/** A plain data table: hairline rows, a quiet header, rows that can be clicked. */
export function Table({ cols, rows, onRow, mono }: { cols: { label: string; w?: string; align?: "right" }[]; rows: ReactNode[][]; onRow?: (i: number) => void; mono?: number[] }) {
  const template = cols.map((c) => c.w ?? "1fr").join(" ");
  return (
    <div className="overflow-hidden rounded-xl border border-(--i-line) bg-(--i-card)">
      <div className="grid h-9 items-center gap-4 border-b border-(--i-line) px-4 text-[12.5px] text-(--i-muted)" style={{ gridTemplateColumns: template }}>
        {cols.map((c) => (
          <div key={c.label} className={cx("truncate", c.align === "right" && "text-right")}>
            {c.label}
          </div>
        ))}
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          onClick={onRow ? () => onRow(i) : undefined}
          className={cx("grid h-11 items-center gap-4 px-4 text-[13.5px] text-(--i-fg)", i > 0 && "border-t border-(--i-line)", onRow && "cursor-pointer hover:bg-(--i-fill)")}
          style={{ gridTemplateColumns: template }}
        >
          {r.map((cell, j) => (
            <div key={j} className={cx("min-w-0 truncate", cols[j]?.align === "right" && "text-right", mono?.includes(j) && "font-mono text-[12.5px] text-(--i-muted)", j === 0 && !mono?.includes(0) && "text-(--i-strong)")}>
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** A segmented row of tabs, as the app's pages use above a list. */
export function Tabs({ items, value, onChange }: { items: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="ml-2 flex gap-1 text-[13.5px]">
      {items.map((x) => (
        <button key={x} type="button" onClick={() => onChange(x)} className={cx("cursor-pointer rounded-lg px-3 py-1 transition-colors", x === value ? "bg-(--i-fill) text-(--i-strong)" : "text-(--i-muted) hover:text-(--i-fg)")}>
          {x}
        </button>
      ))}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx("inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70", className)} />;
}

/** A toggle switch in the accent. */
export function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className={cx("relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors", on ? "bg-(--i-accent)" : "bg-(--i-input)")} aria-pressed={on}>
      <span className={cx("absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left]", on ? "left-[18px]" : "left-0.5")} />
    </button>
  );
}

/** Small bar chart, the last bar in the accent. */
export function Bars({ values, className, highlight = values.length - 1 }: { values: number[]; className?: string; highlight?: number }) {
  const max = Math.max(...values);
  return (
    <div className={cx("flex items-end gap-1.5", className)}>
      {values.map((v, i) => (
        <div key={i} className={cx("flex-1 rounded-[3px] transition-[height] duration-500", i === highlight ? "bg-(--i-accent)" : "bg-(--i-input)")} style={{ height: `${(v / max) * 100}%` }} />
      ))}
    </div>
  );
}
