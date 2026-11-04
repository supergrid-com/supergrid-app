import { ActivityIcon, BarChart3Icon, CheckIcon, CloudIcon, CodeIcon, DatabaseIcon, FileCodeIcon, FileIcon, FileSearchIcon, FolderIcon, GitBranchIcon, GitCommitHorizontalIcon, GitMergeIcon, ImageIcon, LayoutTemplateIcon, MailIcon, NewspaperIcon, PenLineIcon, PlusIcon, RefreshCwIcon, RocketIcon, ServerIcon, ShieldCheckIcon, SparklesIcon, SquarePlusIcon, TableIcon, TextCursorInputIcon, UsersIcon, WorkflowIcon, WrenchIcon, XIcon, ZapIcon, type LucideIcon } from "lucide-react";
import * as React from "react";
import { AdDesignerBody } from "../ads";
import { CodeView, DiffView, TabStrip, Tree, type DiffLine, type TreeNode } from "../editor";
import { AreaChart, Avatar, Person, SectionHead, Stat, Table, Tile } from "../grid";
import { Appear, C, Cursor, MONO, Mark, MuseGlyph, Scene, Swap, Title, Typed, prog, useT } from "../kit";
import { Cross, SCROLL, pageShift, scrollOn, scrolls } from "../look";
import { Button, ChatPanel, Dot, PageHeader, PageTabs, Spinner, SubNav, Tag, ToolRow, Toolbar, UserMsg, WIN_H, WIN_W, Window, tint, type RailKey, type RailState, type SubItem } from "../shell";
import { BlogPostPage, LandingPage, Photo, SitePreview, WaitlistPage } from "../site";
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
  const R = 130;
  // the three reasons people clone, answered one by one under the name
  const owns = [
    { icon: <GitBranchIcon style={{ width: 30, height: 30, color: "#fff", strokeWidth: 1.7 }} />, tint: "rgb(255 255 255 / 10%)", label: "Your own repo", note: "Every workspace is a git repo", at: say(28, "own repo", -0.2) },
    { icon: <CloudIcon style={{ width: 30, height: 30, color: "#f6821f", strokeWidth: 1.7 }} />, tint: "rgb(246 130 31 / 16%)", label: "Your Cloudflare", note: "Deployed to your own account", at: say(28, "cloudflare", -0.2) },
    { icon: <MuseGlyph size={34} />, tint: "rgb(0 130 251 / 18%)", label: "Your own AI", note: "Muse Code, over ACP", at: say(28, "built by", -0.2) },
  ];
  const lift = prog(t, owns[0]!.at - 0.5, 0.9, "inOut") * -170;
  return (
    <Scene from={s} to={scrolls.app + SCROLL} fadeOut={0.01} dark>
      {/* the lockup: the mark, then the name beside it, then what it is, centred until the cards need the room */}
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${lift}px)` }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 420, display: "flex", justifyContent: "center", alignItems: "center", gap: 44 }}>
        <div style={{ position: "relative", width: 140, height: 140 }}>
          {lines > 0 ? (
            <div style={{ position: "absolute", left: 70, top: 70, width: 0, height: 0, opacity: lines }}>
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
          <Mark size={140} color="#fff" build={build} style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 0 28px rgb(155 61 255 / 35%))" }} />
        </div>
        {/* the name holds its place from the start, so the mark never shifts when it arrives */}
        <div style={{ position: "relative" }}>
          <Title size={150} dark style={{ visibility: "hidden" }}>SuperGrid</Title>
          <Appear at={say(28, "supergrid", -0.1)} x={-24} y={0} style={{ position: "absolute", inset: 0 }}>
            <Title size={150} dark style={{ textShadow: "0 0 60px rgb(255 255 255 / 22%)" }}>SuperGrid</Title>
          </Appear>
        </div>
      </div>
      <Appear at={say(28, "desktop", -0.15)} y={14} style={{ position: "absolute", left: 0, right: 0, top: 618, textAlign: "center", fontSize: 40, letterSpacing: "0.025em", color: "rgb(255 255 255 / 70%)" }}>
        The desktop IDE for your site and the tools behind it
      </Appear>
      </div>
      {/* the three answers, a card each, in fixed slots so nothing shifts as they arrive */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 640, display: "flex", justifyContent: "center", gap: 28 }}>
        {owns.map((o) => (
          <div key={o.label} style={{ width: 400, height: 236 }}>
          <Appear at={o.at} y={24} style={{ width: 400, height: 236, borderRadius: 26, padding: "28px 30px", background: "linear-gradient(180deg, rgb(255 255 255 / 7%), rgb(255 255 255 / 3%))", boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 12%), 0 20px 50px rgb(0 0 0 / 30%)", display: "flex", flexDirection: "column" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: o.tint, display: "grid", placeItems: "center" }}>{o.icon}</div>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 36, letterSpacing: "0.02em", color: "#fff", whiteSpace: "nowrap" }}>{o.label}</div>
            <div style={{ marginTop: 6, fontSize: 22, letterSpacing: "0.02em", color: "rgb(255 255 255 / 55%)", whiteSpace: "nowrap" }}>{o.note}</div>
          </Appear>
          </div>
        ))}
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
  const ring = state === "idle" ? C.line : state === "done" ? tint(C.success, 40) : meta ? tint(C.meta, 60) : tint(C.accent, 60);
  const fill = state === "done" ? C.successSoft : state === "selected" ? (meta ? C.metaSoft : C.accentSoft) : C.card;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 12, border: `1px solid ${ring}`, background: fill }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: state === "idle" ? C.raised : "#fff", display: "grid", placeItems: "center" }}>{icon}</div>
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
            <OptionRow icon={<CloudIcon style={{ width: 19, height: 19, color: "#f6821f" }} />} name="Nodo" note={<span style={{ fontFamily: MONO, fontSize: 12.5 }}>nodo.workers.dev</span>} state={cfDone ? "done" : "selected"} />
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
            <div style={{ height: 44, borderRadius: 10, border: `1px solid ${tint(C.accent, 60)}`, boxShadow: `0 0 0 3px ${C.accentSoft}`, padding: "0 14px", display: "flex", alignItems: "center", fontSize: 17, color: C.strong }}>
              <Typed text="Studio" at={cue(31, 0.05)} cps={14} color={C.accent} />
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

// the workspace repo, as the template lays it out (core/templates/workspace), with the apps added
const REPO: TreeNode[] = [
  { name: "app", depth: 0, dir: true, open: true },
  { name: "components", depth: 1, dir: true },
  { name: "app.css", depth: 1 },
  { name: "entry.server.tsx", depth: 1 },
  { name: "root.tsx", depth: 1 },
  { name: "routes.ts", depth: 1 },
  { name: "apps", depth: 0, dir: true, open: true },
  { name: "ad-designer", depth: 1, dir: true },
  { name: "notes", depth: 1, dir: true },
  { name: "site", depth: 1, dir: true },
  { name: "workers", depth: 0, dir: true },
  { name: "package.json", depth: 0 },
  { name: "react-router.config.ts", depth: 0 },
  { name: "supergrid.workspace.json", depth: 0 },
  { name: "tsconfig.json", depth: 0 },
  { name: "vite.config.ts", depth: 0 },
  { name: "wrangler.jsonc", depth: 0, active: true },
  { name: "README.md", depth: 0 },
];

const WRANGLER = [
  "{",
  "  // The workspace Worker: every app under apps/ built in",
  '  "name": "sg-ws-studio",',
  '  "main": "./workers/index.ts",',
  '  "compatibility_date": "2026-10-01",',
  '  "compatibility_flags": ["nodejs_compat"],',
  '  "d1_databases": [',
  '    { "binding": "DB", "database_name": "sg-ws-studio" }',
  "  ],",
  '  "queues": {',
  '    "producers": [{ "binding": "EVENTS", "queue": "sg-ws-studio-events" }],',
  '    "consumers": [{ "queue": "sg-ws-studio-events" }]',
  "  },",
  '  "workflows": [',
  '    { "binding": "HOOK_RUN", "name": "sg-ws-studio-hooks", "class_name": "HookRun" }',
  "  ],",
  '  "images": { "binding": "IMAGES" },',
  '  "triggers": { "crons": ["17 3 * * *"] },',
  '  "vars": {',
  '    "WORKSPACE_ID": "studio",',
  '    "WORKSPACE_NAME": "Studio",',
  '    "WORKSPACE_URL": "https://sg-ws-studio.workers.dev"',
  "  },",
  '  "observability": { "enabled": true }',
  "}",
];

/** Code · Files: the new repo, the tree filling in and wrangler.jsonc open. */
function RepoPage({ t, from }: { t: number; from: number }): React.ReactElement {
  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ width: 280, flexShrink: 0, borderRight: `1px solid ${C.line}`, display: "flex", flexDirection: "column" }}>
        <div style={{ height: 38, padding: "0 16px", display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: C.fg, borderBottom: `1px solid ${C.line}` }}>
          <GitBranchIcon style={{ width: 14, height: 14, color: C.muted }} /> main
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5, color: C.dim }}>sg-ws-studio</span>
        </div>
        <Tree nodes={REPO.map((n, i) => ({ ...n, appear: prog(t, from + 0.08 + i * 0.03, 0.4) }))} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TabStrip tabs={[{ name: "wrangler.jsonc", active: true }]} right={<><span>JSONC</span><span>UTF-8</span></>} />
        <CodeView lines={WRANGLER} lang="json" appear={(i) => prog(t, from + 0.18 + i * 0.025, 0.35)} />
      </div>
    </div>
  );
}

// the last 30 days of visits: a weekly rhythm, the launch spike nine days in
const VISITS = Array.from({ length: 30 }, (_, i) => {
  const launch = i >= 9 ? 1 + 3.2 * Math.exp(-(i - 9) / 3.5) : i >= 5 ? 1.4 : 1;
  const weekend = i % 7 === 5 || i % 7 === 6 ? 1.25 : 1;
  return Math.round((62 + i * 2.4) * launch * weekend * (0.9 + 0.2 * Math.abs(Math.sin(i * 1.7))));
});

const EVENTS: [string, string, string | null, string, string][] = [
  ["order.placed", "site", "Nora Patel", "$92", "now"],
  ["waitlist.joined", "site", "Felix Haddad", "spring", "2m"],
  ["contact.created", "core", "Felix Haddad", "waitlist", "2m"],
  ["page.view", "blog", null, "/journal/how-we-fire", "4m"],
  ["checkout.started", "site", "Iris Moreau", "$120", "9m"],
  ["order.placed", "site", "Kiln & Co.", "$1,140", "26m"],
  ["post.published", "blog", "Maya Chen", "Now Stocking Six Shops", "1h"],
];

const WORKFLOWS: { name: string; on: boolean; trigger: string; steps: string[]; runs: number }[] = [
  { name: "Welcome the Waitlist", on: true, trigger: "waitlist.joined", steps: ["Tag", "Wait 1h", "Tag"], runs: 118 },
  { name: "Big Orders Become VIP", on: true, trigger: "order.placed ≥ $250", steps: ["Tag vip"], runs: 12 },
  { name: "Wholesale Intake", on: false, trigger: "contact.created", steps: ["Tag", "Condition"], runs: 0 },
];

/** Studio's home: the core, lit a piece at a time as the voice names it. */
function HomePage({ t }: { t: number }): React.ReactElement {
  const word = (w: string) => prog(t, say(31, w, -0.05), 0.4) * (1 - prog(t, cue(32, -0.3), 0.5));
  const k = prog(t, say(31, "database", -0.1) + 0.1, 0.9);
  const kind = (app: string) => (app === "core" ? "accent" : app === "blog" ? "meta" : "neutral");
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title="Studio" action={<Tag>sg-ws-studio.workers.dev</Tag>}>
        <span style={{ marginLeft: 8, fontSize: 13, color: C.muted, padding: "4px 10px", borderRadius: 8, border: `1px solid ${C.lineSoft}` }}>Last 30 Days</span>
      </PageHeader>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1.15fr 1fr", gap: 14, padding: "0 24px 24px" }}>
        <Tile lit={word("analytics")} style={{ gridColumn: "span 2" }}>
          <SectionHead icon={BarChart3Icon} title="Analytics" lit={word("analytics")} action="Spring Launch report" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
            <Stat label="Visitors" value="3,928" delta="+34%" k={prog(t, say(31, "database", -0.1) + 0.05, 0.5)} />
            <Stat label="Signups" value="118" delta="+62%" k={prog(t, say(31, "database", -0.1) + 0.12, 0.5)} />
            <Stat label="Orders" value="96" delta="+27%" k={prog(t, say(31, "database", -0.1) + 0.19, 0.5)} />
            <Stat label="Revenue" value="$6,840" delta="+31%" k={prog(t, say(31, "database", -0.1) + 0.26, 0.5)} />
          </div>
          <AreaChart values={VISITS} labels={["Oct 6", "Oct 13", "Oct 20", "Oct 27", "Nov 3"]} k={k} height={136} style={{ flex: 1 }} />
        </Tile>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
          <Tile lit={word("database")} style={{ flex: 1 }}>
            <SectionHead icon={DatabaseIcon} title="Database" count={6} lit={word("database")} action="D1" />
            <Table
              header={false}
              rowHeight={30}
              cols={[{ label: "Table" }, { label: "Rows", width: 60, align: "right" }]}
              rows={[
                ["contacts", "254"],
                ["events", "8,612"],
                ["contact_tags", "410"],
                ["segments", "6"],
                ["app_blog_item", "11"],
              ].map(([name, n]) => ({ key: name!, cells: [<span key="n" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 13 }}><TableIcon style={{ width: 14, height: 14, color: C.dim }} />{name}</span>, <span key="c" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>{n}</span>] }))}
            />
          </Tile>
          <Tile pad={16}>
            <SectionHead title="Apps" count={3} style={{ marginBottom: 6 }} />
            {[["Notes", "0.1.0", "SuperGrid"], ["Site", "0.1.0", "SuperGrid"], ["Ad Designer", "2.3.1", "Studio Kit"]].map(([n, v, by], i) => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, height: 26, fontSize: 13.5, color: C.fg, borderTop: i ? `1px solid ${C.lineSoft}` : undefined }}>
                <SquarePlusIcon style={{ width: 14, height: 14, color: C.muted, flexShrink: 0 }} />
                {n}
                <span style={{ fontSize: 12.5, color: C.dim }}>{by}</span>
                <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 12, color: C.dim }}>{v}</span>
              </div>
            ))}
          </Tile>
        </div>
        <Tile lit={word("events")}>
          <SectionHead icon={ActivityIcon} title="Events" count="8,612" lit={word("events")} action="Live" />
          <Table
            header={false}
            rowHeight={34}
            cols={[{ label: "Event" }, { label: "Who", width: 140 }, { label: "When", width: 34, align: "right" }]}
            rows={EVENTS.map(([name, app, who, detail, when], i) => ({
              key: `${name}${i}`,
              cells: [
                <span key="n" style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <Dot tone={kind(app)} style={{ fontFamily: MONO, fontSize: 12 }}>{name}</Dot>
                  <span style={{ fontSize: 12.5, color: C.dim, overflow: "hidden", textOverflow: "ellipsis" }}>{detail}</span>
                </span>,
                who ? <Person key="w" name={who} size={20} /> : <span key="w" style={{ color: C.dim }}>Visitor</span>,
                <span key="t" style={{ color: C.dim, fontSize: 12.5 }}>{when}</span>,
              ],
            }))}
          />
        </Tile>
        <Tile lit={word("workflows")}>
          <SectionHead icon={WorkflowIcon} title="Workflows" count={3} lit={word("workflows")} action="2 on" />
          {WORKFLOWS.map((w, i) => (
            <div key={w.name} style={{ padding: "10px 0", borderTop: i ? `1px solid ${C.lineSoft}` : undefined }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.strong }}>
                <span style={{ width: 26, height: 16, borderRadius: 999, background: w.on ? C.success : C.raised, position: "relative", flexShrink: 0 }}>
                  <span style={{ position: "absolute", top: 2, left: w.on ? 12 : 2, width: 12, height: 12, borderRadius: 99, background: "#fff" }} />
                </span>
                {w.name}
                <span style={{ marginLeft: "auto", fontSize: 12.5, color: C.dim }}>{w.runs ? `${w.runs} runs` : "Off"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12, color: C.muted, paddingLeft: 34, flexWrap: "nowrap", overflow: "hidden" }}>
                <ZapIcon style={{ width: 12, height: 12, color: C.warning, flexShrink: 0 }} />
                <span style={{ fontFamily: MONO, whiteSpace: "nowrap" }}>{w.trigger}</span>
                {w.steps.map((s) => (
                  <React.Fragment key={s}>
                    <span style={{ width: 10, height: 1, background: C.line, flexShrink: 0 }} />
                    <span style={{ padding: "2px 7px", borderRadius: 6, border: `1px solid ${C.lineSoft}`, whiteSpace: "nowrap" }}>{s}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </Tile>
        <Tile lit={word("media library")}>
          <SectionHead icon={ImageIcon} title="Media Library" count={7} lit={word("media library")} action="Images · Stream" />
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 8, minHeight: 0 }}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${C.lineSoft}`, minHeight: 0, position: "relative" }}>
                <Photo n={n} height="100%" focus={n === 2 ? "50% 30%" : "50% 50%"} style={{ position: "absolute", inset: 0 }} />
              </div>
            ))}
          </div>
        </Tile>
      </div>
    </div>
  );
}

