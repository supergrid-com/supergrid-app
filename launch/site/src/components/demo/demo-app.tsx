"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  CodeIcon,
  CodeXmlIcon,
  DatabaseIcon,
  LibraryIcon,
  MessagesCircleIcon,
  MessageCircleIcon,
  PanelLeftIcon,
  PlusIcon,
  SettingsIcon,
  SunMoonIcon,
  StoreIcon,
  WorkflowIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Mark, MuseGlyph } from "@/components/brand";
import { resolve, type SubNav } from "./pages";
import { CATALOG, DemoProvider, SUGGESTIONS, useDemo, type Msg } from "./state";
import { ACCENTS, PRESETS, preset, themeVars } from "./theme";
import { PageAction, Spinner, Switch, cx } from "./ui";

// The SuperGrid desktop app as a page component, after app/src/renderer/app/shell and the film's
// rebuild of it (launch/video/film/src/shell.tsx): the title bar with Live / Dev and the breadcrumb,
// the rail (Threads, Apps, Core), the second panel, the page in its card and Muse Code's panel on
// the right, all themed by the app's own theme math. Laid out at a desktop width and scaled down
// to fit anything narrower.

const DESIGN_W = 1280;
const DESIGN_H = 760;
const RAIL_W = 220;
const RAIL_MIN = 60;
const SUB_W = 212;
const CHAT_W = 364;
const CONTROLS_W = 252;

