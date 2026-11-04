import { ActivityIcon, BarChart3Icon, CheckIcon, CloudIcon, CodeIcon, DatabaseIcon, FileCodeIcon, FileIcon, FileSearchIcon, FolderIcon, FolderOpenIcon, GitBranchIcon, GitMergeIcon, ImageIcon, LayoutTemplateIcon, MailIcon, NewspaperIcon, PenLineIcon, PlusIcon, RefreshCwIcon, RocketIcon, ServerIcon, ShieldCheckIcon, SparklesIcon, SquarePlusIcon, TextCursorInputIcon, UsersIcon, WorkflowIcon, WrenchIcon, XIcon, type LucideIcon } from "lucide-react";
import * as React from "react";
import { Appear, C, Cursor, FONT, L, MONO, Mark, MuseGlyph, Scene, Sub, Swap, Title, Typed, center, prog, useT } from "../kit";
import { Cross, SCROLL, pageShift, scrollOn, scrolls } from "../look";
import { Button, ChatPanel, PageHeader, Spinner, SubNav, Tag, ToolRow, UserMsg, WIN_H, WIN_W, Window, type RailKey, type RailState, type SubItem } from "../shell";
import { beats, cue, say } from "../timeline";

// The reveal on the dark card, which then scrolls away to leave the app on the plain white page:
// one long shot of it, nearly the whole frame, from setup to Muse merging an update and asking before
// it ships. No captions; the app shows what each step is. The window stays put, wide, drawn up like the site's
// hero shot with the glow behind it; pages crossfade inside it and its panels slide in and out. One
// short caption above it says what each step is. Every state is picked from the time.

// the window across the frame with a 60px margin either side, centred
const SCALE = (1920 - 120) / WIN_W;
const TOP = 540 - (WIN_H * SCALE) / 2;

/** The window, whole and still, riding in with the page. */
function Product({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div style={{ position: "absolute", left: 960 - WIN_W / 2, top: TOP, width: WIN_W, height: WIN_H, transformOrigin: "50% 0", transform: `scale(${SCALE})` }}>{children}</div>;
}

export function Reveal(): React.ReactElement {
  const t = useT();
  const s = beats.reveal;
  // the mark builds one diamond at a time inside its construction lines, which clear once it's whole
  const build = [0, 1, 2, 3].map((i) => prog(t, s + 0.25 + i * 0.14, 0.9));
  const lines = prog(t, s + 0.1, 1.0, "inOut") * (1 - prog(t, s + 1.6, 0.8, "inOut"));
  const R = 150;
  // the three reasons people clone, answered one by one under the name
  const owns = [
    { icon: <GitBranchIcon style={{ width: 30, height: 30, color: "#fff", strokeWidth: 1.6 }} />, label: "Your own repo", at: say(28, "own repo", -0.2) },
    { icon: <CloudIcon style={{ width: 30, height: 30, color: "#f6821f", strokeWidth: 1.6 }} />, label: "Your Cloudflare", at: say(28, "cloudflare", -0.2) },
    { icon: <MuseGlyph size={36} />, label: "Your own AI", at: say(28, "built by", -0.2) },
  ];
  const lift = prog(t, owns[0]!.at - 0.35, 0.9, "inOut");
  return (
    <Scene from={s} to={scrolls.app + SCROLL} fadeOut={0.01} dark>
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{ ...center, gap: 36, transform: `translateY(${-lift * 130}px) scale(${1 - lift * 0.08})` }}>
          <div style={{ position: "relative", width: 170, height: 170 }}>
            {lines > 0 ? (
              <div style={{ position: "absolute", left: 85, top: 85, width: 0, height: 0, opacity: lines }}>
                <div style={{ position: "absolute", left: -R, top: -R, width: R * 2, height: R * 2, borderRadius: 999, border: "1px dashed rgb(255 255 255 / 16%)", transform: `scale(${0.85 + 0.15 * lines}) rotate(${lines * 30}deg)` }} />
                {[45, -45, 0, 90].map((a) => (
                  <div key={a} style={{ position: "absolute", left: -R * 1.5, top: 0, width: R * 3, height: 1, background: "linear-gradient(to right, transparent, rgb(255 255 255 / 14%) 30%, rgb(255 255 255 / 14%) 70%, transparent)", transform: `rotate(${a}deg) scaleX(${lines})` }} />
                ))}
                {[
                  [0, -R],
                  [R, 0],
                  [0, R],
                  [-R, 0],
                ].map(([x, y], i) => (
                  <Cross key={i} x={x!} y={y!} size={18} dark k={lines} />
                ))}
              </div>
            ) : null}
            <Mark size={170} build={build} style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 0 28px rgb(155 61 255 / 35%))" }} />
          </div>
          <Appear at={say(28, "supergrid", -0.1)} y={24}>
            <Title size={136} dark style={{ textShadow: "0 0 60px rgb(255 255 255 / 22%)" }}>SuperGrid</Title>
          </Appear>
          <Appear at={say(28, "desktop", -0.15)} y={16}>
            <Sub size={42} dark>The desktop IDE for your site and the tools behind it</Sub>
          </Appear>
        </div>
        {/* a hairline strip, like the site's tile grids, drawn on the dark */}
        <div style={{ position: "absolute", left: 960 - 570, top: 700, width: 1140, height: 168, display: "flex", borderRadius: 24, boxShadow: `inset 0 0 0 1px rgb(255 255 255 / ${Math.round(12 * lift)}%)`, background: `rgb(255 255 255 / ${(3 * lift).toFixed(1)}%)` }}>
          {owns.map((o, i) => (
            <div key={o.label} style={{ flex: 1, borderLeft: i ? `1px solid rgb(255 255 255 / ${Math.round(12 * lift)}%)` : undefined }}>
              <Appear at={o.at} y={18} style={{ height: "100%", padding: "26px 30px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", height: 36 }}>{o.icon}</div>
                <div style={{ fontSize: 36, letterSpacing: "0.02em", color: "#fff" }}>{o.label}</div>
              </Appear>
            </div>
          ))}
        </div>
      </div>
    </Scene>
  );
}

// ---- the onboarding, before there is a workspace ----

function Steps({ step }: { step: number }): React.ReactElement {
  const names = ["Agent", "Cloudflare", "Workspace"];
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 26 }}>
      {names.map((n, i) => (
        <div key={n} style={{ flex: 1 }}>
          <div style={{ height: 4, borderRadius: 2, background: i < step ? C.success : i === step ? C.accent : C.active }} />
          <div style={{ marginTop: 10, fontSize: 13.5, color: i === step ? C.strong : C.muted, display: "flex", alignItems: "center", gap: 6 }}>
            {i < step ? <CheckIcon style={{ width: 13, height: 13, color: C.success }} /> : null}
            {n}
          </div>
        </div>
      ))}
    </div>
  );
}

