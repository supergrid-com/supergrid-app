import { ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, BookOpenIcon, ChevronsUpDownIcon, CodeIcon, DatabaseIcon, LibraryIcon, MessageCircleIcon, PanelLeftIcon, PanelRightIcon, PlusIcon, SearchIcon, SquarePlusIcon, WorkflowIcon, type LucideIcon } from "lucide-react";
import * as React from "react";
import { C, FONT, Mark, MuseGlyph } from "./kit";

// The SuperGrid desktop app, rebuilt for the film after app/src/renderer/app/shell, in its Midnight
// theme: the title bar with Live / Dev, the rail (Threads, Apps, Core), the second panel, the agent's
// panel and the page in a card. Drawn at the app's own sizes and always shown whole. The rail, the
// second panel and the agent's panel each take an "open" amount from 0 to 1, so they slide in and out
// the way the app's own panels do. Every colour is a token from C; `tint` makes the soft fills from them.

export const WIN_W = 1640;
export const WIN_H = 860;
const TITLE_H = 44;
const RAIL_W = 224;

/** `hex` at `pct` percent, as `rgb(r g b / pct%)`, so soft fills come from the theme's own colours. */
export function tint(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${Math.max(0, Math.min(100, pct)).toFixed(1)}%)`;
}

export type RailKey = "database" | "workflows" | "library" | "code" | `app:${string}` | `thread:${number}`;

export type RailState = {
  workspace?: string;
  threads?: string[];
  apps?: string[];
  /** how selected each row is, 0 to 1, so the selection can move smoothly */
  active?: Partial<Record<RailKey, number>>;
  /** rows that light in the accent, for pointing at them while the voice names them */
  lit?: Partial<Record<RailKey, number>>;
  /** rows still arriving, 0 to 1 */
  arriving?: Partial<Record<RailKey, number>>;
  dev?: boolean;
};

export function Window({ title, mode = "live", rail, railOpen = rail ? 1 : 0, sub, subOpen = sub ? 1 : 0, chat, chatOpen = chat ? 1 : 0, children, chatWidth = 400, subWidth = 220 }: { title?: React.ReactNode; mode?: "live" | "dev"; rail?: RailState; railOpen?: number; sub?: React.ReactNode; subOpen?: number; chat?: React.ReactNode; chatOpen?: number; children?: React.ReactNode; chatWidth?: number; subWidth?: number }): React.ReactElement {
  return (
    <div style={{ width: WIN_W, height: WIN_H, background: C.bg, borderRadius: 16, boxShadow: "0 0 0 1px rgb(0 0 0 / 12%), 0 10px 24px rgb(0 0 0 / 8%), 0 30px 80px rgb(0 0 0 / 14%)", overflow: "hidden", display: "flex", flexDirection: "column", fontFamily: FONT, color: C.fg, fontSize: 15 }}>
      <TitleBar title={title} mode={mode} chrome={railOpen} />
      <div style={{ flex: 1, display: "flex", minHeight: 0, padding: "2px 8px 8px 0" }}>
        <div style={{ width: 8 + (RAIL_W - 8) * railOpen, flexShrink: 0, overflow: "hidden" }}>
          {rail && railOpen > 0 ? <div style={{ width: RAIL_W, height: "100%", opacity: railOpen }}><Rail {...rail} dev={mode === "dev"} /></div> : null}
        </div>
        <div style={{ width: (subWidth + 8) * subOpen, flexShrink: 0, overflow: "hidden" }}>
          {sub && subOpen > 0 ? <div style={{ width: subWidth, height: "100%", opacity: subOpen }}>{sub}</div> : null}
        </div>
        <div style={{ flex: 1, minWidth: 0, background: C.page, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", position: "relative" }}>{children}</div>
        <div style={{ width: (chatWidth + 8) * chatOpen, flexShrink: 0, overflow: "hidden", display: "flex", justifyContent: "flex-end" }}>
          {chat && chatOpen > 0 ? <div style={{ width: chatWidth, flexShrink: 0, height: "100%", opacity: Math.min(1, chatOpen * 1.5) }}>{chat}</div> : null}
        </div>
      </div>
    </div>
  );
}

function TitleBar({ title, mode, chrome }: { title?: React.ReactNode; mode: "live" | "dev"; chrome: number }): React.ReactElement {
  const icon = { width: 16, height: 16, color: C.dim };
  return (
    <div style={{ height: TITLE_H, display: "flex", alignItems: "center", gap: 14, padding: "0 16px", flexShrink: 0 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: 99, background: c }} />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, opacity: chrome }}>
        <ArrowLeftIcon style={{ ...icon, marginLeft: 10 }} />
        <ArrowRightIcon style={icon} />
        <PanelLeftIcon style={icon} />
        <div style={{ display: "flex", padding: 2, borderRadius: 8, background: C.hover, border: `1px solid ${C.lineSoft}`, fontSize: 13 }}>
          {(["live", "dev"] as const).map((m) => (
            <div key={m} style={{ padding: "2px 10px", borderRadius: 6, background: mode === m ? C.raised : "transparent", color: mode === m ? C.strong : C.dim }}>
              {m === "live" ? "Live" : "Dev"}
            </div>
          ))}
        </div>
        <div style={{ marginLeft: 200, fontSize: 15, color: C.fg, display: "flex", alignItems: "center", gap: 8, position: "relative", height: 20, flex: 1 }}>{title}</div>
        <PlusIcon style={icon} />
        <PanelRightIcon style={icon} />
      </div>
    </div>
  );
}

function RailRow({ icon: Icon, label, active = 0, lit = 0, arriving }: { icon: LucideIcon; label: string; active?: number; lit?: number; arriving?: number }): React.ReactElement {
  const on = Math.max(active, lit);
  const a = arriving ?? 1;
  return (
    <div style={{ height: 34 * a, opacity: a, overflow: "hidden" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, height: 34, padding: "0 10px", borderRadius: 8, background: lit > active ? tint(C.accent, lit * 16) : tint(C.strong, active * 8), color: on > 0.5 ? C.strong : C.fg, fontSize: 14 }}>
        <Icon style={{ width: 16, height: 16, color: on > 0.4 ? C.accent : C.muted, flexShrink: 0 }} />
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      </div>
    </div>
  );
}

function RailHeader({ label }: { label: string }): React.ReactElement {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 10px 6px", fontSize: 11.5, letterSpacing: "0.08em", color: C.dim, textTransform: "uppercase" }}>
      {label}
      <PlusIcon style={{ width: 15, height: 15, color: C.dim }} />
    </div>
  );
}

export function Rail({ workspace = "Studio", threads = [], apps = [], active = {}, lit = {}, arriving = {}, dev }: RailState): React.ReactElement {
  const core: { key: RailKey; label: string; icon: LucideIcon }[] = [
    { key: "database", label: "Database", icon: DatabaseIcon },
    { key: "workflows", label: "Workflows", icon: WorkflowIcon },
    { key: "library", label: "Library", icon: LibraryIcon },
  ];
  if (dev) core.push({ key: "code", label: "Code", icon: CodeIcon });
  return (
    <div style={{ width: RAIL_W, height: "100%", flexShrink: 0, display: "flex", flexDirection: "column", padding: "4px 10px 0 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, height: 40, padding: "0 6px" }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: C.accent, color: "#fff", display: "grid", placeItems: "center", fontSize: 13 }}>{workspace[0]}</div>
        <span style={{ fontSize: 16, color: C.strong }}>{workspace}</span>
        <div style={{ flex: 1 }} />
        <ChevronsUpDownIcon style={{ width: 14, height: 14, color: C.dim }} />
      </div>
      <RailHeader label="Threads" />
      {threads.map((th, i) => (
        <RailRow key={th} icon={MessageCircleIcon} label={th} active={active[`thread:${i}`]} lit={lit[`thread:${i}`]} />
      ))}
      <RailHeader label="Apps" />
      {apps.map((a) => (
        <RailRow key={a} icon={SquarePlusIcon} label={a} active={active[`app:${a}`]} lit={lit[`app:${a}`]} arriving={arriving[`app:${a}`]} />
      ))}
      <div style={{ height: 1, background: C.lineSoft, margin: "14px 8px 0" }} />
      <RailHeader label="Core" />
      {core.map((c) => (
        <RailRow key={c.key} icon={c.icon} label={c.label} active={active[c.key]} lit={lit[c.key]} />
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ borderTop: `1px solid ${C.lineSoft}`, display: "flex", alignItems: "center", gap: 10, height: 50, padding: "0 8px", color: C.fg, fontSize: 15 }}>
        <Mark size={15} color={C.muted} />
        SuperGrid
        <div style={{ flex: 1 }} />
        <BookOpenIcon style={{ width: 16, height: 16, color: C.dim }} />
      </div>
    </div>
  );
}

export type SubItem = { label: string; icon?: LucideIcon; active?: boolean; meta?: React.ReactNode; group?: string; lit?: number };

/** The second panel: a section's sub pages, or an app's own admin menu. */
export function SubNav({ title, items }: { title: string; items: SubItem[] }): React.ReactElement {
  let lastGroup: string | undefined;
  return (
    <div style={{ height: "100%", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 10px" }}>
      <div style={{ fontSize: 16, color: C.strong, padding: "4px 10px 14px" }}>{title}</div>
      {items.map((it, i) => {
        const header = it.group && it.group !== lastGroup ? it.group : null;
        lastGroup = it.group;
        const Icon = it.icon;
        const lit = it.lit ?? 0;
        return (
          <React.Fragment key={`${it.label}${i}`}>
            {header ? <div style={{ fontSize: 11.5, letterSpacing: "0.08em", textTransform: "uppercase", color: C.dim, padding: "14px 10px 6px" }}>{header}</div> : null}
            <div style={{ display: "flex", alignItems: "center", gap: 10, height: 34, padding: "0 10px", borderRadius: 8, background: it.active ? C.active : lit > 0 ? tint(C.accent, lit * 16) : "transparent", color: it.active || lit > 0.5 ? C.strong : C.fg, fontSize: 14 }}>
              {Icon ? <Icon style={{ width: 16, height: 16, color: it.active || lit > 0.3 ? C.accent : C.muted }} /> : null}
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.meta ? <span style={{ fontSize: 12.5, color: C.dim }}>{it.meta}</span> : null}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/** The agent's panel: Muse at the top, the thread, the composer below. */
export function ChatPanel({ children, draft, live }: { children?: React.ReactNode; draft?: React.ReactNode; live?: number }): React.ReactElement {
  const glow = live ?? 0;
  return (
    <div style={{ height: "100%", background: C.panel, border: `1px solid ${glow > 0 ? tint(C.meta, 20 + glow * 40) : C.line}`, borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ height: 46, display: "flex", alignItems: "center", gap: 10, padding: "0 16px", borderBottom: `1px solid ${C.lineSoft}`, fontSize: 14.5, color: C.strong }}>
        <MuseGlyph size={22} />
        Muse Code
        <span style={{ color: C.dim, fontSize: 13 }}>over ACP</span>
      </div>
      <div style={{ flex: 1, padding: "16px 16px 8px", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 12, overflow: "hidden" }}>{children}</div>
      <div style={{ margin: 10, background: C.raised, border: `1px solid ${C.line}`, borderRadius: 16, padding: "13px 14px 10px", minHeight: 100, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 14.5, color: draft ? C.strong : C.dim, flex: 1, lineHeight: 1.45 }}>{draft ?? "Ask or build in Studio"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.muted }}>
          <PlusIcon style={{ width: 16, height: 16 }} />
          <div style={{ flex: 1 }} />
          <MuseGlyph size={20} />
          <span style={{ color: C.fg }}>Muse Spark 1.3</span>
          <span>Extra High</span>
          <div style={{ width: 28, height: 28, borderRadius: 99, background: draft ? C.accent : C.active, display: "grid", placeItems: "center" }}>
            <ArrowUpIcon style={{ width: 15, height: 15, color: "#fff" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** A message from the person, right-aligned in a bubble. */
export function UserMsg({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div className="pretty" style={{ alignSelf: "flex-end", maxWidth: "90%", background: C.raised, border: `1px solid ${C.lineSoft}`, borderRadius: 14, padding: "10px 14px", fontSize: 14, lineHeight: 1.45, color: C.strong }}>{children}</div>;
}

/** A tool call the agent made, as the app shows it: a row with a check. */
export function ToolRow({ icon: Icon = CodeIcon, label, state = "done", detail }: { icon?: LucideIcon; label: React.ReactNode; state?: "running" | "done" | "warn"; detail?: React.ReactNode }): React.ReactElement {
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 12px", fontSize: 14, color: C.fg, background: C.card }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon style={{ width: 15, height: 15, color: C.muted }} />
        <span style={{ flex: 1 }}>{label}</span>
        {state === "done" ? <span style={{ color: C.success, fontSize: 15 }}>✓</span> : state === "warn" ? <span style={{ color: C.warning, fontSize: 13 }}>Fixed</span> : <Spinner />}
      </div>
      {detail ? <div style={{ marginTop: 8 }}>{detail}</div> : null}
    </div>
  );
}

export function Spinner(): React.ReactElement {
  return <div style={{ width: 13, height: 13, borderRadius: 99, border: `2px solid ${C.line}`, borderTopColor: C.meta }} />;
}

/** The page's own header row inside the card: the title, anything beside it, the page's one action at the end. Always 64 high. */
export function PageHeader({ title, action, children }: { title: React.ReactNode; action?: React.ReactNode; children?: React.ReactNode }): React.ReactElement {
  return (
    <div style={{ height: 64, padding: "0 24px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
      <div style={{ fontSize: 22, color: C.strong, lineHeight: "30px" }}>{title}</div>
      {children}
      <div style={{ flex: 1 }} />
      {action}
    </div>
  );
}

/** The row of pages inside a section, as the app's segmented tabs. */
export function PageTabs({ items, active }: { items: string[]; active: number }): React.ReactElement {
  return (
    <div style={{ display: "flex", gap: 4, marginLeft: 16, fontSize: 14 }}>
      {items.map((x, i) => (
        <span key={x} style={{ padding: "5px 12px", borderRadius: 8, background: i === active ? C.active : "transparent", color: i === active ? C.strong : C.muted }}>{x}</span>
      ))}
    </div>
  );
}

/** The list pages' toolbar: a search box and the filter chips, with a count at the end. */
export function Toolbar({ placeholder, chips = [], active = 0, count, style }: { placeholder: string; chips?: string[]; active?: number; count?: React.ReactNode; style?: React.CSSProperties }): React.ReactElement {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, height: 34, ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, height: 32, width: 240, padding: "0 10px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.card, color: C.dim, fontSize: 13.5 }}>
        <SearchIcon style={{ width: 14, height: 14 }} />
        {placeholder}
      </div>
      {chips.map((c, i) => (
        <span key={c} style={{ height: 28, padding: "0 11px", borderRadius: 999, display: "inline-flex", alignItems: "center", fontSize: 13, background: i === active ? C.active : "transparent", border: `1px solid ${i === active ? C.line : C.lineSoft}`, color: i === active ? C.strong : C.muted, whiteSpace: "nowrap" }}>{c}</span>
      ))}
      <div style={{ flex: 1 }} />
      {count !== undefined ? <span style={{ fontSize: 13, color: C.dim }}>{count}</span> : null}
    </div>
  );
}

export function Button({ children, primary, meta, style }: { children: React.ReactNode; primary?: boolean; meta?: boolean; style?: React.CSSProperties }): React.ReactElement {
  const bg = meta ? C.meta : primary ? C.accent : C.raised;
  return <div style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 34, padding: "0 14px", borderRadius: 9, fontSize: 14, background: bg, color: primary || meta ? "#fff" : C.strong, border: primary || meta ? "none" : `1px solid ${C.line}`, whiteSpace: "nowrap", ...style }}>{children}</div>;
}

const TONES = {
  neutral: { bg: C.active, fg: C.fg, bd: C.line },
  accent: { bg: C.accentSoft, fg: C.accent, bd: tint(C.accent, 32) },
  success: { bg: C.successSoft, fg: C.success, bd: tint(C.success, 26) },
  warning: { bg: tint(C.warning, 13), fg: C.warning, bd: tint(C.warning, 28) },
  danger: { bg: tint(C.danger, 12), fg: C.danger, bd: tint(C.danger, 30) },
  meta: { bg: C.metaSoft, fg: C.meta, bd: tint(C.meta, 36) },
};
export type Tone = keyof typeof TONES;

/** A small label inside the app, as a pill with a soft fill. */
export function Tag({ children, tone = "neutral", style }: { children: React.ReactNode; tone?: Tone; style?: React.CSSProperties }): React.ReactElement {
  const tones = TONES[tone];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: tones.bg, color: tones.fg, border: `1px solid ${tones.bd}`, fontSize: 13, lineHeight: 1.3, whiteSpace: "nowrap", ...style }}>{children}</span>;
}

/** A record's pill without the edge, the quieter kind a data grid uses: a dot and the word. */
export function Dot({ children, tone = "neutral", style }: { children: React.ReactNode; tone?: Tone; style?: React.CSSProperties }): React.ReactElement {
  const tones = TONES[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "2px 9px 2px 7px", borderRadius: 999, background: tones.bg, color: tone === "neutral" ? C.fg : tones.fg, fontSize: 13, lineHeight: 1.35, whiteSpace: "nowrap", ...style }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: tone === "neutral" ? C.muted : tones.fg }} />
      {children}
    </span>
  );
}
