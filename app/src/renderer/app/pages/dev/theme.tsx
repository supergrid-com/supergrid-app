import * as React from "react";
import { toastManager } from "~/components/ui/toast";
import { cn } from "~/lib/utils";
import { checkerStyle, Specimen, toHex, useThemeVersion } from "./specimen";

// The theme: every color token as the current theme resolves it, the type, and the radii,
// shadows and layers the app stacks its surfaces in. All of it lives in app.css.

type Token = { name: string; use: string };

const pageTokens: Token[] = [
  { name: "background", use: "The page inside a workspace's card" },
  { name: "foreground", use: "Body text" },
  { name: "card", use: "Cards on the page" },
  { name: "card-foreground", use: "Text on cards" },
  { name: "popover", use: "Menus, popovers, dialogs" },
  { name: "popover-foreground", use: "Text in them" },
  { name: "primary", use: "Default buttons, checked controls" },
  { name: "primary-foreground", use: "Text on primary" },
  { name: "secondary", use: "Secondary buttons" },
  { name: "secondary-foreground", use: "Text on secondary" },
  { name: "muted", use: "Quiet fills, kbd, segmented tracks" },
  { name: "muted-foreground", use: "Hints, descriptions, labels" },
  { name: "accent", use: "Hover and highlighted rows" },
  { name: "accent-foreground", use: "Text on accent" },
  { name: "border", use: "Hairlines and card edges" },
  { name: "input", use: "Input borders, unchecked switches" },
  { name: "ring", use: "Focus rings" },
  { name: "app-bg", use: "The window behind everything" },
  { name: "code", use: "Code blocks" },
  { name: "code-highlight", use: "Highlighted code lines" },
];

const statusTokens: Token[] = [
  { name: "active", use: "The accent: active rows, picked cells" },
  { name: "active-foreground", use: "Text on active" },
  { name: "destructive", use: "Destructive buttons, errors" },
  { name: "destructive-foreground", use: "Error text" },
  { name: "info", use: "Info fills and icons" },
  { name: "info-foreground", use: "Info text" },
  { name: "success", use: "Success fills and icons" },
  { name: "success-foreground", use: "Success text" },
  { name: "warning", use: "Warning fills and icons" },
  { name: "warning-foreground", use: "Warning text" },
];

const adminTokens: Token[] = [
  { name: "admin-bg", use: "The rail and backdrop (bg-admin)" },
  { name: "admin-panel", use: "The sub nav and agent panels" },
  { name: "admin-raised", use: "Lifted off a panel: the composer" },
  { name: "admin-strong", use: "Titles, active rows" },
  { name: "admin-fg", use: "Row text" },
  { name: "admin-muted", use: "Icons, secondary text" },
  { name: "admin-dim", use: "Group labels, counts" },
  { name: "admin-hover", use: "Row hover" },
  { name: "admin-active", use: "The active row" },
  { name: "admin-line", use: "Hairlines on the admin layer" },
  { name: "admin-ring", use: "Focus rings on the admin layer" },
  { name: "admin-accent", use: "The accent on the admin layer" },
];

const chartTokens: Token[] = [1, 2, 3, 4, 5].map((n) => ({ name: `chart-${n}`, use: `Series ${n}` }));