function OptionRow({ icon, name, note, state, meta }: { icon: React.ReactNode; name: string; note: React.ReactNode; state: "idle" | "selected" | "done"; meta?: boolean }): React.ReactElement {
  const ring = state === "idle" ? C.line : state === "done" ? "rgb(52 211 153 / 40%)" : meta ? "rgb(59 140 255 / 60%)" : "rgb(232 97 74 / 55%)";
  const fill = state === "done" ? C.successSoft : state === "selected" ? (meta ? C.metaSoft : C.accentSoft) : C.card;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 12, border: `1px solid ${ring}`, background: fill }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: C.raised, display: "grid", placeItems: "center" }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, color: C.strong }}>{name}</div>
        <div style={{ fontSize: 13.5, color: C.muted, marginTop: 2 }}>{note}</div>
      </div>
      {state === "done" ? <CheckIcon style={{ width: 18, height: 18, color: C.success }} /> : null}
    </div>
  );
}

/** One onboarding step's body, crossfading to the next. */
function StepBody({ at, until, children }: { at: number; until?: number; children: React.ReactNode }): React.ReactElement | null {
  const t = useT();
  const p = prog(t, at, 0.45);
  const q = until === undefined ? 0 : prog(t, until - 0.3, 0.3, "inOut");
  if (t < at - 0.01 && at > 0) return null;
  if (q >= 1) return null;
  return <div style={{ position: q > 0 ? "absolute" : "relative", inset: 0, opacity: (at > 0 ? p : 1) * (1 - q), transform: `translateX(${(1 - p) * 24 - q * 24}px)` }}>{children}</div>;
}

function Onboarding({ t }: { t: number }): React.ReactElement {
  const step = t < cue(30) ? 0 : t < cue(31) ? 1 : 2;
  const museDone = t >= cue(29, 1.7);
  const cfDone = t >= cue(30, 1.9);
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      <div style={{ width: 560, background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 30, transform: "scale(1.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <Mark size={18} color={C.accent} />
          <span style={{ fontSize: 15, color: C.muted }}>Set up SuperGrid</span>
        </div>
        <Steps step={step} />
        <div style={{ position: "relative", minHeight: 320 }}>
          <StepBody at={0} until={cue(30)}>
            <div style={{ fontSize: 24, color: C.strong }}>Connect your agent</div>
            <div style={{ fontSize: 14.5, color: C.muted, margin: "6px 0 20px" }}>SuperGrid runs the agent you already pay for</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <OptionRow meta icon={<MuseGlyph size={26} />} name="Muse Code" note={museDone ? "Connected over ACP · Muse Spark 1.3" : "By Meta, over ACP"} state={museDone ? "done" : t >= cue(29, 0.9) ? "selected" : "idle"} />
              <OptionRow icon={<SparklesIcon style={{ width: 18, height: 18, color: C.muted }} />} name="Other ACP agents" note="Any agent that speaks ACP" state="idle" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 22 }}>
              <Button primary>{museDone ? "Continue" : "Connect"}</Button>
            </div>
          </StepBody>
          <StepBody at={cue(30)} until={cue(31)}>
            <div style={{ fontSize: 24, color: C.strong }}>Connect Cloudflare</div>
            <div style={{ fontSize: 14.5, color: C.muted, margin: "6px 0 20px" }}>Every workspace deploys to your own account</div>
            <OptionRow icon={<CloudIcon style={{ width: 19, height: 19, color: "#f6821f" }} />} name="Nodo" note={<span style={{ fontFamily: MONO, fontSize: 12.5 }}>fc84d234400f2316c52025fe91ed528</span>} state={cfDone ? "done" : "selected"} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16, minHeight: 30 }}>
              {["Workers", "D1", "R2", "Queues", "Workflows", "Images", "Stream"].map((r, i) => (
                <Appear key={r} at={say(30, "everything", -0.1) + i * 0.08} y={6}>
                  <span style={{ fontSize: 13, padding: "5px 10px", borderRadius: 99, border: `1px solid ${C.line}`, color: C.fg }}>{r}</span>
                </Appear>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 22 }}>
              <Button primary>{cfDone ? "Continue" : "Use this account"}</Button>
            </div>
          </StepBody>
          <StepBody at={cue(31)}>
            <div style={{ fontSize: 24, color: C.strong }}>Create the first workspace</div>
            <div style={{ fontSize: 14.5, color: C.muted, margin: "6px 0 20px" }}>Its own repo, its own Worker</div>
            <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 8 }}>Name</div>
            <div style={{ height: 44, borderRadius: 10, border: `1px solid rgb(232 97 74 / 55%)`, padding: "0 14px", display: "flex", alignItems: "center", fontSize: 17, color: C.strong }}>
              <Typed text="Studio" at={cue(31, 0.05)} cps={14} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 22 }}>
              <Button primary>Create Workspace</Button>
            </div>
          </StepBody>
        </div>
      </div>
    </div>
  );
}

// ---- workspace pages ----

type Node = { name: string; depth: number; dir?: boolean; open?: boolean; lit?: number; appear?: number; icon?: LucideIcon };

function FileTree({ nodes }: { nodes: Node[] }): React.ReactElement {
  return (
    <div style={{ padding: "6px 10px", fontSize: 14 }}>
      {nodes.map((n, i) => {
        const Icon = n.icon ?? (n.dir ? (n.open ? FolderOpenIcon : FolderIcon) : FileIcon);
        const lit = n.lit ?? 0;
        const a = n.appear ?? 1;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, height: 30, paddingLeft: 10 + n.depth * 18, borderRadius: 7, background: `rgb(232 97 74 / ${(lit * 18).toFixed(1)}%)`, color: lit > 0.5 ? C.strong : C.fg, opacity: a, transform: `translateX(${(1 - a) * -10}px)` }}>
            <Icon style={{ width: 15, height: 15, color: lit > 0.3 ? C.accent : n.dir ? C.muted : C.dim }} />
            <span style={{ flex: 1 }}>{n.name}</span>
          </div>
        );
      })}
    </div>
  );
}

function Code({ lines, style }: { lines: string[]; style?: React.CSSProperties }): React.ReactElement {
  return (
    <div style={{ fontFamily: MONO, fontSize: 14, lineHeight: 1.75, padding: "16px 22px", color: C.fg, ...style }}>
      {lines.map((l, i) => (
        <div key={i} style={{ display: "flex", gap: 18, whiteSpace: "pre" }}>
          <span style={{ width: 18, textAlign: "right", color: C.dim }}>{i + 1}</span>
          <span>{l}</span>
        </div>
      ))}
    </div>
  );
}