const STORE: { name: string; by: string; icon: LucideIcon; price: string; kind: string; about: string; installs: string }[] = [
  { name: "Blog", by: "Lena Ortiz", icon: NewspaperIcon, price: "Free", kind: "Site", about: "Posts, categories and RSS, with an editor your team can use", installs: "2.1k" },
  { name: "Forms", by: "Paper Labs", icon: TextCursorInputIcon, price: "Free", kind: "Site", about: "Forms that write to your contacts and fire an event", installs: "1.8k" },
  { name: "Landing Pages", by: "Theo Marsh", icon: LayoutTemplateIcon, price: "$29", kind: "Site", about: "Launch pages built from sections, with a signup", installs: "940" },
  { name: "Newsletter", by: "Ivy Chen", icon: MailIcon, price: "Free", kind: "Admin", about: "Send to a segment from your own domain, track opens", installs: "1.2k" },
  { name: "Bookings", by: "Ola Berg", icon: UsersIcon, price: "$19", kind: "Site", about: "Appointments on your calendar, with reminders", installs: "610" },
  { name: "Invoices", by: "Mara Quinn", icon: FileIcon, price: "$39", kind: "Admin", about: "Invoices and payments against your contacts", installs: "480" },
];

const INSTALL = () => say(33, "install", 0.35);
const INSTALLED = () => INSTALL() + 0.9;
// the update: the click that hits the edited copy, Muse's way out, the merge, and the approval
const UPDATE_CLICK = () => cue(41, -0.35);
const MERGE_CLICK = () => cue(43, 0.9);
const MERGED = () => say(44, "because", 0.2);
const APPROVE = () => say(45, "approval", 0.25);
const DONE = () => APPROVE() + 0.25;