export function DemoApp({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(DESIGN_W);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const inner = Math.max(w, DESIGN_W);
  const scale = w / inner;
  return (
    <div ref={ref} className={cx("relative w-full", className)} style={{ aspectRatio: `${DESIGN_W} / ${DESIGN_H}`, maxHeight: DESIGN_H }}>
      <div className="absolute top-0 left-0 origin-top-left" style={{ width: inner, height: DESIGN_H, transform: scale < 1 ? `scale(${scale})` : undefined }}>
        <DemoProvider>
          <Window />
        </DemoProvider>
      </div>
    </div>
  );
}

function Window() {
  const d = useDemo();
  const { theme, route, railOpen, chatOpen, settings, toast } = d;
  const p = preset(theme.iface);
  const { vars, dark } = themeVars({ ...p, accent: theme.accent }, theme.sidebar ? preset(theme.sidebar) : null);
  const page = resolve(route, d);
  const railW = railOpen ? RAIL_W : RAIL_MIN;
  const subW = page.sub ? SUB_W + 8 : 0;
  return (
    <div
      className="relative flex h-full flex-col overflow-clip rounded-2xl bg-(--a-bg) text-left text-[14px] text-(--a-fg) shadow-[0_0_0_1px_rgb(255_255_255/11%),0_0_0_8px_rgb(255_255_255/2.5%),0_30px_70px_rgb(0_0_0/40%),0_60px_160px_rgb(0_0_0/35%)] transition-colors duration-300"
      style={{ ...(vars as CSSProperties), colorScheme: dark ? "dark" : "light" }}
    >
      <TitleBar crumbs={page.crumbs} canvasStart={railW + subW} />
      <div className="flex min-h-0 flex-1 pr-2 pb-2">
        <div className="shrink-0 overflow-clip transition-[width] duration-300" style={{ width: railW }}>
          <Rail />
        </div>
        <div className="shrink-0 overflow-clip transition-[width] duration-300" style={{ width: subW }}>
          {page.sub ? <SubPanel nav={page.sub} /> : null}
        </div>
        <div className="relative min-w-0 flex-1 overflow-clip rounded-xl border border-(--i-line) bg-(--i-bg) text-(--i-fg) transition-colors duration-300">
          <PageAction.Provider value={page.action}>
            <div key={route} className="demo-in h-full">
              {page.body}
            </div>
          </PageAction.Provider>
        </div>
        <div className="shrink-0 overflow-clip transition-[width] duration-300" style={{ width: chatOpen ? CHAT_W + 8 : 0 }}>
          <div className="h-full pl-2" style={{ width: CHAT_W + 8 }}>
            <Chat />
          </div>
        </div>
      </div>
      {settings ? <Settings /> : null}
      <div className={cx("pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-(--a-raised) px-4 py-2 text-[13.5px] text-(--a-strong) shadow-lg ring-1 ring-(--a-line) transition-[opacity,transform] duration-300", toast ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>{toast}</div>
    </div>
  );
}

function IconBtn({ icon: Icon, label, onClick, disabled, active }: { icon: LucideIcon; label: string; onClick?: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={cx("grid size-7 cursor-pointer place-items-center rounded-md transition-colors hover:bg-(--a-hover) disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent", active ? "text-(--a-strong)" : "text-(--a-dim)")}>
      <Icon className="size-4" />
    </button>
  );
}

function TitleBar({ crumbs, canvasStart }: { crumbs: string[]; canvasStart: number }) {
  const { back, forward, canBack, canForward, railOpen, setRailOpen, mode, setMode, chatOpen, setChatOpen, msgs, newThread, busy } = useDemo();
  return (
    <div className="flex h-11 shrink-0 items-center">
      <div className="flex shrink-0 items-center gap-1 pl-4" style={{ width: CONTROLS_W }}>
        <div className="mr-3 flex gap-2">
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} className="size-3 rounded-full" style={{ background: c }} />
          ))}
        </div>
        <IconBtn icon={ArrowLeftIcon} label="Back" onClick={back} disabled={!canBack} />
        <IconBtn icon={ArrowRightIcon} label="Forward" onClick={forward} disabled={!canForward} />
        <IconBtn icon={PanelLeftIcon} label="Toggle Sidebar" onClick={() => setRailOpen(!railOpen)} />
        <div className="ml-1.5 flex gap-0.5 rounded-[10px] bg-(--a-hover) p-[3px]">
          {(
            [
              ["live", MessagesCircleIcon, "Live"],
              ["dev", CodeXmlIcon, "Dev"],
            ] as const
          ).map(([m, Icon, label]) => (
            <button key={m} type="button" aria-label={label} title={label} onClick={() => setMode(m)} className={cx("grid h-6 w-8 cursor-pointer place-items-center rounded-[7px] transition-colors", mode === m ? "bg-(--a-raised) text-(--a-strong) shadow-sm" : "text-(--a-dim) hover:text-(--a-fg)")}>
              <Icon className="size-[15px]" />
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2 pr-2 text-[14px] transition-[padding] duration-300" style={{ paddingLeft: Math.max(0, canvasStart - CONTROLS_W) + 14 }}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {crumbs.map((c, i) => (
            <span key={i} className="flex min-w-0 items-center gap-2">
              {i ? <span className="text-(--a-dim)">/</span> : null}
              <span className={cx("truncate", i === crumbs.length - 1 ? "text-(--a-strong)" : "text-(--a-muted)")}>{c}</span>
            </span>
          ))}
        </div>
        {chatOpen ? null : (
          <button type="button" onClick={() => setChatOpen(true)} className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-(--a-line) px-2.5 text-[13px] text-(--a-strong) transition-colors hover:bg-(--a-hover)">
            <MuseGlyph className="h-2 w-4" /> Muse Code
          </button>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 overflow-clip pr-3 transition-[width] duration-300" style={{ width: chatOpen ? CHAT_W + 8 : 0 }}>
        <div className="flex min-w-0 flex-1 items-center gap-2 pl-4 text-[14px] text-(--a-strong)">
          <MuseGlyph className="h-2.5 w-5" />
          <span className="truncate">Muse Code</span>
          <span className="truncate text-[12.5px] text-(--a-dim)">over ACP</span>
        </div>
        <IconBtn icon={PlusIcon} label="New Thread" onClick={newThread} disabled={!msgs.length || busy} />
        <IconBtn icon={XIcon} label="Close Muse Code" onClick={() => setChatOpen(false)} />
      </div>
    </div>
  );
}

function RailHeader({ label, onAdd, collapsed }: { label: string; onAdd?: () => void; collapsed: boolean }) {
  if (collapsed) return <div className="mx-auto my-3 h-px w-6 bg-(--a-line)" />;
  return (
    <div className="flex items-center justify-between px-2.5 pt-4 pb-1.5 text-[11.5px] tracking-[0.08em] text-(--a-dim) uppercase">
      {label}
      {onAdd ? (
        <button type="button" onClick={onAdd} aria-label={`Add to ${label}`} className="grid size-5 cursor-pointer place-items-center rounded hover:bg-(--a-hover) hover:text-(--a-fg)">
          <PlusIcon className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function RailRow({ icon: Icon, label, active, onClick, collapsed }: { icon: LucideIcon; label: string; active?: boolean; onClick: () => void; collapsed: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cx("flex h-[34px] w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-[14px] transition-colors", collapsed && "justify-center px-0", active ? "bg-(--a-active) text-(--a-strong)" : "text-(--a-fg) hover:bg-(--a-hover)")}
    >
      <Icon className={cx("size-4 shrink-0", active ? "text-(--a-accent)" : "text-(--a-muted)")} />
      {collapsed ? null : <span className="truncate">{label}</span>}
    </button>
  );
}

function Rail() {
  const { route, go, installed, mode, railOpen, setChatOpen, setSettings, say, theme } = useDemo();
  const collapsed = !railOpen;
  const [menu, setMenu] = useState(false);
  const core: { to: string; label: string; icon: LucideIcon }[] = [
    { to: "database", label: "Database", icon: DatabaseIcon },
    { to: "workflows", label: "Workflows", icon: WorkflowIcon },
    { to: "library", label: "Library", icon: LibraryIcon },
  ];
  if (mode === "dev") core.push({ to: "code", label: "Code", icon: CodeIcon });
  const head = route.split("/")[0];
  return (
    <div className="flex h-full flex-col px-2.5 pt-1" style={{ width: collapsed ? RAIL_MIN : RAIL_W }}>
      <div className="relative">
        <button type="button" onClick={() => (collapsed ? go("home") : setMenu(!menu))} className={cx("flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg px-1.5 transition-colors hover:bg-(--a-hover)", collapsed && "justify-center")}>
          <span className="grid size-6 shrink-0 place-items-center rounded-[7px] text-[13px]" style={{ background: theme.accent, color: "#fff" }}>
            S
          </span>
          {collapsed ? null : (
            <>
              <span className="flex-1 text-left text-[15.5px] text-(--a-strong)">Studio</span>
              <ChevronsUpDownIcon className="size-3.5 text-(--a-dim)" />
            </>
          )}
        </button>
        {menu ? (
          <div className="absolute top-11 right-0 left-0 z-20 rounded-xl border border-(--a-line) bg-(--a-raised) p-1 text-[13.5px] shadow-xl">
            {[
              ["Studio", "S"],
              ["Acme Shop", "A"],
            ].map(([n, l], i) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setMenu(false);
                  if (i) say("Each workspace is its own repo and its own Worker");
                  else go("home");
                }}
                className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-(--a-fg) hover:bg-(--a-hover)"
              >
                <span className="grid size-5 place-items-center rounded-md bg-(--a-active) text-[11px]">{l}</span>
                <span className="flex-1 text-left">{n}</span>
                {i ? null : <CheckIcon className="size-3.5 text-(--a-accent)" />}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="demo-scroll min-h-0 flex-1 overflow-y-auto">
        <RailHeader label="Threads" collapsed={collapsed} onAdd={() => setChatOpen(true)} />
        {["Newsletter on every post", "Spring sale plan"].map((t) => (
          <RailRow key={t} icon={MessageCircleIcon} label={t} collapsed={collapsed} onClick={() => setChatOpen(true)} />
        ))}
        <RailHeader label="Apps" collapsed={collapsed} onAdd={() => go("store")} />
        {installed.map((id) => (
          <RailRow key={id} icon={CATALOG[id].icon} label={CATALOG[id].name} collapsed={collapsed} active={route === `apps/${id}` || route.startsWith(`apps/${id}/`)} onClick={() => go(`apps/${id}`)} />
        ))}
        <RailRow icon={StoreIcon} label="App Store" collapsed={collapsed} active={head === "store"} onClick={() => go("store")} />
        <RailHeader label="Core" collapsed={collapsed} />
        {core.map((c) => (
          <RailRow key={c.to} icon={c.icon} label={c.label} collapsed={collapsed} active={head === c.to} onClick={() => go(c.to)} />
        ))}
      </div>
      <div className={cx("flex h-12 shrink-0 items-center gap-2 border-t border-(--a-line) px-1.5 text-[14.5px] text-(--a-fg)", collapsed && "justify-center")}>
        {collapsed ? (
          <IconBtn icon={SettingsIcon} label="Settings" onClick={() => setSettings(true)} />
        ) : (
          <>
            <Mark size={15} mono className="text-(--a-muted)" />
            <span className="flex-1">SuperGrid</span>
            <IconBtn icon={SunMoonIcon} label="Appearance" onClick={() => setSettings(true)} />
          </>
        )}
      </div>
    </div>
  );
}

function SubPanel({ nav }: { nav: SubNav }) {
  const { route, go } = useDemo();
  // the item whose address is the longest match for where we are
  const all = nav.groups.flatMap((g) => g.items);
  const hit = all.filter((i) => route === i.to || route.startsWith(`${i.to}/`)).sort((a, b) => b.to.length - a.to.length)[0];
  return (
    <div className="demo-scroll h-full overflow-y-auto rounded-xl border border-(--a-line) bg-(--a-panel) px-2 py-3" style={{ width: SUB_W }}>
      <div className="px-2.5 pt-0.5 pb-2 text-[15px] text-(--a-strong)">{nav.title}</div>
      {nav.groups.map((g, gi) => (
        <div key={gi}>
          {g.label ? <div className="px-2.5 pt-3 pb-1.5 text-[11.5px] tracking-[0.08em] text-(--a-dim) uppercase">{g.label}</div> : gi ? <div className="mx-2.5 my-2 h-px bg-(--a-line)" /> : null}
          {g.items.map((it) => {
            const on = it === hit || (!hit && it === all[0]);
            const Icon = it.icon;
            return (
              <button key={it.to + it.label} type="button" onClick={() => go(it.to)} className={cx("flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-[13.5px] transition-colors", on ? "bg-(--a-active) text-(--a-strong)" : "text-(--a-fg) hover:bg-(--a-hover)")}>
                {Icon ? <Icon className={cx("size-[15px] shrink-0", on ? "text-(--a-accent)" : "text-(--a-muted)")} /> : null}
                <span className={cx("flex-1 truncate", nav.title === "Database" && g.label === "Tables" && "font-mono text-[12.5px]")}>{it.label}</span>
                {it.meta ? <span className="text-[12px] text-(--a-dim)">{it.meta}</span> : null}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ---- Muse Code ----

function Chat() {
  const { msgs, busy, ask } = useDemo();
  const [draft, setDraft] = useState("");
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs]);
  const send = (t: string) => {
    if (busy || !t.trim()) return;
    ask(t.trim());
    setDraft("");
  };
  return (
    <div className="flex h-full flex-col overflow-clip rounded-xl border border-(--a-line) bg-(--a-panel)" style={{ width: CHAT_W }}>
      <div ref={list} className="demo-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-4 pb-2">
        {msgs.length ? null : (
          <div className="m-auto max-w-[220px] text-center">
            <MuseGlyph className="mx-auto h-5 w-10" />
            <p className="mt-3 text-[13.5px] text-(--a-muted)">Ask or build in Studio. Muse Code can use every app&apos;s tools</p>
          </div>
        )}
        {msgs.map((m) => (m.role === "user" ? <UserMsg key={m.id} text={m.text!} /> : <AgentMsg key={m.id} m={m} />))}
      </div>
      {busy ? null : (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {SUGGESTIONS.filter((s) => !msgs.some((m) => m.text === s)).map((s) => (
            <button key={s} type="button" onClick={() => send(s)} className="cursor-pointer rounded-full border border-(--a-line) px-2.5 py-1 text-[12.5px] text-(--a-fg) transition-colors hover:border-(--a-accent) hover:text-(--a-strong)">
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="m-2 mt-0 flex flex-col rounded-2xl border border-(--a-line) bg-(--a-raised) px-3.5 pt-3 pb-2.5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
          rows={2}
          placeholder="Ask or build in Studio"
          className="w-full resize-none bg-transparent text-[14px] leading-snug text-(--a-strong) outline-none placeholder:text-(--a-dim)"
        />
        <div className="mt-1 flex items-center gap-2 text-[12.5px] text-(--a-muted)">
          <PlusIcon className="size-4" />
          <span className="flex-1" />
          <MuseGlyph className="h-2 w-4" />
          <span className="text-(--a-fg)">Muse Spark 1.3</span>
          <span>Extra High</span>
          <button type="button" aria-label="Send" onClick={() => send(draft)} className={cx("grid size-7 cursor-pointer place-items-center rounded-full transition-colors", draft.trim() && !busy ? "bg-(--a-accent) text-(--a-on-accent)" : "bg-(--a-active) text-(--a-dim)")}>
            {busy ? <Spinner className="size-3" /> : <ArrowUpIcon className="size-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function UserMsg({ text }: { text: string }) {
  return <div className="demo-in max-w-[88%] self-end rounded-2xl border border-(--a-line) bg-(--a-raised) px-3.5 py-2 text-[13.5px] leading-snug text-(--a-strong)">{text}</div>;
}

function AgentMsg({ m }: { m: Msg }) {
  return (
    <div className="demo-in flex flex-col gap-2">
      {m.tools?.map((t, i) => (
        <div key={i} className="demo-in flex items-center gap-2.5 rounded-lg border border-(--a-line) bg-(--a-bg) px-3 py-2 text-[13px]">
          <CodeIcon className="size-3.5 shrink-0 text-(--a-muted)" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-(--a-fg)">{t.label}</div>
            {t.detail ? <div className="truncate text-[12px] text-(--a-dim)">{t.detail}</div> : null}
          </div>
          {t.state === "done" ? <CheckIcon className="size-3.5 shrink-0 text-emerald-400" /> : <Spinner className="size-3 text-[#5b9dff]" />}
        </div>
      ))}
      {m.text ? <p className="demo-in text-[13.5px] leading-relaxed text-(--a-fg)">{m.text}</p> : m.tools?.length ? null : <Spinner className="size-3 text-[#5b9dff]" />}
    </div>
  );
}

// ---- Settings: the appearance pane ----

function Settings() {
  const { theme, setTheme, setSettings } = useDemo();
  return (
    <div className="demo-fade absolute inset-0 z-30 grid place-items-center bg-black/45" onClick={() => setSettings(false)}>
      <div onClick={(e) => e.stopPropagation()} className="demo-in flex h-[560px] w-[820px] overflow-clip rounded-2xl border border-(--i-line) bg-(--i-bg) text-(--i-fg) shadow-2xl">
        <div className="w-48 shrink-0 border-r border-(--i-line) bg-(--a-panel) p-3 text-[13.5px]">
          <div className="px-2 pt-1 pb-2 text-[11.5px] tracking-[0.08em] text-(--a-dim) uppercase">Workspace</div>
          {["General", "Domain & Sitemap", "Updates"].map((x) => (
            <div key={x} className="flex h-8 items-center rounded-lg px-2 text-(--a-fg)">
              {x}
            </div>
          ))}
          <div className="px-2 pt-4 pb-2 text-[11.5px] tracking-[0.08em] text-(--a-dim) uppercase">Organization</div>
          {["Workspaces", "Apps", "Cloudflare", "Appearance"].map((x) => (
            <div key={x} className={cx("flex h-8 items-center rounded-lg px-2", x === "Appearance" ? "bg-(--a-active) text-(--a-strong)" : "text-(--a-fg)")}>
              {x}
            </div>
          ))}
        </div>
        <div className="demo-scroll min-w-0 flex-1 overflow-y-auto p-6">
          <div className="flex items-center">
            <h3 className="flex-1 text-[20px] text-(--i-strong)">Appearance</h3>
            <button type="button" aria-label="Close" onClick={() => setSettings(false)} className="grid size-8 cursor-pointer place-items-center rounded-lg text-(--i-muted) hover:bg-(--i-fill)">
              <XIcon className="size-4" />
            </button>
          </div>
          <Section title="Interface Theme">
            <div className="grid grid-cols-3 gap-2.5">
              {PRESETS.map((p) => (
                <ThemeCard key={p.id} id={p.id} on={theme.iface === p.id} onClick={() => setTheme({ iface: p.id, accent: p.id === "midnight" ? p.accent : theme.accent === "#7c8cf8" ? "#e8604a" : theme.accent })} />
              ))}
            </div>
          </Section>
          <Section title="Sidebar Theme" aside={<label className="flex items-center gap-2 text-[13px] text-(--i-muted)">Match Interface <Switch on={!theme.sidebar} onChange={(v) => setTheme({ sidebar: v ? null : "graphite" })} /></label>}>
            <div className={cx("grid grid-cols-3 gap-2.5 transition-opacity", !theme.sidebar && "pointer-events-none opacity-40")}>
              {PRESETS.map((p) => (
                <ThemeCard key={p.id} id={p.id} on={theme.sidebar === p.id} onClick={() => setTheme({ sidebar: p.id })} />
              ))}
            </div>
          </Section>
          <Section title="Accent">
            <div className="flex gap-2.5">
              {ACCENTS.map((c) => (
                <button key={c} type="button" aria-label={c} onClick={() => setTheme({ accent: c })} className={cx("size-7 cursor-pointer rounded-full ring-offset-2 ring-offset-(--i-bg) transition-shadow", theme.accent === c && "ring-2 ring-(--i-strong)")} style={{ background: c }} />
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center">
        <div className="flex-1 text-[14.5px] text-(--i-strong)">{title}</div>
        {aside}
      </div>
      {children}
    </div>
  );
}

/** A preset drawn small: its rail, its page and its accent. */
function ThemeCard({ id, on, onClick }: { id: string; on: boolean; onClick: () => void }) {
  const p = preset(id);
  const { vars } = themeVars(p, null);
  return (
    <button type="button" onClick={onClick} className={cx("cursor-pointer overflow-clip rounded-xl border text-left transition-colors", on ? "border-(--i-accent) ring-1 ring-(--i-accent)" : "border-(--i-line) hover:border-(--i-input)")}>
      <div className="flex h-16 gap-1.5 p-2" style={{ background: vars["--a-bg"] }}>
        <div className="flex w-8 flex-col gap-1 pt-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1.5 rounded-full" style={{ background: i === 0 ? p.accent : vars["--a-line"] }} />
          ))}
        </div>
        <div className="flex-1 rounded-md p-1.5" style={{ background: vars["--i-bg"], border: `1px solid ${vars["--i-line"]}` }}>
          <span className="block h-1.5 w-8 rounded-full" style={{ background: vars["--i-fg"] }} />
          <span className="mt-1 block h-1.5 w-12 rounded-full" style={{ background: vars["--i-line"] }} />
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-(--i-line) px-2.5 py-1.5 text-[13px] text-(--i-strong)">
        <span className="flex-1">{p.name}</span>
        {on ? <CheckIcon className="size-3.5 text-(--i-accent)" /> : null}
      </div>
    </button>
  );
}