function RepoPage({ t, from }: { t: number; from: number }): React.ReactElement {
  const nodes: Node[] = [
    { name: "apps", depth: 0, dir: true, open: true },
    { name: "notes", depth: 1, dir: true },
    { name: "site", depth: 1, dir: true },
    { name: "ad-designer", depth: 1, dir: true },
    { name: "core", depth: 0, dir: true },
    { name: "worker", depth: 0, dir: true },
    { name: "supergrid.json", depth: 0, icon: FileCodeIcon },
    { name: "package.json", depth: 0, icon: FileCodeIcon },
    { name: "README.md", depth: 0 },
  ];
  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ width: 300, borderRight: `1px solid ${C.lineSoft}` }}>
        <div style={{ padding: "18px 20px 8px", display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.muted }}>
          <GitBranchIcon style={{ width: 15, height: 15 }} /> main
        </div>
        <FileTree nodes={nodes.map((n, i) => ({ ...n, appear: prog(t, from + 0.2 + i * 0.06, 0.5) }))} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ padding: "18px 22px 8px", fontSize: 14, color: C.muted }}>supergrid.json</div>
        <Code lines={["{", '  "workspace": "studio",', '  "worker": "sg-ws-studio",', '  "apps": ["notes", "site", "ad-designer"],', '  "database": "d1",', '  "queues": ["events"]', "}"]} />
      </div>
    </div>
  );
}

function CoreTile({ icon: Icon, title, lit, children, style }: { icon: LucideIcon; title: string; lit: number; children: React.ReactNode; style?: React.CSSProperties }): React.ReactElement {
  return (
    <div style={{ ...style, borderRadius: 12, border: `1px solid ${lit > 0.02 ? `rgb(232 97 74 / ${Math.round(10 + lit * 55)}%)` : C.line}`, background: C.card, padding: 18, display: "flex", flexDirection: "column", gap: 12, boxShadow: lit > 0.02 ? `0 0 ${30 * lit}px rgb(232 97 74 / ${Math.round(lit * 20)}%)` : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, color: C.strong }}>
        <Icon style={{ width: 17, height: 17, color: lit > 0.4 ? C.accent : C.muted }} />
        {title}
      </div>
      <div style={{ flex: 1, position: "relative" }}>{children}</div>
    </div>
  );
}

function HomePage({ t }: { t: number }): React.ReactElement {
  const word = (w: string) => prog(t, say(31, w, -0.05), 0.4) * (1 - prog(t, cue(32, -0.3), 0.5));
  const rows = (labels: [string, string][]) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
      {labels.map(([a, b]) => (
        <div key={a} style={{ display: "flex", color: C.fg }}>
          <span style={{ flex: 1 }}>{a}</span>
          <span style={{ color: C.dim }}>{b}</span>
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title="Studio" action={<Tag>sg-ws-studio.workers.dev</Tag>} />
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 14, padding: "4px 24px 24px" }}>
        <CoreTile icon={DatabaseIcon} title="Database" lit={word("database")}>
          {rows([["contacts", "D1"], ["notes", "D1"], ["pages", "D1"], ["events", "D1"]])}
        </CoreTile>
        <CoreTile icon={ActivityIcon} title="Events" lit={word("events")}>
          {rows([["contact.created", "now"], ["note.updated", "2m"], ["page.published", "9m"], ["form.submitted", "1h"]])}
        </CoreTile>
        <CoreTile icon={WorkflowIcon} title="Workflows" lit={word("workflows")}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
            {["form.submitted", "Tag", "Email"].map((s, i) => (
              <React.Fragment key={s}>
                {i ? <div style={{ width: 16, height: 1, background: C.line }} /> : null}
                <span style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.line}`, color: C.fg }}>{s}</span>
              </React.Fragment>
            ))}
          </div>
        </CoreTile>
        <CoreTile icon={BarChart3Icon} title="Analytics" lit={word("analytics")}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: 6 }}>
            {Array.from({ length: 16 }, (_, i) => (
              <div key={i} style={{ flex: 1, height: `${30 + 60 * Math.abs(Math.sin(i * 0.9 + 1))}%`, background: i === 15 ? C.accent : "#2a2a2a", borderRadius: 3 }} />
            ))}
          </div>
        </CoreTile>
        <CoreTile icon={ImageIcon} title="Media Library" lit={word("media library")} style={{ gridColumn: "span 2" }}>
          <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
            {["#3b2a24", "#24303b", "#2e3b24", "#3b243a", "#3b3524", "#243b38", "#30243b"].map((c, i) => (
              <div key={i} style={{ borderRadius: 8, background: `linear-gradient(135deg, ${c}, #161616)`, border: `1px solid ${C.lineSoft}` }} />
            ))}
          </div>
        </CoreTile>
      </div>
    </div>
  );
}

const STORE: { name: string; by: string; icon: LucideIcon; price: string; kind: string }[] = [
  { name: "Blog", by: "Lena Ortiz", icon: NewspaperIcon, price: "Free", kind: "Site" },
  { name: "Forms", by: "Paper Labs", icon: TextCursorInputIcon, price: "Free", kind: "Site" },
  { name: "Landing Pages", by: "Theo Marsh", icon: LayoutTemplateIcon, price: "Paid", kind: "Site" },
  { name: "Newsletter", by: "Ivy Chen", icon: MailIcon, price: "Free", kind: "Admin" },
  { name: "Bookings", by: "Ola Berg", icon: UsersIcon, price: "Paid", kind: "Site" },
  { name: "Invoices", by: "Mara Quinn", icon: FileIcon, price: "Paid", kind: "Admin" },
];

const INSTALL = () => say(33, "install", 0.35);
const INSTALLED = () => INSTALL() + 0.9;
// the update: the click that hits the edited copy, Muse's way out, the merge, and the approval
const UPDATE_CLICK = () => cue(41, -0.35);
const MERGE_CLICK = () => cue(43, 0.9);
const MERGED = () => say(44, "because", 0.2);
const APPROVE = () => say(45, "approval", 0.25);
const DONE = () => APPROVE() + 0.25;