function Swatch({ token, admin }: { token: Token; admin?: boolean }): React.ReactElement {
  const ref = React.useRef<HTMLDivElement>(null);
  const version = useThemeVersion();
  const [value, setValue] = React.useState("");
  React.useLayoutEffect(() => {
    if (ref.current) setValue(toHex(getComputedStyle(ref.current).backgroundColor));
  }, [version]);
  const copy = () => {
    void navigator.clipboard.writeText(`var(--${token.name})`);
    toastManager.add({ title: `Copied var(--${token.name})`, type: "success" });
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy var(--${token.name})`}
      className={cn("flex cursor-pointer flex-col overflow-hidden rounded-lg border text-left outline-none transition-shadow hover:shadow-md focus-visible:ring-2", admin ? "border-admin-line bg-admin-panel focus-visible:ring-admin-ring" : "bg-card focus-visible:ring-ring")}
    >
      <div className="relative h-14" style={checkerStyle}>
        <div ref={ref} className="absolute inset-0" style={{ background: `var(--${token.name})` }} />
      </div>
      <div className={cn("flex flex-col gap-0.5 border-t px-2.5 py-2", admin && "border-admin-line")}>
        <span className={cn("truncate font-mono text-[11px] font-medium", admin ? "text-admin-strong" : "text-foreground")}>--{token.name}</span>
        <span className={cn("truncate font-mono text-[11px]", admin ? "text-admin-muted" : "text-muted-foreground")}>{value}</span>
        <span className={cn("truncate text-[11px]", admin ? "text-admin-dim" : "text-muted-foreground")}>{token.use}</span>
      </div>
    </button>
  );
}

function Swatches({ tokens, admin }: { tokens: Token[]; admin?: boolean }): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {tokens.map((t) => (
        <Swatch key={t.name} token={t} admin={admin} />
      ))}
    </div>
  );
}

export function Colors(): React.ReactElement {
  return (
    <>
      <Specimen title="Page" about="The workspace's card and everything on it. Click a swatch to copy its variable.">
        <Swatches tokens={pageTokens} />
      </Specimen>
      <Specimen title="Status and Accent" about="--active follows the workspace's accent; the rest are fixed per light and dark.">
        <Swatches tokens={statusTokens} />
      </Specimen>
      <Specimen title="Sidebar Layer" about="The rail, the sub nav and the backdrop behind the cards, from the sidebar theme." canvas="admin">
        <Swatches tokens={adminTokens} admin />
      </Specimen>
      <Specimen title="Charts">
        <Swatches tokens={chartTokens} />
      </Specimen>
    </>
  );
}

const families = [
  { cls: "font-sans", name: "Sans", stack: "Cal Sans, the UI and body face" },
  { cls: "font-heading", name: "Heading", stack: "Cal Sans, titles (--font-heading)" },
  { cls: "font-mono", name: "Mono", stack: "Geist Mono, code and ids" },
];

const sizes = [
  { cls: "text-[11px]", px: 11, use: "Group labels in the rail and sub nav, swatch captions" },
  { cls: "text-xs", px: 12, use: "Descriptions, hints, badges" },
  { cls: "text-[13px]", px: 13, use: "Card titles, page titles in the title bar, dense rows" },
  { cls: "text-sm", px: 14, use: "Body text, buttons, inputs, rows" },
  { cls: "text-[15px]", px: 15, use: "The sub nav's title" },
  { cls: "text-base", px: 16, use: "Body on small screens" },
  { cls: "text-lg", px: 18, use: "Large buttons, dialog titles" },
  { cls: "text-xl", px: 20, use: "Page headings, stat values" },
  { cls: "text-2xl", px: 24, use: "Hero headings" },
  { cls: "text-3xl", px: 30, use: "Launch and welcome screens" },
];

const weights = [
  { cls: "font-normal", n: 400 },
  { cls: "font-medium", n: 500 },
  { cls: "font-semibold", n: 600 },
  { cls: "font-bold", n: 700 },
];

const sample = "Workspaces, tables and the apps that keep rows in them";

export function Typography(): React.ReactElement {
  return (
    <>
      <Specimen title="Families">
        {families.map((f) => (
          <div key={f.cls} className="flex flex-col gap-1 border-b pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-6">
            <div className="w-36 shrink-0">
              <div className="font-mono text-[11px] text-muted-foreground">{f.cls}</div>
              <div className="text-xs text-muted-foreground">{f.stack}</div>
            </div>
            <div className={cn("min-w-0 flex-1 text-2xl", f.cls)}>
              {sample}
              <div className="mt-1 text-sm text-muted-foreground">ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 &amp;@#%→⌘</div>
            </div>
          </div>
        ))}
      </Specimen>
      <Specimen title="Sizes" about="Tailwind's scale plus the in-between sizes the shell uses.">
        {sizes.map((s) => (
          <div key={s.cls} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6">
            <div className="w-36 shrink-0 font-mono text-[11px] text-muted-foreground">
              {s.cls} · {s.px}px
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn("truncate", s.cls)}>{sample}</div>
              <div className="text-[11px] text-muted-foreground">{s.use}</div>
            </div>
          </div>
        ))}
      </Specimen>
      <Specimen title="Weights">
        {weights.map((w) => (
          <div key={w.cls} className="flex items-baseline gap-6">
            <div className="w-36 shrink-0 font-mono text-[11px] text-muted-foreground">
              {w.cls} · {w.n}
            </div>
            <div className={cn("flex-1 text-lg", w.cls)}>{sample}</div>
            <div className={cn("hidden flex-1 font-mono text-sm md:block", w.cls)}>sg-ws-bcd463</div>
          </div>
        ))}
      </Specimen>
      <Specimen title="Text Colors on the Page">
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="text-foreground">text-foreground: the default</span>
          <span className="text-muted-foreground">text-muted-foreground: hints and descriptions</span>
          <span className="text-destructive-foreground">text-destructive-foreground: errors</span>
          <span className="text-warning-foreground">text-warning-foreground: warnings</span>
          <span className="text-success-foreground">text-success-foreground: done</span>
          <span className="text-info-foreground">text-info-foreground: notes</span>
          <span className="text-active">text-active: the accent</span>
        </div>
      </Specimen>
      <Specimen title="Text Colors on the Sidebar Layer" canvas="admin">
        <div className="flex flex-col gap-1.5 text-sm tracking-wide">
          <span className="font-heading text-[15px] font-semibold text-admin-strong">text-admin-strong: titles and the active row</span>
          <span className="text-admin-fg">text-admin-fg: rows</span>
          <span className="text-admin-muted">text-admin-muted: icons, secondary</span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-admin-dim">text-admin-dim: group labels</span>
          <span className="text-admin-accent">text-admin-accent: the accent</span>
        </div>
      </Specimen>
      <Specimen title="Inline">
        <p className="max-w-prose text-sm leading-relaxed">
          A paragraph with <strong className="font-semibold">strong text</strong>, <a className="underline underline-offset-4" href="#inline">a link</a>, <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[12px]">inline code</code> and a shortcut,{" "}
          <kbd className="rounded-[.25rem] bg-muted px-1 font-sans text-xs text-muted-foreground">⌘K</kbd>. Lines run no wider than <span className="font-mono text-xs">max-w-prose</span>.
        </p>
      </Specimen>
    </>
  );
}

const radii = [
  { cls: "rounded-sm", v: "--radius-sm", px: 6 },
  { cls: "rounded-md", v: "--radius-md", px: 8 },
  { cls: "rounded-lg", v: "--radius-lg", px: 10 },
  { cls: "rounded-xl", v: "--radius-xl", px: 14 },
  { cls: "rounded-2xl", v: "--radius-2xl", px: 18 },
  { cls: "rounded-full", v: "", px: 9999 },
];

const shadows = ["shadow-xs/5", "shadow-sm/5", "shadow-sm", "shadow-md", "shadow-lg", "shadow-xl"];

export function Surfaces(): React.ReactElement {
  return (
    <>
      <Specimen title="Radius" about="All from --radius (0.625rem). Rows and inputs take lg, cards xl, the workspace card and panels 2xl.">
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {radii.map((r) => (
            <div key={r.cls} className="flex flex-col items-center gap-2">
              <div className={cn("size-20 border-2 border-foreground/20 bg-muted", r.cls)} />
              <div className="text-center font-mono text-[11px] text-muted-foreground">
                {r.cls}
                <br />
                {r.px === 9999 ? "9999px" : `${r.px}px`}
              </div>
            </div>
          ))}
        </div>
      </Specimen>
      <Specimen title="Shadows" about="Mostly faint (/5); the larger ones are for popovers and dialogs.">
        <div className="grid grid-cols-2 gap-6 bg-app-bg p-6 sm:grid-cols-3 lg:grid-cols-6">
          {shadows.map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <div className={cn("size-20 rounded-xl border bg-card", s)} />
              <div className="font-mono text-[11px] text-muted-foreground">{s}</div>
            </div>
          ))}
        </div>
      </Specimen>
      <Specimen title="Borders and Focus">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-10 items-center rounded-lg border px-3 text-sm">border</div>
          <div className="flex h-10 items-center rounded-lg border border-input px-3 text-sm">border-input</div>
          <div className="flex h-10 items-center rounded-lg border border-input px-3 text-sm ring-[3px] ring-ring/24">focus: ring-ring/24</div>
          <div className="flex h-10 items-center rounded-lg border px-3 text-sm ring-2 ring-ring ring-offset-1 ring-offset-background">focus-visible: ring-2</div>
          <div className="flex h-10 items-center rounded-lg border border-destructive/36 px-3 text-sm">invalid: border-destructive/36</div>
        </div>
      </Specimen>
      <Specimen title="Layers" about="How a workspace stacks: the admin layer behind (rail, panel, raised), the page card on it, cards and popovers on the page." canvas="none">
        <div className="flex h-80 gap-2 overflow-hidden rounded-xl border border-admin-line bg-admin p-2 text-admin-fg">
          <div className="flex w-28 shrink-0 flex-col gap-1 p-2 text-xs">
            <span className="mb-1 font-mono text-[10px] text-admin-dim">bg-admin</span>
            {["Home", "Database", "Events"].map((r, i) => (
              <span key={r} className={cn("rounded-md px-2 py-1.5", i === 1 ? "bg-admin-active font-medium text-admin-strong" : "hover:bg-admin-hover")}>
                {r}
              </span>
            ))}
          </div>
          <div className="flex w-36 shrink-0 flex-col gap-2 rounded-2xl border border-admin-line bg-admin-panel p-3 text-xs max-sm:hidden">
            <span className="font-mono text-[10px] text-admin-dim">bg-admin-panel</span>
            <span className="font-heading text-sm font-semibold text-admin-strong">Database</span>
            <div className="mt-auto rounded-xl border border-admin-line bg-admin-raised p-2.5 text-admin-muted">
              <span className="font-mono text-[10px]">bg-admin-raised</span>
            </div>
          </div>
          <div className="relative flex min-w-0 flex-1 flex-col gap-3 rounded-2xl border border-admin-line bg-background p-4 text-foreground">
            <span className="font-mono text-[10px] text-muted-foreground">bg-background · rounded-2xl</span>
            <div className="rounded-xl border bg-card p-3 shadow-xs/5">
              <span className="font-mono text-[10px] text-muted-foreground">bg-card · rounded-xl · shadow-xs/5</span>
              <div className="mt-2 h-2 w-2/3 rounded-full bg-muted" />
              <div className="mt-1.5 h-2 w-1/2 rounded-full bg-muted" />
            </div>
            <div className="absolute right-6 bottom-6 w-48 rounded-lg border bg-popover p-1 text-sm shadow-lg">
              <div className="px-2 pt-1 pb-1.5 font-mono text-[10px] text-muted-foreground">bg-popover · shadow-lg</div>
              <div className="rounded-sm bg-accent px-2 py-1">Highlighted</div>
              <div className="px-2 py-1">Item</div>
            </div>
          </div>
        </div>
      </Specimen>
    </>
  );
}
