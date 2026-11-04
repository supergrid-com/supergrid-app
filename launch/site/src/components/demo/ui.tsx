import { PlusIcon, SearchIcon, type LucideIcon } from "lucide-react";
import { createContext, useContext, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { photoSrc, type PhotoId } from "./photos";

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
      <div className="demo-scroll @container min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
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

/** An element's width, kept up to date, for layouts that change with the room they have. */
export function useWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** A photo from public/demo filling its box, cropped to `focus`. */
export function Photo({ id, focus, className }: { id: PhotoId; focus?: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={photoSrc(id)} alt="" loading="lazy" decoding="async" draggable={false} className={cx("block size-full object-cover", className)} style={{ objectPosition: focus }} />;
}

// A few soft colours for avatars, picked by the name so the same person always gets the same one.
const AVATAR = ["#7c8cf8", "#34d399", "#fbbf24", "#f472b6", "#22d3ee", "#fb923c", "#a78bfa"];

/** Two letters on a soft coloured circle. */
export function Avatar({ name, size = 22 }: { name: string; size?: number }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
  const c = AVATAR[h % AVATAR.length]!;
  const parts = name.trim().split(/\s+/);
  const two = ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]![0] : (parts[0]?.[1] ?? ""))).toUpperCase();
  return (
    <span className="inline-grid shrink-0 place-items-center rounded-full tracking-[0.02em]" style={{ width: size, height: size, fontSize: size * 0.42, color: c, background: `color-mix(in srgb, ${c} 18%, transparent)` }}>
      {two}
    </span>
  );
}

/** A name with its avatar beside it. */
export function Person({ name, size }: { name: string; size?: number }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar name={name} size={size} />
      <span className="truncate">{name}</span>
    </span>
  );
}

/** A record's pill without the edge, the quieter kind a data grid uses: a dot and the word. */
export function Dot({ children, tone = "neutral", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  const look = {
    neutral: ["bg-(--i-fill) text-(--i-fg)", "bg-(--i-muted)"],
    accent: ["bg-(--i-accent-soft) text-(--i-accent)", "bg-current"],
    success: ["bg-(--i-success-soft) text-(--i-success)", "bg-current"],
    warning: ["bg-(--i-warning-soft) text-(--i-warning)", "bg-current"],
    meta: ["bg-(--i-meta-soft) text-(--i-meta)", "bg-current"],
  }[tone];
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full py-px pr-2 pl-1.5 text-[12.5px] whitespace-nowrap", look[0], className)}>
      <span className={cx("size-1.5 shrink-0 rounded-full", look[1])} />
      {children}
    </span>
  );
}

/** A list page's toolbar: a search box that really filters, the filter chips, and a count at the end. */
export function Toolbar({ query, onQuery, placeholder, chips = [], chip, onChip, count, className }: { query: string; onQuery: (q: string) => void; placeholder: string; chips?: string[]; chip?: string; onChip?: (c: string) => void; count?: ReactNode; className?: string }) {
  return (
    <div className={cx("mb-3 flex flex-wrap items-center gap-2", className)}>
      <label className="flex h-8 w-52 items-center gap-2 rounded-lg border border-(--i-line) bg-(--i-card) px-2.5 text-(--i-muted) focus-within:border-(--i-accent)">
        <SearchIcon className="size-3.5 shrink-0" />
        <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-[13.5px] text-(--i-strong) outline-none placeholder:text-(--i-muted)" />
      </label>
      {chips.map((c) => (
        <button key={c} type="button" onClick={() => onChip?.(c)} className={cx("h-7 cursor-pointer rounded-full border px-2.5 text-[13px] whitespace-nowrap transition-colors", c === chip ? "border-(--i-line) bg-(--i-fill) text-(--i-strong)" : "border-transparent text-(--i-muted) hover:text-(--i-fg)")}>
          {c}
        </button>
      ))}
      <span className="flex-1" />
      {count !== undefined ? <span className="text-[13px] whitespace-nowrap text-(--i-muted)">{count}</span> : null}
    </div>
  );
}