function StorePage({ t }: { t: number }): React.ReactElement {
  const installed = t >= INSTALLED();
  const installing = t >= INSTALL() && !installed;
  return (
    <div style={{ height: "100%" }}>
      <PageHeader title="Apps">
        <div style={{ display: "flex", gap: 4, marginLeft: 16, fontSize: 14 }}>
          {["Store", "Installed", "Build"].map((x, i) => (
            <span key={x} style={{ padding: "5px 12px", borderRadius: 8, background: i === 0 ? C.active : "transparent", color: i === 0 ? C.strong : C.muted }}>{x}</span>
          ))}
        </div>
      </PageHeader>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, padding: "6px 24px" }}>
        {STORE.map((a, i) => {
          const Icon = a.icon;
          const blog = a.name === "Blog";
          const hot = blog ? prog(t, say(33, "install", -0.3), 0.5) : 0;
          return (
            <Appear key={a.name} at={cue(32, 0.25) + i * 0.06} y={14}>
              <div style={{ borderRadius: 12, border: `1px solid ${hot > 0 ? `rgb(232 97 74 / ${Math.round(10 + hot * 45)}%)` : C.line}`, background: C.card, padding: 18, height: 150, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: C.raised, display: "grid", placeItems: "center" }}>
                    <Icon style={{ width: 19, height: 19, color: C.fg }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, color: C.strong }}>{a.name}</div>
                    <div style={{ fontSize: 13, color: C.muted }}>by {a.by}</div>
                  </div>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.dim }}>
                  <span>{a.kind}</span>·<span>{a.price}</span>
                  <div style={{ flex: 1 }} />
                  {blog && installed ? (
                    <Button style={{ height: 30, color: C.success }}>
                      <CheckIcon style={{ width: 14, height: 14 }} /> Installed
                    </Button>
                  ) : (
                    <Button primary={blog} style={{ height: 30 }}>
                      {blog && installing ? <Spinner /> : null}
                      {blog && installing ? "Installing" : "Install"}
                    </Button>
                  )}
                </div>
              </div>
            </Appear>
          );
        })}
      </div>
    </div>
  );
}