/** Apps · Store: six apps from other builders, Blog installed from here. */
function StorePage({ t }: { t: number }): React.ReactElement {
  const installed = t >= INSTALLED();
  const installing = t >= INSTALL() && !installed;
  return (
    <div style={{ height: "100%" }}>
      <PageHeader title="Apps">
        <PageTabs items={["Store", "Installed", "Build"]} active={0} />
      </PageHeader>
      <Toolbar placeholder="Search apps" chips={["All", "Site", "Admin", "Internal"]} count="24 apps" style={{ margin: "0 24px 14px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, padding: "0 24px" }}>
        {STORE.map((a, i) => {
          const Icon = a.icon;
          const blog = a.name === "Blog";
          const hot = blog ? prog(t, say(33, "install", -0.3), 0.5) : 0;
          return (
            <Appear key={a.name} at={cue(32, 0.25) + i * 0.06} y={14}>
              <div style={{ borderRadius: 12, border: `1px solid ${hot > 0 ? tint(C.accent, 14 + hot * 46) : C.line}`, background: C.card, padding: 18, height: 176, display: "flex", flexDirection: "column", boxShadow: hot > 0 ? `0 0 ${24 * hot}px ${tint(C.accent, hot * 14)}` : undefined }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: C.raised, display: "grid", placeItems: "center" }}>
                    <Icon style={{ width: 19, height: 19, color: C.fg }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, color: C.strong }}>{a.name}</div>
                    <div style={{ fontSize: 13, color: C.muted, display: "flex", alignItems: "center", gap: 6 }}>
                      <Avatar name={a.by} size={16} /> {a.by}
                    </div>
                  </div>
                  <Tag style={{ fontSize: 12 }}>{a.kind}</Tag>
                </div>
                <div className="pretty" style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.45, marginTop: 12 }}>{a.about}</div>
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.dim }}>
                  <span style={{ color: C.fg }}>{a.price}</span>·<span>{a.installs} installs</span>
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

const INSTALL_FILES = ["manifest.json", "schema.sql", "components/post-card.tsx", "pages/[slug].tsx", "routes.ts", "worker/index.ts", "admin/posts.tsx", "mcp/tools.ts"];

const POST_CARD = [
  'import { Link } from "react-router";',
  'import type { Post } from "../lib/posts";',
  'import { formatDate } from "../lib/dates";',
  "",
  "export function PostCard({ post }: { post: Post }) {",
  "  return (",
  '    <article className="post-card">',
  "      {post.image ? <img src={post.image} alt={post.title} /> : null}",
  "      <Link to={`/blog/${post.slug}`}>",
  "        <h2>{post.title}</h2>",
  "      </Link>",
  '      <p className="post-card__excerpt">{post.excerpt}</p>',
  "      <footer>",
  "        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>",
  "        <span>{post.readingTime} min read</span>",
  "      </footer>",
  "    </article>",
  "  );",
  "}",
];

/** Code · Git: the install as one commit, the files arriving in the repo and one of them open. */
function InstallDiffPage({ t }: { t: number }): React.ReactElement {
  const start = cue(34, 0.2);
  const diff: DiffLine[] = POST_CARD.map((text) => ({ kind: "+", text }));
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title="Git" action={<Tag tone="success">Merged into main</Tag>}>
        <PageTabs items={["Changes", "History", "Branches"]} active={1} />
      </PageHeader>
      <div style={{ flex: 1, minHeight: 0, margin: "0 24px 24px", border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", background: C.card }}>
        <div style={{ height: 52, padding: "0 18px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <GitCommitHorizontalIcon style={{ width: 16, height: 16, color: C.accent }} />
          <span style={{ fontSize: 15.5, color: C.strong }}>Install Blog 1.0.0 from Lena Ortiz</span>
          <Avatar name="Lena Ortiz" size={20} />
          <span style={{ fontSize: 13, color: C.dim }}>just now</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: C.success, fontFamily: MONO }}>+486</span>
          <span style={{ fontSize: 13, color: C.dim, fontFamily: MONO }}>−0</span>
          <span style={{ fontFamily: MONO, fontSize: 13, color: C.muted, padding: "2px 8px", borderRadius: 6, background: C.fill }}>3f9c2a1</span>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <div style={{ width: 320, flexShrink: 0, borderRight: `1px solid ${C.line}`, background: C.page }}>
            <div style={{ height: 38, padding: "0 16px", display: "flex", alignItems: "center", fontSize: 12.5, color: C.dim, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: `1px solid ${C.lineSoft}` }}>
              8 files added
              <span style={{ marginLeft: "auto", fontFamily: MONO, textTransform: "none", letterSpacing: 0 }}>apps/blog/</span>
            </div>
            <Tree nodes={INSTALL_FILES.map((f, i) => ({ name: f, depth: 0, status: "A", active: i === 2, appear: prog(t, start + i * 0.12, 0.45) }))} />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: C.page }}>
            <TabStrip tabs={[{ name: "apps/blog/components/post-card.tsx", active: true, status: "A" }]} right={<span>19 lines added</span>} />
            <DiffView lines={diff} lang="tsx" appear={(i) => prog(t, start + 0.36 + i * 0.05, 0.4)} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Ad Designer: a brief typed in, Muse Image bringing the three formats in. */
function AdDesigner({ t }: { t: number }): React.ReactElement {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="Ad Designer"
        action={
          <>
            <Tag tone="meta">
              <MuseGlyph size={18} /> Muse Image
            </Tag>
            <Button>Export</Button>
          </>
        }
      />
      <AdDesignerBody prompt={<Typed text="Spring collection for the shop, warm light, the tulips photo" at={cue(35, 0.0)} cps={40} color={C.meta} />} gen={[0, 1, 2].map((i) => prog(t, cue(35, 1.1) + i * 0.15, 0.9))} />
    </div>
  );
}

/** Site · Pages: the three pages the apps put on the site, each arriving as it's named. */
function SitePage(): React.ReactElement {
  const at = [0, 1, 2].map((i) => Math.min([say(36, "blog", -0.25), say(36, "forms", -0.25), say(36, "landing", -0.25)][i]!, cue(36, 0.25 + i * 0.16)));
  // three columns across the page card, less its padding and the gaps between them
  const width = (1408 - 48 - 36) / 3;
  const pages: [number, string, React.ReactNode][] = [
    [at[0]!, "studio.com/journal/forty-test-tiles-for-one-blue", <BlogPostPage />],
    [at[1]!, "studio.com/waitlist", <WaitlistPage />],
    [at[2]!, "studio.com/spring", <LandingPage />],
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title="Pages" action={<Tag>studio.com</Tag>}>
        <PageTabs items={["Pages", "Navigation", "Design", "Domains"]} active={0} />
      </PageHeader>
      <Toolbar placeholder="Search pages" chips={["All", "Blog", "Forms", "Landing Pages"]} count="3 live · 1 draft" style={{ margin: "0 24px 14px" }} />
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, padding: "0 24px 24px", overflow: "hidden" }}>
        {pages.map(([a, url, node]) => (
          <SitePreview key={url} url={url} width={width}>
            <Appear at={a} y={60} dur={0.7}>{node}</Appear>
          </SitePreview>
        ))}
      </div>
    </div>
  );
}