/** A number with its change, as the dashboards show them. */
export function Stat({ label, value, delta, className }: { label: string; value: ReactNode; delta?: string; className?: string }) {
  const down = delta?.startsWith("-");
  return (
    <div className={cx("rounded-[10px] border border-(--i-line) bg-(--i-fill) px-3.5 py-3", className)}>
      <div className="truncate text-[12.5px] text-(--i-muted)">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-[22px] leading-none text-(--i-strong) tabular-nums">{value}</span>
        {delta ? <span className={cx("rounded-full px-1.5 py-px text-[11.5px]", down ? "bg-(--i-warning-soft) text-(--i-warning)" : "bg-(--i-success-soft) text-(--i-success)")}>{delta}</span> : null}
      </div>
    </div>
  );
}

/**
 * An area chart in SVG: `values` left to right, filled under the line in the accent, gridlines
 * behind, `labels` along the bottom. Hovering reads off a point: a guide, a dot and its value.
 */
export function AreaChart({ values, labels = [], height = 140, format = (v) => v.toLocaleString(), point, className }: { values: number[]; labels?: string[]; height?: number; format?: (v: number) => string; point?: (i: number) => string; className?: string }) {
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const W = 1000;
  const H = 100;
  const max = Math.max(...values) * 1.1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - (v / max) * H] as const);
  // a gentle curve through the points, so it reads as a trend rather than a zigzag
  const line = pts.reduce((d, [x, y], i) => {
    if (!i) return `M${x} ${y}`;
    const [px, py] = pts[i - 1]!;
    const cx1 = px + (x - px) / 2;
    return `${d} C${cx1} ${py} ${cx1} ${y} ${x} ${y}`;
  }, "");
  const at = hover ?? values.length - 1;
  const [hx, hy] = pts[at]!;
  return (
    <div className={cx("relative", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        className="block overflow-visible"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(Math.round(((e.clientX - r.left) / r.width) * (values.length - 1)));
        }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--i-accent)" stopOpacity={0.3} />
            <stop offset="1" stopColor="var(--i-accent)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="var(--i-line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={`${line} L${W} ${H} L0 ${H} Z`} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke="var(--i-accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {hover !== null ? <line x1={hx} x2={hx} y1="0" y2={H} stroke="var(--i-input)" strokeWidth="1" vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      <span className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--i-accent) shadow-[0_0_0_3px_var(--i-accent-soft)]" style={{ left: `${(hx / W) * 100}%`, top: (hy / H) * height }} />
      {hover !== null ? (
        <span className="pointer-events-none absolute -translate-x-1/2 rounded-md border border-(--i-line) bg-(--i-card) px-2 py-1 text-[12px] whitespace-nowrap text-(--i-strong) shadow-lg" style={{ left: `clamp(48px, ${(hx / W) * 100}%, calc(100% - 48px))`, top: Math.max(0, (hy / H) * height - 40) }}>
          {format(values[hover]!)}
          {point ? <span className="ml-1.5 text-(--i-muted)">{point(hover)}</span> : null}
        </span>
      ) : null}
      {labels.length ? (
        <div className="mt-2 flex justify-between text-[11.5px] text-(--i-muted)">
          {labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** A breakdown: each label with its number, and a bar under it the share of the biggest. */
export function Meter({ items, format = (v) => v.toLocaleString() }: { items: [string, number][]; format?: (v: number) => string }) {
  const max = Math.max(...items.map((x) => x[1]));
  return (
    <div className="space-y-3 text-[13px]">
      {items.map(([label, v], i) => (
        <div key={label}>
          <div className="flex items-baseline gap-3">
            <span className="min-w-0 flex-1 truncate text-(--i-fg)">{label}</span>
            <span className="text-(--i-strong) tabular-nums">{format(v)}</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-(--i-fill)">
            <div className={cx("h-full rounded-full", i === 0 ? "bg-(--i-accent)" : "bg-(--i-input)")} style={{ width: `${(v / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
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