function InstallDiffPage({ t }: { t: number }): React.ReactElement {
  const start = cue(34, 0.2);
  const files = ["apps/blog/manifest.json", "apps/blog/schema.sql", "apps/blog/components/post-card.tsx", "apps/blog/pages/[slug].tsx", "apps/blog/routes.ts", "apps/blog/worker/index.ts", "apps/blog/admin/posts.tsx", "apps/blog/mcp/tools.ts"];
  return (
    <div style={{ height: "100%" }}>
      <PageHeader title="Git" action={<Tag tone="success">Merged into main</Tag>} />
      <div style={{ margin: "0 24px", border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", background: C.card, borderBottom: `1px solid ${C.lineSoft}`, display: "flex", alignItems: "center", gap: 12 }}>
          <GitBranchIcon style={{ width: 16, height: 16, color: C.accent }} />
          <span style={{ fontSize: 16, color: C.strong }}>Install Blog 1.0.0 from Lena Ortiz</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: MONO, fontSize: 13, color: C.dim }}>3f9c2a1</span>
        </div>
        {files.map((f, i) => {
          const a = prog(t, start + i * 0.12, 0.45);
          return (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 12, height: 40, padding: "0 18px", borderTop: i ? `1px solid ${C.lineSoft}` : undefined, opacity: a, transform: `translateX(${(1 - a) * -12}px)`, fontFamily: MONO, fontSize: 13.5, color: C.fg }}>
              <span style={{ color: C.success }}>+</span>
              <span style={{ flex: 1 }}>{f}</span>
              <span style={{ color: C.success, fontSize: 12.5 }}>new</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdDesigner({ t }: { t: number }): React.ReactElement {
  const ads = [
    { bg: "linear-gradient(160deg,#f6b26b,#e8614a 60%,#7a2b1f)", head: "Spring Sale", sub: "Everything 20% off" },
    { bg: "linear-gradient(160deg,#1f2a44,#3c5a99 60%,#a6c0ff)", head: "New Season", sub: "Shop the drop" },
    { bg: "linear-gradient(160deg,#16302b,#2f7a62 60%,#bfe8c9)", head: "Fresh Picks", sub: "Made for spring" },
    { bg: "linear-gradient(160deg,#2b1630,#8a3c9e 60%,#f0b5ff)", head: "This Weekend", sub: "Doors open at 10" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="Ad Designer"
        action={
          <Tag tone="meta">
            <MuseGlyph size={18} /> Muse Image
          </Tag>
        }
      />
      <div style={{ margin: "0 24px 16px", height: 48, borderRadius: 10, border: `1px solid ${C.line}`, background: C.card, display: "flex", alignItems: "center", padding: "0 16px", fontSize: 15.5, color: C.strong }}>
        <Typed text="Spring sale for the shop, warm light, square" at={cue(35, 0.0)} cps={40} color={C.meta} />
      </div>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, padding: "0 24px 24px" }}>
        {ads.map((a, i) => {
          const p = prog(t, cue(35, 1.1) + i * 0.15, 0.9);
          return (
            <div key={i} style={{ borderRadius: 12, border: `1px solid ${C.line}`, overflow: "hidden", position: "relative", background: C.card }}>
              <div style={{ position: "absolute", inset: 0, background: a.bg, opacity: p, filter: p < 1 ? `blur(${(1 - p) * 24}px)` : undefined, transform: `scale(${1.08 - 0.08 * p})` }} />
              <div style={{ position: "absolute", left: 20, right: 20, bottom: 22, opacity: prog(t, cue(35, 1.5) + i * 0.15, 0.6) }}>
                <div style={{ fontSize: 30, color: "#fff", lineHeight: 1.05 }}>{a.head}</div>
                <div style={{ fontSize: 15, color: "rgb(255 255 255 / 80%)", marginTop: 6 }}>{a.sub}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SitePreview({ url, children }: { url: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{ height: "100%", borderRadius: 12, background: "#fff", overflow: "hidden", fontFamily: FONT, color: L.ink }}>
      <div style={{ height: 36, background: L.soft, display: "flex", alignItems: "center", gap: 7, padding: "0 12px" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 9, height: 9, borderRadius: 99, background: "#d9d9de" }} />
        ))}
        <div style={{ flex: 1, marginLeft: 8, height: 22, borderRadius: 6, background: "#fff", fontSize: 12.5, color: L.muted, display: "flex", alignItems: "center", padding: "0 10px" }}>{url}</div>
      </div>
      <div style={{ padding: 26 }}>{children}</div>
    </div>
  );
}

function SitePage(): React.ReactElement {
  const line = (w: string) => <div style={{ height: 9, width: w, borderRadius: 5, background: "#e8e8ed", marginTop: 10 }} />;
  const at = [say(36, "blog", -0.25), say(36, "forms", -0.25), say(36, "landing", -0.25)];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title="Pages" action={<Tag>studio.com</Tag>} />
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, padding: "4px 24px 24px" }}>
        <Appear at={at[0]!} y={30}>
          <SitePreview url="studio.com/blog">
            <div style={{ fontSize: 14, color: L.accent }}>Blog</div>
            <div style={{ fontSize: 30, marginTop: 8, lineHeight: 1.1 }}>What we learned shipping v2</div>
            {line("92%")}
            {line("80%")}
            {line("86%")}
            <div style={{ height: 200, borderRadius: 12, marginTop: 22, background: "linear-gradient(135deg,#f3c6b8,#e8614a)" }} />
            {line("90%")}
            {line("70%")}
          </SitePreview>
        </Appear>
        <Appear at={at[1]!} y={30}>
          <SitePreview url="studio.com/contact">
            <div style={{ fontSize: 30, lineHeight: 1.1 }}>Get in touch</div>
            {["Name", "Email", "Message"].map((f) => (
              <div key={f} style={{ marginTop: 18 }}>
                <div style={{ fontSize: 13, color: L.muted }}>{f}</div>
                <div style={{ height: f === "Message" ? 110 : 40, borderRadius: 9, border: `1px solid ${L.line}`, background: L.softer, marginTop: 6 }} />
              </div>
            ))}
            <div style={{ marginTop: 18, height: 42, width: 120, borderRadius: 999, background: L.ink, color: "#fff", display: "grid", placeItems: "center", fontSize: 14 }}>Send</div>
          </SitePreview>
        </Appear>
        <Appear at={at[2]!} y={30}>
          <SitePreview url="studio.com/spring">
            <div style={{ height: 230, borderRadius: 12, background: "linear-gradient(160deg,#f6b26b,#e8614a 60%,#7a2b1f)", display: "flex", alignItems: "flex-end", padding: 22 }}>
              <div style={{ fontSize: 38, color: "#fff", lineHeight: 1 }}>Spring Sale</div>
            </div>
            {line("70%")}
            {line("54%")}
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <div style={{ height: 42, width: 140, borderRadius: 999, background: L.accent }} />
              <div style={{ height: 42, width: 110, borderRadius: 999, border: `1px solid ${L.line}` }} />
            </div>
          </SitePreview>
        </Appear>
      </div>
    </div>
  );
}

const POSTS: [string, string, string][] = [
  ["What we learned shipping v2", "Published", "Oct 28"],
  ["A guide to our new pricing", "Published", "Oct 14"],
  ["Behind the studio", "Draft", "Oct 9"],
  ["Customer story: Bloom Cafe", "Published", "Sep 30"],
];

function BlogAdmin({ t }: { t: number }): React.ReactElement {
  const newPost = prog(t, SENT() + 1.1, 0.6);
  return (
    <div style={{ height: "100%" }}>
      <PageHeader title="Posts" action={<Button primary>New Post</Button>} />
      <div style={{ margin: "0 24px" }}>
        <div style={{ display: "flex", height: 38, alignItems: "center", fontSize: 13, color: C.dim, borderBottom: `1px solid ${C.line}` }}>
          <span style={{ flex: 1 }}>Title</span>
          <span style={{ width: 110 }}>Status</span>
          <span style={{ width: 70 }}>Date</span>
        </div>
        <div style={{ height: 50 * newPost, overflow: "hidden" }}>
          <div style={{ display: "flex", height: 50, alignItems: "center", fontSize: 15, borderBottom: `1px solid ${C.lineSoft}`, background: `rgb(59 140 255 / ${(12 * newPost).toFixed(1)}%)`, opacity: newPost }}>
            <span style={{ flex: 1, color: C.strong, paddingLeft: 10 }}>Spring launch is here</span>
            <span style={{ width: 110 }}>
              <Tag style={{ fontSize: 12 }}>Draft</Tag>
            </span>
            <span style={{ width: 70, color: C.muted }}>Today</span>
          </div>
        </div>
        {POSTS.map(([title, status, date]) => (
          <div key={title} style={{ display: "flex", height: 50, alignItems: "center", fontSize: 15, color: C.fg, borderBottom: `1px solid ${C.lineSoft}` }}>
            <span style={{ flex: 1 }}>{title}</span>
            <span style={{ width: 110 }}>
              <Tag tone={status === "Draft" ? "neutral" : "success"} style={{ fontSize: 12 }}>{status}</Tag>
            </span>
            <span style={{ width: 70, color: C.muted }}>{date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The old either-or, as a dialog: keep your edits or take the update. Then Muse's way out. */
function ChoiceSheet({ t }: { t: number }): React.ReactElement | null {
  const open = prog(t, cue(41, -0.1), 0.45) * (1 - prog(t, MERGE_CLICK() + 0.15, 0.35, "inOut"));
  if (open <= 0) return null;
  const never = prog(t, say(42, "never", -0.05), 0.4);
  const muse = prog(t, cue(43, -0.1), 0.6);
  const pressed = t >= MERGE_CLICK() ? 1 - prog(t, MERGE_CLICK() + 0.1, 0.3) : 0;
  const options = [
    { label: "Keep your copy", note: "No more updates or fixes", icon: GitBranchIcon, k: prog(t, say(41, "own the code", -0.1), 0.4) },
    { label: "Take the update", note: "Your changes are overwritten", icon: RefreshCwIcon, k: prog(t, say(41, "get the updates", -0.1), 0.4) },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 5, background: `rgb(0 0 0 / ${Math.round(open * 50)}%)`, display: "grid", placeItems: "center" }}>
      <div style={{ width: 760, height: 246 + 92 * muse, overflow: "hidden", borderRadius: 16, background: C.panel, border: `1px solid ${C.line}`, padding: 28, display: "flex", flexDirection: "column", opacity: open, transform: `translateY(${(1 - open) * 16}px) scale(${0.98 + 0.02 * open})`, boxShadow: "0 30px 80px rgb(0 0 0 / 55%)" }}>
        <div style={{ fontSize: 21, color: C.strong }}>Blog 1.1.0 doesn't apply cleanly</div>
        <div style={{ fontSize: 14.5, color: C.muted, marginTop: 6 }}>You changed 2 files this update touches</div>
        <div style={{ display: "flex", gap: 12, marginTop: 22, opacity: 1 - never * 0.4 }}>
          {options.map(({ label, note, icon: Icon, k }) => (
            <div key={label} style={{ flex: 1, height: 118, borderRadius: 12, padding: 18, background: C.card, border: `1px solid ${k > 0.02 ? `rgb(235 235 235 / ${Math.round(10 + k * 22)}%)` : C.line}`, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16.5, color: C.strong }}>
                <Icon style={{ width: 17, height: 17, color: C.muted }} />
                {label}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.danger, opacity: k, transform: `translateY(${(1 - k) * 6}px)` }}>
                <XIcon style={{ width: 14, height: 14 }} /> {note}
              </div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ height: 76, flexShrink: 0, borderRadius: 12, padding: "0 18px", display: "flex", alignItems: "center", gap: 14, background: C.metaSoft, border: "1px solid rgb(59 140 255 / 45%)", opacity: muse, transform: `translateY(${(1 - muse) * 14}px) scale(${1 - pressed * 0.015})`, boxShadow: `0 0 ${30 * muse}px rgb(59 140 255 / ${Math.round(muse * 22)}%)` }}>
          <MuseGlyph size={34} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16.5, color: C.strong }}>Update with Muse</div>
            <div style={{ fontSize: 13.5, color: "#7fb2ff", marginTop: 2 }}>Merge 1.1.0 around your changes</div>
          </div>
          <Button style={{ background: C.meta, border: "none", color: "#fff" }}>Merge</Button>
        </div>
      </div>
    </div>
  );
}

/** Apps · Installed: the Blog update, what's in it, what it runs into in this copy, and the merge. */
function InstalledPage({ t }: { t: number }): React.ReactElement {
  const merging = t >= MERGE_CLICK();
  const done = t >= DONE();
  const conflict = prog(t, say(40, "that's over", -0.1), 0.4);
  const merged = prog(t, MERGED(), 0.4);
  const fileState = (i: number) => {
    const at = MERGED() + i * 0.25;
    if (t >= at) return <Tag tone="success"><CheckIcon style={{ width: 12, height: 12 }} /> Merged</Tag>;
    if (conflict > 0) return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: "rgb(248 113 113 / 12%)", color: C.danger, border: "1px solid rgb(248 113 113 / 30%)", fontSize: 13, opacity: 0.4 + 0.6 * conflict }}><XIcon style={{ width: 12, height: 12 }} /> Conflict</span>;
    return <Tag>Edited</Tag>;
  };
  const fix = prog(t, say(39, "fixes", -0.1), 0.5);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      <PageHeader title="Apps">
        <div style={{ display: "flex", gap: 4, marginLeft: 16, fontSize: 14 }}>
          {["Store", "Installed", "Build"].map((x, i) => (
            <span key={x} style={{ padding: "5px 12px", borderRadius: 8, background: i === 1 ? C.active : "transparent", color: i === 1 ? C.strong : C.muted }}>{x}</span>
          ))}
        </div>
      </PageHeader>
      <div style={{ margin: "0 24px" }}>
        {[
          { name: "Blog", v: done ? "1.1.0" : "1.0.0", by: "Lena Ortiz", icon: NewspaperIcon, update: true },
          { name: "Ad Designer", v: "2.3.1", by: "Studio Kit", icon: ImageIcon },
          { name: "Notes", v: "0.1.0", by: "SuperGrid", icon: SquarePlusIcon },
          { name: "Site", v: "0.1.0", by: "SuperGrid", icon: SquarePlusIcon },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 14, height: 64, borderBottom: `1px solid ${C.lineSoft}` }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: C.raised, display: "grid", placeItems: "center" }}>
                <Icon style={{ width: 17, height: 17, color: a.update ? C.fg : C.muted }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, color: C.strong }}>{a.name}</div>
                <div style={{ fontSize: 13, color: C.muted }}>
                  {a.v} · by {a.by}
                </div>
              </div>
              {a.update ? (
                done ? (
                  <Tag tone="success">
                    <CheckIcon style={{ width: 12, height: 12 }} /> Up to date
                  </Tag>
                ) : (
                  <>
                    <Tag tone="accent">1.1.0 available</Tag>
                    {merging ? (
                      <Button style={{ color: "#7fb2ff" }}>
                        <Spinner /> Merging
                      </Button>
                    ) : (
                      <Button primary>Update</Button>
                    )}
                  </>
                )
              ) : null}
            </div>
          );
        })}
      </div>
      <div style={{ flex: 1, display: "flex", gap: 14, padding: "20px 24px 24px" }}>
        <Appear at={cue(38, 0.7)} y={20} style={{ flex: 1, display: "flex" }}>
          <div style={{ flex: 1, borderRadius: 12, border: `1px solid ${C.line}`, background: C.card, padding: 20, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 16, color: C.strong, marginBottom: 14 }}>What's new in Blog 1.1.0</div>
            {["Share buttons on every post", "A faster RSS feed", "Fix for dates in Safari"].map((x, i) => (
              <Appear key={x} at={cue(38, 1.0) + i * 0.15} y={8}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, height: 38, padding: "0 8px", margin: "0 -8px", borderRadius: 8, fontSize: 14.5, color: C.fg, borderTop: i ? `1px solid ${C.lineSoft}` : undefined, background: i === 2 ? `rgb(52 211 153 / ${(10 * fix).toFixed(1)}%)` : undefined }}>
                  {i === 2 ? <WrenchIcon style={{ width: 15, height: 15, color: C.success }} /> : <PlusIcon style={{ width: 15, height: 15, color: C.success }} />} {x}
                </div>
              </Appear>
            ))}
            <div style={{ flex: 1 }} />
            <Appear at={say(39, "every customer", -0.1)} y={8}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: C.muted }}>
                <UsersIcon style={{ width: 14, height: 14 }} /> Shipped once by Lena Ortiz, to every install
              </div>
            </Appear>
          </div>
        </Appear>
        <Appear at={cue(40, -0.1)} y={20} style={{ flex: 1, display: "flex" }}>
          <div style={{ flex: 1, borderRadius: 12, border: `1px solid ${conflict > 0 && merged < 1 ? `rgb(248 113 113 / ${Math.round(15 + conflict * (1 - merged) * 25)}%)` : C.line}`, background: C.card, padding: 20 }}>
            <div style={{ fontSize: 16, color: C.strong, marginBottom: 14 }}>Your copy</div>
            {["components/post-footer.tsx", "routes.ts"].map((f, i) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, height: 38, fontSize: 14, color: C.fg, borderTop: i ? `1px solid ${C.lineSoft}` : undefined }}>
                <FileCodeIcon style={{ width: 15, height: 15, color: C.muted }} />
                <span style={{ flex: 1, fontFamily: MONO, fontSize: 13.5 }}>{f}</span>
                {fileState(i)}
              </div>
            ))}
            <div style={{ position: "relative", height: 30, marginTop: 12, fontSize: 14 }}>
              <Swap
                y={8}
                items={[
                  { at: cue(40, 0.1), node: <span style={{ color: C.muted }}>You changed 2 files in Blog</span> },
                  { at: say(40, "that's over", -0.1), node: <span style={{ color: C.danger }}>1.1.0 doesn't apply cleanly</span> },
                  { at: MERGED() + 0.3, node: <span style={{ color: C.success }}>Merged around your edits</span> },
                ]}
              />
            </div>
          </div>
        </Appear>
      </div>
      <ChoiceSheet t={t} />
    </div>
  );
}