// the Journal's posts, as the demo workspace seeds them (core/demo/seed.ts), newest first
const POSTS: [string, "Draft" | "Published", string, string, string][] = [
  ["Market Days This Summer", "Draft", "Maya Chen", "", "Nov 3"],
  ["Summer Glazes: First Tests", "Draft", "Leo Dubois", "", "Nov 1"],
  ["New Packaging, Less Plastic", "Draft", "Maya Chen", "", "Oct 29"],
  ["Now Stocking Six Shops", "Published", "Maya Chen", "1,204", "Oct 23"],
  ["The Waitlist Is Open", "Published", "Leo Dubois", "2,077", "Oct 5"],
  ["Forty Test Tiles for One Blue", "Published", "Maya Chen", "1,562", "Oct 1"],
  ["How We Fire", "Published", "Leo Dubois", "980", "Sep 17"],
  ["A Tour of the Studio", "Published", "Maya Chen", "1,110", "Sep 3"],
  ["Why We Sell Seconds", "Published", "Maya Chen", "742", "Aug 21"],
  ["Caring for Stoneware", "Published", "Leo Dubois", "655", "Aug 8"],
];

/** Blog · Posts: the app's own admin, with Muse's draft arriving at the top. */
function BlogAdmin({ t }: { t: number }): React.ReactElement {
  const newPost = prog(t, SENT() + 1.1, 0.6);
  const n = newPost > 0.5 ? 11 : 10;
  const cols = [{ label: "Title" }, { label: "Status", width: 108 }, { label: "Author", width: 150 }, { label: "Views", width: 64, align: "right" as const }, { label: "Updated", width: 72, align: "right" as const }];
  const title = (s: string) => <span style={{ display: "inline-flex", alignItems: "center", gap: 10, color: C.strong }}><FileCodeIcon style={{ width: 15, height: 15, color: C.dim, flexShrink: 0 }} />{s}</span>;
  return (
    <div style={{ height: "100%" }}>
      <PageHeader title="Posts" action={<Button primary>New Post</Button>} />
      <Toolbar placeholder="Search posts" chips={[`All ${n}`, "Published 7", `Drafts ${n - 7}`]} count={`${n} posts`} style={{ margin: "0 24px 10px" }} />
      <div style={{ margin: "0 24px" }}>
        <Table cols={cols} rows={[]} />
        <div style={{ height: 42 * newPost, overflow: "hidden" }}>
          <Table
            header={false}
            cols={cols}
            rows={[{ key: "new", lit: newPost, style: { opacity: newPost }, cells: [title("The Spring Launch Is Here"), <Dot key="s">Draft</Dot>, <span key="a" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: C.meta }}><MuseGlyph size={18} />Muse Code</span>, "", <span key="d" style={{ color: C.muted }}>Now</span>] }]}
          />
        </div>
        <Table
          header={false}
          cols={cols}
          rows={POSTS.map(([name, status, author, views, date]) => ({
            key: name,
            selected: name === "Forty Test Tiles for One Blue" ? 1 : 0,
            cells: [title(name), <Dot key="s" tone={status === "Draft" ? "neutral" : "success"}>{status}</Dot>, <Person key="a" name={author} size={20} />, <span key="v" style={{ color: views ? C.fg : C.dim, fontVariantNumeric: "tabular-nums" }}>{views || "—"}</span>, <span key="d" style={{ color: C.muted }}>{date}</span>],
          }))}
        />
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
    <div style={{ position: "absolute", inset: 0, zIndex: 5, background: tint(C.page, open * 62), display: "grid", placeItems: "center" }}>
      <div style={{ width: 760, height: 246 + 92 * muse, overflow: "hidden", borderRadius: 16, background: C.panel, border: `1px solid ${C.line}`, padding: 28, display: "flex", flexDirection: "column", opacity: open, transform: `translateY(${(1 - open) * 16}px) scale(${0.98 + 0.02 * open})`, boxShadow: "0 30px 80px rgb(0 0 0 / 55%)" }}>
        <div style={{ fontSize: 21, color: C.strong }}>Blog 1.1.0 doesn't apply cleanly</div>
        <div style={{ fontSize: 14.5, color: C.muted, marginTop: 6 }}>You changed 2 files this update touches</div>
        <div style={{ display: "flex", gap: 12, marginTop: 22, opacity: 1 - never * 0.4 }}>
          {options.map(({ label, note, icon: Icon, k }) => (
            <div key={label} style={{ flex: 1, height: 118, borderRadius: 12, padding: 18, background: C.card, border: `1px solid ${k > 0.02 ? tint(C.strong, 10 + k * 22) : C.line}`, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
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
        <div style={{ height: 76, flexShrink: 0, borderRadius: 12, padding: "0 18px", display: "flex", alignItems: "center", gap: 14, background: C.metaSoft, border: `1px solid ${tint(C.meta, 45)}`, opacity: muse, transform: `translateY(${(1 - muse) * 14}px) scale(${1 - pressed * 0.015})`, boxShadow: `0 0 ${30 * muse}px ${tint(C.meta, muse * 22)}` }}>
          <MuseGlyph size={34} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16.5, color: C.strong }}>Update with Muse</div>
            <div style={{ fontSize: 13.5, color: C.meta, marginTop: 2 }}>Merge 1.1.0 around your changes</div>
          </div>
          <Button meta>Merge</Button>
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
    if (conflict > 0) return <Tag tone="danger" style={{ opacity: 0.4 + 0.6 * conflict }}><XIcon style={{ width: 12, height: 12 }} /> Conflict</Tag>;
    return <Tag>Edited</Tag>;
  };
  const fix = prog(t, say(39, "fixes", -0.1), 0.5);
  const apps: { name: string; v: string; by: string; icon: LucideIcon; on: string; update?: boolean }[] = [
    { name: "Blog", v: done ? "1.1.0" : "1.0.0", by: "Lena Ortiz", icon: NewspaperIcon, on: "Today", update: true },
    { name: "Ad Designer", v: "2.3.1", by: "Studio Kit", icon: ImageIcon, on: "Oct 12" },
    { name: "Notes", v: "0.1.0", by: "SuperGrid", icon: SquarePlusIcon, on: "Oct 2" },
    { name: "Site", v: "0.1.0", by: "SuperGrid", icon: SquarePlusIcon, on: "Oct 2" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      <PageHeader title="Apps">
        <PageTabs items={["Store", "Installed", "Build"]} active={1} />
      </PageHeader>
      <div style={{ margin: "0 24px" }}>
        {apps.map((a) => {
          const Icon = a.icon;
          return (
            <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 14, height: 64, borderBottom: `1px solid ${C.lineSoft}` }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: C.raised, display: "grid", placeItems: "center" }}>
                <Icon style={{ width: 17, height: 17, color: a.update ? C.fg : C.muted }} />
              </div>
              <div style={{ width: 220 }}>
                <div style={{ fontSize: 15.5, color: C.strong }}>{a.name}</div>
                <div style={{ fontSize: 13, color: C.muted, display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
                  <Avatar name={a.by} size={15} /> {a.by}
                </div>
              </div>
              <span style={{ width: 90, fontFamily: MONO, fontSize: 13, color: C.fg }}>{a.v}</span>
              <span style={{ width: 150, fontSize: 13, color: C.muted }}>Installed {a.on}</span>
              <div style={{ flex: 1 }} />
              {a.update ? (
                done ? (
                  <Tag tone="success">
                    <CheckIcon style={{ width: 12, height: 12 }} /> Up to date
                  </Tag>
                ) : (
                  <>
                    <Tag tone="accent">1.1.0 available</Tag>
                    {merging ? (
                      <Button style={{ color: C.meta }}>
                        <Spinner /> Merging
                      </Button>
                    ) : (
                      <Button primary>Update</Button>
                    )}
                  </>
                )
              ) : (
                <Tag>
                  <CheckIcon style={{ width: 12, height: 12 }} /> Up to date
                </Tag>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ flex: 1, display: "flex", gap: 14, padding: "20px 24px 24px" }}>
        <Appear at={cue(38, 0.7)} y={20} style={{ flex: 1, display: "flex" }}>
          <div style={{ flex: 1, borderRadius: 12, border: `1px solid ${C.line}`, background: C.card, padding: 20, display: "flex", flexDirection: "column" }}>
            <SectionHead title="What's new in Blog 1.1.0" action={<span style={{ fontFamily: MONO }}>a71e0d4</span>} />
            {["Share buttons on every post", "A faster RSS feed", "Fix for dates in Safari"].map((x, i) => (
              <Appear key={x} at={cue(38, 1.0) + i * 0.15} y={8}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, height: 38, padding: "0 8px", margin: "0 -8px", borderRadius: 8, fontSize: 14.5, color: C.fg, borderTop: i ? `1px solid ${C.lineSoft}` : undefined, background: i === 2 ? tint(C.success, 10 * fix) : undefined }}>
                  {i === 2 ? <WrenchIcon style={{ width: 15, height: 15, color: C.success }} /> : <PlusIcon style={{ width: 15, height: 15, color: C.success }} />} {x}
                </div>
              </Appear>
            ))}
            <Appear at={cue(38, 1.6)} y={8} style={{ marginTop: 18 }}>
              <div style={{ fontSize: 12.5, color: C.dim, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Files in 1.1.0</div>
              {[
                ["components/post-footer.tsx", "+24", "−6"],
                ["components/share-buttons.tsx", "+41", ""],
                ["feed.ts", "+18", "−8"],
                ["lib/dates.ts", "+3", "−1"],
              ].map(([f, add, del], i) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, height: 30, fontSize: 13, color: C.fg, borderTop: i ? `1px solid ${C.lineSoft}` : undefined }}>
                  <FileCodeIcon style={{ width: 14, height: 14, color: C.dim }} />
                  <span style={{ flex: 1, fontFamily: MONO, fontSize: 13 }}>{f}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12.5, color: C.success }}>{add}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12.5, color: del ? C.danger : C.dim, width: 26, textAlign: "right" }}>{del || "−0"}</span>
                </div>
              ))}
            </Appear>
            <div style={{ flex: 1 }} />
            <Appear at={say(39, "every customer", -0.1)} y={8}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: C.muted }}>
                <UsersIcon style={{ width: 14, height: 14 }} /> Shipped once by Lena Ortiz, to every install
              </div>
            </Appear>
          </div>
        </Appear>
        <Appear at={cue(38, 0.85)} y={20} style={{ flex: 1, display: "flex" }}>
          <div style={{ flex: 1, borderRadius: 12, border: `1px solid ${conflict > 0 && merged < 1 ? tint(C.danger, 15 + conflict * (1 - merged) * 25) : C.line}`, background: C.card, padding: 20, display: "flex", flexDirection: "column" }}>
            <SectionHead title="Your copy" count={2} action="Changed since 1.0.0" />
            {["components/post-footer.tsx", "routes.ts"].map((f, i) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, height: 38, fontSize: 14, color: C.fg, borderTop: i ? `1px solid ${C.lineSoft}` : undefined }}>
                <FileCodeIcon style={{ width: 15, height: 15, color: C.muted }} />
                <span style={{ flex: 1, fontFamily: MONO, fontSize: 13.5 }}>{f}</span>
                <span style={{ fontFamily: MONO, fontSize: 12.5, color: C.warning, marginRight: 6 }}>M</span>
                {fileState(i)}
              </div>
            ))}
            <Appear at={cue(38, 1.3)} y={8} style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12.5, color: C.dim, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Your change · post-footer.tsx</div>
              <div style={{ borderRadius: 8, background: C.page, border: `1px solid ${C.lineSoft}`, overflow: "hidden" }}>
                <DiffView
                  lang="tsx"
                  oldFrom={12}
                  newFrom={12}
                  style={{ fontSize: 12.5, padding: "4px 0" }}
                  lines={[
                    { kind: " ", text: "<PostFooter>" },
                    { kind: "+", text: "  <SignupForm />", note: <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.meta }}><MuseGlyph size={14} />Muse · Today</span> },
                    { kind: " ", text: "</PostFooter>" },
                  ]}
                />
              </div>
            </Appear>
            <div style={{ flex: 1 }} />
            <div style={{ position: "relative", height: 30, marginTop: 12, fontSize: 14 }}>
              <Swap
                y={8}
                items={[
                  { at: cue(38, 1.0), node: <span style={{ color: C.muted }}>You changed 2 files in Blog</span> },
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
    const items: SubItem[] = [{ label: "Posts", icon: NewspaperIcon, active: true, meta: 10 }, { label: "Authors", icon: UsersIcon, meta: 2 }, { label: "Categories", icon: FolderIcon, meta: 4 }, { label: "Comments", icon: PenLineIcon, meta: 38 }, { label: "Settings", group: "Settings" }, { label: "Files", icon: CodeIcon, group: "Developer" }];
    return <SubNav title="Blog" items={items} />;
  }
  const active = key === "code:Git" ? "Git" : "Files";
  return <SubNav title="Code" items={["Files", "Git", "Server", "Deploys"].map((l) => ({ label: l, icon: { Files: FolderIcon, Git: GitBranchIcon, Server: ServerIcon, Deploys: RocketIcon }[l], active: l === active, meta: l === "Git" && active === "Git" ? "main" : undefined }))} />;
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
    <ChatPanel live={t >= sent && t < sent + 1.8 ? 1 : 0} draft={t < sent ? <Typed text={PROMPT} at={cue(37, 0.75)} cps={50} color={C.accent} /> : undefined}>
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
    <div style={{ borderRadius: 8, background: C.page, border: `1px solid ${C.lineSoft}`, overflow: "hidden" }}>
      <DiffView
        lang="tsx"
        oldFrom={12}
        newFrom={12}
        style={{ fontSize: 12.5, padding: "4px 0" }}
        lines={[
          { kind: " ", text: "<PostFooter>" },
          { kind: "+", text: "  <ShareButtons />", note: <span style={{ color: C.dim }}>1.1.0</span> },
          { kind: " ", text: "  <SignupForm />", note: <span style={{ color: C.accent }}>yours</span> },
          { kind: " ", text: "</PostFooter>" },
        ]}
      />
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
        <div style={{ borderRadius: 10, padding: "12px 12px 12px 14px", background: C.card, border: `1px solid ${approved ? tint(C.success, 30) : tint(C.meta, 40)}`, display: "flex", alignItems: "center", gap: 10 }}>
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
        [cue(29, 0.75), 840, 475],
        [cue(29, 1.05), 840, 475],
        [cue(29, 1.45), 1088, 692],
        [cue(30, 0.05), 1088, 692],
        [cue(30, 1.5), 1055, 628],
        [cue(30, 1.8), 1055, 628],
        [cue(30, 2.1), 1089, 628],
        [cue(31, 0.05), 1089, 628],
        [cue(31, 0.5), 1047, 562],
      ],
      clicks: [cue(29, 0.9), cue(29, 1.6), cue(30, -0.2), cue(30, 1.7), cue(31, -0.2), cue(31, 0.7)],
      hideAt: ws - 0.05,
    },
    {
      from: cue(32, 0.3),
      path: [
        [cue(33, -0.5), 1000, 600],
        [say(33, "install", 0.15), 638, 301],
        [INSTALL() + 0.8, 690, 360],
      ],
      clicks: [INSTALL()],
      hideAt: cue(34, -0.2),
    },
    {
      from: cue(40, 0.6),
      path: [
        [cue(40, 1.0), 1300, 520],
        [UPDATE_CLICK() - 0.25, 1576, 142],
        [UPDATE_CLICK() + 0.15, 1576, 142],
        [say(41, "own the code", 0.05), 790, 468],
        [say(41, "get the updates", -0.25), 790, 468],
        [say(41, "get the updates", 0.2), 1130, 468],
        [say(42, "never", 0.1), 1130, 468],
        [cue(43, 0.1), 1010, 600],
        [MERGE_CLICK() - 0.2, 1228, 553],
        [MERGE_CLICK() + 0.12, 1228, 553],
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