// ---- the tour ----

type View = { at: number; title: string; page: (t: number) => React.ReactNode; sub?: "code:Files" | "code:Git" | "blog"; active?: RailKey };

function subFor(key: NonNullable<View["sub"]>): React.ReactElement {
  if (key === "blog") {
    const items: SubItem[] = [{ label: "Posts", icon: NewspaperIcon, active: true }, { label: "Authors", icon: UsersIcon }, { label: "Categories", icon: FolderIcon }, { label: "Comments", icon: PenLineIcon }, { label: "Settings", group: "Settings" }, { label: "Files", icon: CodeIcon, group: "Developer" }];
    return <SubNav title="Blog" items={items} />;
  }
  const active = key === "code:Git" ? "Git" : "Files";
  return <SubNav title="Code" items={["Files", "Git", "Server", "Deploys"].map((l) => ({ label: l, icon: { Files: FolderIcon, Git: GitBranchIcon, Server: ServerIcon, Deploys: RocketIcon }[l], active: l === active }))} />;
}

const PROMPT = "Write a post about the spring launch with the signup form";
const SENT = () => cue(37, 0.75) + PROMPT.length / 50 + 0.2;

export function Tour(): React.ReactElement {
  const t = useT();
  const enter = beats.app;
  const ws = cue(31, 0.85);
  const home = say(31, "database", -0.1);

  const views: View[] = [
    { at: enter, title: "", page: (tt) => <Onboarding t={tt} /> },
    { at: ws, title: "Code · Files", page: (tt) => <RepoPage t={tt} from={ws} />, sub: "code:Files", active: "code" },
    { at: home, title: "Studio", page: (tt) => <HomePage t={tt} /> },
    { at: cue(32), title: "Apps · Store", page: (tt) => <StorePage t={tt} /> },
    { at: cue(34), title: "Code · Git", page: (tt) => <InstallDiffPage t={tt} />, sub: "code:Git", active: "code" },
    { at: cue(35, -0.2), title: "Ad Designer", page: (tt) => <AdDesigner t={tt} />, active: "app:Ad Designer" },
    { at: cue(36, 0.2), title: "Site · Pages", page: () => <SitePage />, active: "app:Site" },
    { at: cue(37, 0.1), title: "Blog · Posts", page: (tt) => <BlogAdmin t={tt} />, sub: "blog", active: "app:Blog" },
    { at: cue(38), title: "Apps · Installed", page: (tt) => <InstalledPage t={tt} /> },
  ];
  const i = views.reduce((f, v, k) => (t >= v.at ? k : f), 0);
  const cur = views[i]!;
  const prev = i > 0 ? views[i - 1]! : null;
  const p = prev ? prog(t, cur.at, 0.5, "inOut") : 1;
  const leaving = prev ? 1 - prog(t, cur.at, 0.28, "inOut") : 0;
  const arriving = prev ? prog(t, cur.at + 0.16, 0.4) : 1;
  const both = (render: (v: View, o: number, k: string) => React.ReactNode) => (
    <>
      {prev && leaving > 0 ? render(prev, leaving, `prev${i}`) : null}
      {arriving > 0 ? render(cur, arriving, `cur${i}`) : null}
    </>
  );

  const railOpen = prog(t, ws, 0.6, "inOut");
  const curSub = cur.sub;
  const prevSub = prev && p < 1 ? prev.sub : undefined;
  const subOpen = curSub ? (prev && !prev.sub && p < 1 ? p : 1) : prevSub ? 1 - p : 0;
  const sub = curSub || prevSub ? (
    <div style={{ position: "relative", height: "100%" }}>
      {prevSub && prevSub !== curSub ? <div style={{ position: "absolute", inset: 0, opacity: curSub ? 1 - p : 1 }}>{subFor(prevSub)}</div> : null}
      {curSub ? <div style={{ position: "absolute", inset: 0, opacity: prevSub && prevSub !== curSub ? p : 1 }}>{subFor(curSub)}</div> : null}
    </div>
  ) : undefined;

  const fade = (a: number, b: number) => prog(t, a, 0.4) * (1 - prog(t, b, 0.5));
  const active: RailState["active"] = {};
  if (cur.active) active[cur.active] = prev?.active === cur.active ? 1 : p;
  if (prev?.active && prev.active !== cur.active) active[prev.active] = 1 - p;
  const lit: RailState["lit"] = {
    database: fade(say(31, "database", -0.05), cue(32, -0.3)),
    workflows: fade(say(31, "workflows", -0.05), cue(32, -0.3)),
    library: fade(say(31, "media", -0.05), cue(32, -0.3)),
    "app:Notes": fade(cue(32, 0.1), say(33, "install", -0.2)),
    "app:Site": fade(cue(32, 0.1), say(33, "install", -0.2)),
    "app:Ad Designer": fade(cue(32, 0.1), say(33, "install", -0.2)),
    "app:Blog": fade(INSTALLED(), cue(34, 0.8)),
  };
  const blogIn = prog(t, INSTALLED(), 0.5, "inOut");
  const rail: RailState = { workspace: "Studio", threads: ["Spring launch post", "Clean up the contacts"], apps: ["Notes", "Site", "Ad Designer", ...(blogIn > 0 ? ["Blog"] : [])], active, lit, arriving: { "app:Blog": blogIn } };

  // the agent's panel: Muse writing a post over MCP, then later merging the update
  const sent = SENT();
  const postChat = (
    <ChatPanel live={t >= sent && t < sent + 1.8 ? 1 : 0} draft={t < sent ? <Typed text={PROMPT} at={cue(37, 0.75)} cps={50} /> : undefined}>
      {t >= sent ? (
        <Appear at={sent} y={10} style={{ alignSelf: "flex-end", display: "flex", justifyContent: "flex-end" }}>
          <UserMsg>{PROMPT}</UserMsg>
        </Appear>
      ) : null}
      {t >= sent + 0.35 ? (
        <Appear at={sent + 0.35} y={8}>
          <ToolRow icon={NewspaperIcon} label={<span>blog · <span style={{ fontFamily: MONO, fontSize: 13 }}>create_post</span></span>} state={t >= sent + 1.1 ? "done" : "running"} />
        </Appear>
      ) : null}
      {t >= sent + 0.8 ? (
        <Appear at={sent + 0.8} y={8}>
          <ToolRow icon={TextCursorInputIcon} label={<span>forms · <span style={{ fontFamily: MONO, fontSize: 13 }}>embed_form</span></span>} state={t >= sent + 1.4 ? "done" : "running"} />
        </Appear>
      ) : null}
      {t >= sent + 1.6 ? (
        <Appear at={sent + 1.6} y={8}>
          <div className="pretty" style={{ fontSize: 14, lineHeight: 1.5, color: C.fg }}>The draft is in Posts, with the signup form in the footer</div>
        </Appear>
      ) : null}
    </ChatPanel>
  );
  const diff = (
    <div style={{ fontFamily: MONO, fontSize: 12.5, lineHeight: 1.7, borderRadius: 8, background: C.bg, border: `1px solid ${C.lineSoft}`, padding: "6px 10px" }}>
      <div style={{ color: C.dim }}>{"  <PostFooter>"}</div>
      <div style={{ color: C.success }}>
        {"+   <ShareButtons />"}
        <span style={{ color: C.dim }}>{"   1.1.0"}</span>
      </div>
      <div style={{ color: C.fg }}>
        {"    <SignupForm />"}
        <span style={{ color: C.accent }}>{"     yours"}</span>
      </div>
      <div style={{ color: C.dim }}>{"  </PostFooter>"}</div>
    </div>
  );
  const step = (at: number, doneAt: number, node: (state: "running" | "done" | "warn") => React.ReactNode, warn = false) =>
    t >= at ? (
      <Appear at={at} y={8}>
        {node(t >= doneAt ? (warn ? "warn" : "done") : "running")}
      </Appear>
    ) : null;
  const approved = t >= APPROVE();
  const mergeChat = (
    <ChatPanel live={t >= MERGE_CLICK() && t < DONE() ? 1 : 0}>
      {step(MERGE_CLICK() + 0.45, MERGE_CLICK() + 0.45, () => <div className="pretty" style={{ fontSize: 14, lineHeight: 1.5, color: C.fg }}>1.1.0 changes the post footer, where I added your signup form, so I'll merge it around that</div>)}
      {step(cue(44, 0.1), cue(44, 0.8), (st) => <ToolRow icon={FileSearchIcon} label="Read what changed in 1.1.0" state={st} />)}
      {step(cue(44, 0.9), MERGED(), (st) => <ToolRow icon={GitMergeIcon} label="Merge with your edits" state={st} detail={diff} />)}
      {step(say(45, "checks", -0.1), say(45, "issues", 0.1), (st) => <ToolRow icon={ShieldCheckIcon} label="Security check" state={st} detail={st === "done" ? <span style={{ fontSize: 13, color: C.success }}>No issues found</span> : undefined} />)}
      {step(say(45, "fixes", -0.15), say(45, "breaks", 0.3), (st) => <ToolRow icon={WrenchIcon} label="Build and test" state={st} detail={st === "warn" ? <span style={{ fontSize: 13, color: C.muted }}>Your footer used an old prop name, updated it</span> : undefined} />, true)}
      {step(say(45, "asks", -0.15), APPROVE(), () => (
        <div style={{ borderRadius: 10, padding: "12px 12px 12px 14px", background: C.card, border: `1px solid ${approved ? "rgb(52 211 153 / 30%)" : "rgb(59 140 255 / 40%)"}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, color: C.strong }}>Update Blog to 1.1.0</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Merged, checked and tested</div>
          </div>
          {approved ? (
            <Tag tone="success">
              <CheckIcon style={{ width: 12, height: 12 }} /> Approved
            </Tag>
          ) : (
            <Button primary style={{ height: 32 }}>Approve</Button>
          )}
        </div>
      ))}
    </ChatPanel>
  );
  const postOpen = prog(t, cue(37, 0.3), 0.6, "inOut") * (1 - prog(t, cue(38, -0.2), 0.6, "inOut"));
  const mergeOpen = prog(t, MERGE_CLICK() + 0.1, 0.6, "inOut");
  const chatOpen = Math.max(postOpen, mergeOpen);
  const chat = t < cue(38) ? postChat : mergeChat;

  // the pointer, in window pixels, one stretch at a time
  const pointer: { from: number; path: [number, number, number][]; clicks: number[]; hideAt: number }[] = [
    {
      from: enter,
      path: [
        [cue(29, 0.2), 1040, 760],
        [cue(29, 0.85), 840, 475],
        [cue(29, 1.15), 840, 475],
        [cue(29, 1.5), 1084, 692],
        [cue(30, 0.9), 1084, 692],
        [cue(30, 1.6), 1050, 664],
        [cue(31, 0.15), 1050, 664],
        [cue(31, 0.55), 1044, 630],
      ],
      clicks: [cue(29, 0.9), cue(29, 1.6), cue(30, 1.7), cue(31, 0.7)],
      hideAt: ws - 0.05,
    },
    {
      from: cue(32, 0.3),
      path: [
        [cue(33, -0.5), 1000, 600],
        [say(33, "install", 0.15), 646, 237],
        [INSTALL() + 0.8, 690, 300],
      ],
      clicks: [INSTALL()],
      hideAt: cue(34, -0.2),
    },
    {
      from: cue(40, 0.6),
      path: [
        [cue(40, 1.0), 1300, 520],
        [UPDATE_CLICK() - 0.25, 1576, 142],
        [cue(43, 0.1), 1576, 142],
        [MERGE_CLICK() - 0.15, 1228, 553],
        [MERGE_CLICK() + 0.6, 1200, 610],
      ],
      clicks: [UPDATE_CLICK(), MERGE_CLICK()],
      hideAt: MERGE_CLICK() + 0.7,
    },
    {
      from: APPROVE() - 1.2,
      path: [
        [APPROVE() - 0.9, 1360, 560],
        [APPROVE() - 0.15, 1578, 694],
        [APPROVE() + 0.5, 1560, 720],
      ],
      clicks: [APPROVE()],
      hideAt: APPROVE() + 0.5,
    },
  ];
  const ptr = [...pointer].reverse().find((x) => t >= x.from - 0.4 && t < x.hideAt + 0.35);

  return (
    <Scene from={scrolls.app} to={scrolls.cto + SCROLL} fadeOut={0.01} shift={t < scrolls.cto ? pageShift(t) : scrollOn(t, scrolls.cto).out}>
      <Product>
        <Window
          title={both((v, o, k) => (
            <span key={k} style={{ position: "absolute", left: 0, top: 0, opacity: o }}>{v.title}</span>
          ))}
          mode="dev"
          rail={rail}
          railOpen={railOpen}
          sub={sub}
          subOpen={subOpen}
          chat={chatOpen > 0 ? chat : undefined}
          chatOpen={chatOpen}
        >
          {both((v, o, k) => (
            <div key={k} style={{ position: "absolute", inset: 0, opacity: o, transform: `translateY(${(1 - o) * (k.startsWith("cur") ? 10 : -6)}px)` }}>
              {v.page(t)}
            </div>
          ))}
        </Window>
        {ptr ? <Cursor key={ptr.from} path={ptr.path} clicks={ptr.clicks} hideAt={ptr.hideAt} /> : null}
      </Product>
    </Scene>
  );
}
