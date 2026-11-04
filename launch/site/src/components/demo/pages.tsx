"use client";

import {
  ActivityIcon,
  ArrowRightIcon,
  ChartColumnIcon,
  CheckIcon,
  ClapperboardIcon,
  DatabaseIcon,
  EyeIcon,
  FileCodeIcon,
  FileIcon,
  FolderIcon,
  GitBranchIcon,
  GlobeIcon,
  HistoryIcon,
  ImageIcon,
  LayersIcon,
  LibraryIcon,
  ListOrderedIcon,
  MapIcon,
  MaximizeIcon,
  MessageSquareIcon,
  PaletteIcon,
  PauseIcon,
  PlayIcon,
  RocketIcon,
  ScrollTextIcon,
  ServerIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  SquareIcon,
  SquareTerminalIcon,
  TableIcon,
  TagsIcon,
  TypeIcon,
  Volume2Icon,
  WandSparklesIcon,
  WebhookIcon,
  WorkflowIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { MuseGlyph } from "@/components/brand";
import { PHOTOS, type PhotoId } from "./photos";
import { CATALOG, useDemo, type AppId } from "./state";
import { AreaChart, Avatar, Bars, Box, BoxTitle, Btn, Dot, Meter, Page, Person, Photo, Spinner, Stat, Switch, Table, Tabs, Tag, Toolbar, cx, useWidth } from "./ui";

// Every page the demo can show, looked up from the route. Each returns its breadcrumb, the main
// action the title bar carries (title-bar-breadcrumb-only), the second panel's items when the
// section has one, and the page itself.

export type SubItem = { label: string; to: string; icon?: LucideIcon; meta?: string };
export type SubNav = { title: string; groups: { label?: string; items: SubItem[] }[] };
export type Resolved = { crumbs: string[]; action?: { label: string; run: () => void }; sub?: SubNav; body: ReactNode };

type D = ReturnType<typeof useDemo>;

export function resolve(route: string, d: D): Resolved {
  const [head, a, b, c] = route.split("/");
  if (head === "store") return { crumbs: ["App Store"], body: <StorePage /> };
  if (head === "apps" && a) return appPage(a as AppId, b, c, d);
  if (head === "database") {
    const sub: SubNav = { title: "Database", groups: [{ label: "Tables", items: TABLES.map((t) => ({ label: t, to: `database/${t}`, icon: TableIcon, meta: DB[t]!.short })) }, { items: [{ label: "Query", to: "database/query", icon: SquareTerminalIcon }, { label: "Migrations", to: "database/migrations", icon: ListOrderedIcon }, { label: "Backups", to: "database/backups", icon: HistoryIcon }] }] };
    if (a === "query") return { crumbs: ["Database", "Query"], sub, body: <QueryPage /> };
    if (a === "migrations") return { crumbs: ["Database", "Migrations"], sub, body: <MigrationsPage /> };
    if (a === "backups") return { crumbs: ["Database", "Backups"], sub, body: <BackupsPage /> };
    const t = a && TABLES.includes(a) ? a : "contacts";
    return { crumbs: ["Database", t], sub, action: { label: "New Row", run: () => d.say("Rows open in a side sheet in the app") }, body: <TablePage table={t} /> };
  }
  if (head === "workflows") {
    const sub: SubNav = {
      title: "Workflows",
      groups: [
        { label: "Workflows", items: WORKFLOWS.map((w) => ({ label: w.name, to: `workflows/flow/${w.id}`, icon: WorkflowIcon })) },
        { label: "Reports", items: [{ label: "Signups", to: "workflows/reports", icon: ChartColumnIcon }] },
        { label: "System", items: [{ label: "Events", to: "workflows/events", icon: ActivityIcon }, { label: "Logging", to: "workflows/logging", icon: ScrollTextIcon }, { label: "Hooks", to: "workflows/hooks", icon: WebhookIcon }] },
      ],
    };
    if (a === "reports") return { crumbs: ["Workflows", "Signups"], sub, body: <ReportPage /> };
    if (a === "events") return { crumbs: ["Workflows", "Events"], sub, body: <EventsPage /> };
    if (a === "logging") return { crumbs: ["Workflows", "Logging"], sub, body: <LogPage /> };
    if (a === "hooks") return { crumbs: ["Workflows", "Hooks"], sub, body: <HooksPage /> };
    const w = WORKFLOWS.find((x) => x.id === b) ?? WORKFLOWS[0]!;
    return { crumbs: ["Workflows", w.name], sub, action: { label: "New Workflow", run: () => d.say("Describe it to Muse Code and it builds the steps") }, body: <FlowPage key={w.id} flow={w} /> };
  }
  if (head === "library") {
    const items: SubItem[] = [
      { label: "Images", to: "library/images", icon: ImageIcon },
      { label: "Media", to: "library/media", icon: ClapperboardIcon },
      { label: "Files", to: "library/files", icon: FolderIcon },
      { label: "Themes", to: "library/themes", icon: PaletteIcon },
      { label: "Skills", to: "library/skills", icon: SparklesIcon },
      { label: "Sitemap", to: "library/sitemap", icon: MapIcon },
    ];
    const sub: SubNav = { title: "Library", groups: [{ items }] };
    const page = items.find((i) => i.to === route) ?? items[0]!;
    const body = { Images: <ImagesPage />, Media: <MediaPage />, Files: <FilesPage />, Themes: <SiteThemesPage />, Skills: <SkillsPage />, Sitemap: <SitemapPage /> }[page.label];
    const action = page.label === "Images" || page.label === "Media" || page.label === "Files" ? { label: "Upload", run: () => d.say("Uploads go straight to your own Cloudflare account") } : undefined;
    return { crumbs: ["Library", page.label], sub, action, body };
  }
  if (head === "code") {
    const items: SubItem[] = [
      { label: "Files", to: "code/files", icon: FolderIcon },
      { label: "Git", to: "code/git", icon: GitBranchIcon },
      { label: "Server", to: "code/server", icon: ServerIcon },
      { label: "Deploys", to: "code/deploys", icon: RocketIcon },
    ];
    const sub: SubNav = { title: "Code", groups: [{ items }] };
    const page = items.find((i) => i.to === route) ?? items[0]!;
    const body = { Files: <CodeFilesPage />, Git: <GitPage />, Server: <ServerPage />, Deploys: <DeploysPage /> }[page.label];
    return { crumbs: ["Code", page.label], sub, body };
  }
  return { crumbs: ["Studio"], body: <HomePage /> };
}

function appPage(id: AppId, b: string | undefined, c: string | undefined, d: D): Resolved {
  const app = CATALOG[id];
  if (!d.installed.includes(id)) return { crumbs: ["App Store"], body: <StorePage /> };
  const base = `apps/${id}`;
  if (id === "blog") {
    const sub: SubNav = { title: "Blog", groups: [{ items: [{ label: "Posts", to: base, icon: FileIcon, meta: String(d.posts.length) }, { label: "Categories", to: `${base}/categories`, icon: TagsIcon }, { label: "Comments", to: `${base}/comments`, icon: MessageSquareIcon, meta: "3" }] }, { label: "Settings", items: [{ label: "Site & SEO", to: `${base}/settings`, icon: GlobeIcon }] }] };
    const newPost = { label: "New Post", run: () => d.go(`${base}/post/${d.addPost({ title: "Untitled post", status: "Draft", author: "Maya Chen", updated: "Just now", body: "" })}`) };
    if (b === "post") {
      const post = d.posts.find((p) => String(p.id) === c);
      if (post) return { crumbs: ["Blog", "Posts", post.title], sub, body: <PostEditor key={post.id} id={post.id} /> };
    }
    if (b === "categories") return { crumbs: ["Blog", "Categories"], sub, body: <CategoriesPage /> };
    if (b === "comments") return { crumbs: ["Blog", "Comments"], sub, body: <CommentsPage /> };
    if (b === "settings") return { crumbs: ["Blog", "Site & SEO"], sub, body: <BlogSettings /> };
    return { crumbs: ["Blog", "Posts"], sub, action: newPost, body: <PostsPage /> };
  }
  if (id === "forms") {
    const sub: SubNav = { title: "Forms", groups: [{ items: [{ label: "Forms", to: base, icon: FileIcon }, { label: "Submissions", to: `${base}/submissions`, icon: TableIcon, meta: "1,284" }] }] };
    if (b === "submissions") return { crumbs: ["Forms", "Submissions"], sub, body: <TablePage table="form_submissions" bare /> };
    return { crumbs: ["Forms", "Forms"], sub, action: { label: "New Form", run: () => d.say("Forms are built from fields, or by asking Muse Code") }, body: <FormsPage /> };
  }
  if (id === "landing") {
    const sub: SubNav = { title: "Landing Pages", groups: [{ items: [{ label: "Pages", to: base, icon: FileIcon }, { label: "Templates", to: `${base}/templates`, icon: LibraryIcon }] }] };
    return { crumbs: ["Landing Pages", b === "templates" ? "Templates" : "Pages"], sub, action: { label: "New Page", run: () => d.say("Pick a template, or describe the page to Muse Code") }, body: <LandingPage templates={b === "templates"} /> };
  }
  if (id === "ads") return { crumbs: ["Ad Designer"], body: <AdDesigner /> };
  if (id === "newsletter") {
    const sub: SubNav = { title: "Newsletter", groups: [{ items: [{ label: "Campaigns", to: base, icon: FileIcon }, { label: "Subscribers", to: `${base}/subscribers`, icon: TableIcon, meta: "1,284" }] }] };
    if (b === "subscribers") return { crumbs: ["Newsletter", "Subscribers"], sub, body: <TablePage table="contacts" bare /> };
    return { crumbs: ["Newsletter", "Campaigns"], sub, action: { label: "New Campaign", run: () => d.say("Campaigns go to a tag or a segment of contacts") }, body: <NewsletterPage /> };
  }
  return { crumbs: [app.name], body: <InstalledPage id={id} /> };
}


// ---- Home ----

// Visits a day, with a weekly rhythm and the spring launch spike, for 7, 30 and 90 days.
function visits(days: number, seed: number) {
  return Array.from({ length: days }, (_, i) => {
    const d = days - 1 - i; // days ago; the launch was nine days ago
    const launch = d <= 9 ? 1 + 1.8 * Math.exp(-(9 - d) / 3) : 1;
    const weekend = i % 7 === 5 || i % 7 === 6 ? 1.22 : 1;
    return Math.round((seed + (i / days) * seed * 0.5) * launch * weekend * (0.88 + 0.24 * Math.abs(Math.sin(i * 1.7))));
  });
}

const RANGES: Record<string, { values: number[]; labels: string[]; stats: [string, string, string][] }> = {
  "7D": { values: visits(7, 520), labels: ["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue"], stats: [["Visitors", "4,816", "+18%"], ["Signups", "128", "+24%"], ["Orders", "41", "+9%"], ["Revenue", "$3,212", "+12%"]] },
  "30D": { values: visits(30, 420), labels: ["Oct 6", "Oct 13", "Oct 20", "Oct 27", "Nov 3"], stats: [["Visitors", "18,402", "+34%"], ["Signups", "563", "+61%"], ["Orders", "164", "+27%"], ["Revenue", "$12,940", "+31%"]] },
  "90D": { values: visits(90, 300), labels: ["Aug", "Sep", "Oct", "Nov"], stats: [["Visitors", "41,077", "+52%"], ["Signups", "1,284", "+88%"], ["Orders", "389", "+40%"], ["Revenue", "$30,516", "+46%"]] },
};

function HomePage() {
  const { go, installed } = useDemo();
  const [range, setRange] = useState("30D");
  const r = RANGES[range]!;
  return (
    <Page title="Studio" aside={<Tag className="ml-1 font-mono">studio.supergrid.app</Tag>}>
      <div className="@container">
        <Box className="p-4">
          <BoxTitle icon={ChartColumnIcon} aside={<Tabs items={Object.keys(RANGES)} value={range} onChange={setRange} />}>
            Analytics
          </BoxTitle>
          <div className="mt-3 grid grid-cols-2 gap-2.5 @min-[560px]:grid-cols-4">
            {r.stats.map(([k, v, dl]) => (
              <Stat key={k} label={k} value={v} delta={dl} />
            ))}
          </div>
          <AreaChart key={range} values={r.values} labels={r.labels} height={120} className="mt-4" point={(i) => `visits · ${r.values.length - 1 - i ? `${r.values.length - 1 - i}d ago` : "today"}`} />
        </Box>
        <div className="mt-3 grid gap-3 @min-[560px]:grid-cols-2 @min-[900px]:grid-cols-3">
          <Box className="p-4" onClick={() => go("workflows/events")}>
            <BoxTitle icon={ActivityIcon} aside={<Dot tone="success">Live</Dot>}>
              Events
            </BoxTitle>
            <div className="mt-2 divide-y divide-(--i-line)">
              {HOME_EVENTS.map(([name, who, detail, when]) => (
                <div key={name + when} className="flex h-9 items-center gap-2 text-[13px]">
                  {who ? <Avatar name={who} size={20} /> : <span className="grid size-5 shrink-0 place-items-center rounded-full bg-(--i-fill)"><GlobeIcon className="size-3 text-(--i-muted)" /></span>}
                  <span className="shrink-0 font-mono text-[12px] text-(--i-strong)">{name}</span>
                  <span className="min-w-0 flex-1 truncate text-(--i-muted)">{detail}</span>
                  <span className="shrink-0 text-[12px] text-(--i-muted)">{when}</span>
                </div>
              ))}
            </div>
          </Box>
          <Box className="p-4" onClick={() => go("database/contacts")}>
            <BoxTitle icon={DatabaseIcon} aside={<Tag>D1</Tag>}>
              Database
            </BoxTitle>
            <div className="mt-2 divide-y divide-(--i-line)">
              {TABLES.map((t) => (
                <div key={t} className="flex h-9 items-center gap-2 text-[13px] text-(--i-fg)">
                  <TableIcon className="size-3.5 text-(--i-muted)" />
                  <span className="flex-1 font-mono text-[12.5px]">{t}</span>
                  <span className="text-(--i-muted) tabular-nums">{DB[t]!.count}</span>
                </div>
              ))}
            </div>
          </Box>
          <Box className="p-4" onClick={() => go("workflows/flow/new-subscriber")}>
            <BoxTitle icon={WorkflowIcon} aside={<span className="text-[12.5px] text-(--i-muted)">2 on</span>}>
              Workflows
            </BoxTitle>
            <div className="mt-1 divide-y divide-(--i-line)">
              {[
                ["New Subscriber", "form.submitted", ["Tag", "Email"], "212 runs", true],
                ["Big Orders Become VIP", "order.paid ≥ $250", ["Tag vip"], "12 runs", true],
                ["Post Published", "post.published", ["Campaign", "Slack"], "Off", false],
              ].map(([n, trig, steps, runs, on]) => (
                <div key={n as string} className="py-2.5">
                  <div className="flex items-center gap-2 text-[13.5px] text-(--i-strong)">
                    <span className={cx("relative h-4 w-[26px] shrink-0 rounded-full", on ? "bg-(--i-success)" : "bg-(--i-input)")}>
                      <span className={cx("absolute top-0.5 size-3 rounded-full bg-white", on ? "left-3" : "left-0.5")} />
                    </span>
                    <span className="truncate">{n}</span>
                    <span className="ml-auto shrink-0 text-[12px] text-(--i-muted)">{runs}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 overflow-hidden pl-[34px] text-[11.5px] text-(--i-muted)">
                    <ZapIcon className="size-3 shrink-0 text-(--i-warning)" />
                    <span className="font-mono whitespace-nowrap">{trig}</span>
                    {(steps as string[]).map((s) => (
                      <span key={s} className="flex shrink-0 items-center gap-1.5">
                        <span className="h-px w-2.5 bg-(--i-input)" />
                        <span className="rounded-md border border-(--i-line) px-1.5 py-px whitespace-nowrap">{s}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Box>
          <Box className="p-4" onClick={() => go("library/images")}>
            <BoxTitle icon={ImageIcon} aside={<span className="text-[12.5px] text-(--i-muted)">Images · Stream</span>}>
              Media Library
            </BoxTitle>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {(["cups-kiln", "glazes", "tulip-pink", "hands-wheel", "shelf-colour", "cup-speckled"] as PhotoId[]).map((p) => (
                <div key={p} className="aspect-square overflow-hidden rounded-md">
                  <Photo id={p} />
                </div>
              ))}
            </div>
          </Box>
          <Box className="p-4" onClick={() => go("store")}>
            <BoxTitle icon={ZapIcon} aside={<span className="text-[12.5px] text-(--i-muted)">{installed.length} installed</span>}>
              Apps
            </BoxTitle>
            <div className="mt-1 divide-y divide-(--i-line)">
              {installed.map((id) => {
                const A = CATALOG[id];
                return (
                  <div key={id} className="flex h-9 items-center gap-2 text-[13.5px] text-(--i-fg)">
                    <A.icon className="size-3.5 text-(--i-muted)" />
                    {A.name}
                    <span className="truncate text-[12px] text-(--i-muted)">{A.by}</span>
                    <span className="ml-auto font-mono text-[11.5px] text-(--i-muted)">{A.version}</span>
                  </div>
                );
              })}
            </div>
          </Box>
        </div>
      </div>
    </Page>
  );
}

const HOME_EVENTS: [string, string | null, string, string][] = [
  ["order.paid", "Nora Patel", "$92 · 2 mugs", "now"],
  ["form.submitted", "Felix Haddad", "Spring Waitlist", "2m"],
  ["page.viewed", null, "/spring-sale", "4m"],
  ["email.opened", "Iris Moreau", "The Seconds Shelf", "9m"],
  ["order.paid", "Ivy Chen", "$1,140 · wholesale", "26m"],
  ["post.published", "Maya Chen", "Forty Test Tiles", "2h"],
];

// ---- Store ----

function StorePage() {
  const { installed, installing, install, go } = useDemo();
  const [tab, setTab] = useState("All");
  const ids = (Object.keys(CATALOG) as AppId[]).filter((id) => tab === "All" || (tab === "Installed" ? installed.includes(id) : CATALOG[id].kind === tab));
  return (
    <Page title="App Store" aside={<Tabs items={["All", "Site", "Admin", "Installed"]} value={tab} onChange={setTab} />}>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {ids.map((id) => {
          const a = CATALOG[id];
          const has = installed.includes(id);
          const busy = installing === id;
          return (
            <Box key={id} className="flex flex-col p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-[10px] bg-(--i-fill)">
                  <a.icon className="size-[18px] text-(--i-fg)" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] text-(--i-strong)">{a.name}</div>
                  <div className="text-[12.5px] text-(--i-muted)">by {a.by}</div>
                </div>
              </div>
              <p className="mt-3 flex-1 text-[13px] leading-snug text-(--i-muted)">{a.blurb}</p>
              <div className="mt-3 flex items-center gap-2 text-[12.5px] text-(--i-muted)">
                {a.kind} · {a.price}
                <span className="flex-1" />
                {has ? (
                  <Btn onClick={() => go(`apps/${id}`)}>
                    Open <ArrowRightIcon className="size-3.5" />
                  </Btn>
                ) : (
                  <Btn primary onClick={() => install(id)} disabled={!!installing}>
                    {busy ? <Spinner /> : null}
                    {busy ? "Installing" : "Install"}
                  </Btn>
                )}
              </div>
            </Box>
          );
        })}
      </div>
      <p className="mt-4 text-[13px] text-(--i-muted)">Apps install into your workspace&apos;s own repo. Updates arrive as a merge Muse Code checks with you first</p>
    </Page>
  );
}

function InstalledPage({ id }: { id: AppId }) {
  const a = CATALOG[id];
  const files = ["manifest.json", "schema.sql", "routes.ts", "worker/index.ts", "admin/index.tsx", "mcp/tools.ts"];
  return (
    <Page title={a.name} aside={<Tag tone="success">Installed</Tag>}>
      <Box className="p-5">
        <BoxTitle icon={GitBranchIcon} aside={<span className="font-mono text-[12.5px] text-(--i-muted)">3f9c2a1</span>}>
          Install {a.name} {a.version} from {a.by}
        </BoxTitle>
        <div className="mt-3 divide-y divide-(--i-line) font-mono text-[12.5px]">
          {files.map((f) => (
            <div key={f} className="flex h-9 items-center gap-3 text-(--i-fg)">
              <span className="text-(--i-success)">+</span>
              <span className="flex-1">apps/{id}/{f}</span>
              <span className="text-(--i-success)">new</span>
            </div>
          ))}
        </div>
      </Box>
    </Page>
  );
}

// ---- Blog ----

function statusTone(s: string) {
  return s === "Published" ? "success" : s === "Scheduled" ? "meta" : "neutral";
}

function PostsPage() {
  const { posts, go } = useDemo();
  const [tab, setTab] = useState("All");
  const [q, setQ] = useState("");
  const shown = posts.filter((p) => (tab === "All" || p.status === tab) && (!q || p.title.toLowerCase().includes(q.toLowerCase())));
  const n = (s: string) => posts.filter((p) => p.status === s).length;
  const [box, width] = useWidth<HTMLDivElement>();
  const wide = !width || width >= 620;
  return (
    <Page title="Posts">
      <div ref={box}>
        <Toolbar query={q} onQuery={setQ} placeholder="Search posts" chips={["All", "Published", "Draft", "Scheduled"]} chip={tab} onChip={setTab} count={`${posts.length} posts · ${n("Published")} live`} />
        <Table
          cols={[{ label: "Title", w: "minmax(0,1fr)" }, { label: "Status", w: "100px" }, { label: wide ? "Author" : "", w: wide ? "130px" : "24px" }, { label: "Views", w: "56px", align: "right" }, ...(wide ? [{ label: "Updated", w: "76px", align: "right" as const }] : [])]}
          rows={shown.map((p) => [
            <span key="t" className="flex min-w-0 items-center gap-3">
              <span className="size-7 shrink-0 overflow-hidden rounded-md bg-(--i-fill)">{p.cover ? <Photo id={p.cover} /> : null}</span>
              <span className="truncate">{p.title}</span>
            </span>,
            <Dot key="s" tone={statusTone(p.status)}>{p.status}</Dot>,
            p.author === "Muse Code" ? (
              <span key="a" className="inline-flex items-center gap-2 text-(--i-meta)">
                <MuseGlyph className="h-2 w-4" /> {wide ? "Muse Code" : null}
              </span>
            ) : wide ? (
              <Person key="a" name={p.author} size={20} />
            ) : (
              <Avatar key="a" name={p.author} size={20} />
            ),
            <span key="v" className={cx("tabular-nums", p.views ? "text-(--i-fg)" : "text-(--i-muted)")}>{p.views ? p.views.toLocaleString() : "—"}</span>,
            ...(wide ? [<span key="u" className="text-(--i-muted)">{p.updated}</span>] : []),
          ])}
          onRow={(i) => go(`apps/blog/post/${shown[i]!.id}`)}
        />
      </div>
    </Page>
  );
}

function PostEditor({ id }: { id: number }) {
  const { posts, updatePost, say } = useDemo();
  const post = posts.find((p) => p.id === id)!;
  const [publishing, setPublishing] = useState(false);
  const publish = () => {
    setPublishing(true);
    setTimeout(() => {
      updatePost(id, { status: "Published", updated: "Just now" });
      setPublishing(false);
      say("Published, and post.published went out to your workflows");
    }, 900);
  };
  const slug = post.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const words = post.body.trim() ? post.body.trim().split(/\s+/).length : 0;
  return (
    <div className="flex h-full min-h-0">
      <div className="demo-scroll min-w-0 flex-1 overflow-y-auto px-8 py-7">
        {post.cover ? (
          <div className="group relative mb-6 h-44 overflow-hidden rounded-xl">
            <Photo id={post.cover} focus="50% 40%" />
            <span className="absolute right-3 bottom-3 rounded-md bg-black/55 px-2.5 py-1 text-[12.5px] text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">Change Cover</span>
          </div>
        ) : (
          <button type="button" onClick={() => updatePost(id, { cover: "shelf-white" })} className="mb-6 flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-(--i-input) px-3 text-[13px] text-(--i-muted) hover:text-(--i-fg)">
            <ImageIcon className="size-4" /> Add a Cover from the Library
          </button>
        )}
        <textarea value={post.title} onChange={(e) => updatePost(id, { title: e.target.value.replace(/\n/g, "") })} rows={1} className="field-sizing-content w-full resize-none bg-transparent text-[28px] leading-tight text-(--i-strong) outline-none" />
        <textarea
          value={post.body}
          onChange={(e) => updatePost(id, { body: e.target.value })}
          placeholder="Write, or ask Muse Code for a draft"
          className="mt-4 h-[300px] w-full resize-none bg-transparent text-[15px] leading-relaxed text-(--i-fg) outline-none placeholder:text-(--i-muted)"
        />
      </div>
      <div className="w-[210px] shrink-0 space-y-4 border-l border-(--i-line) p-5 text-[13.5px]">
        <Field label="Status">
          <Dot tone={statusTone(post.status)}>{post.status}</Dot>
        </Field>
        <Field label="Slug">
          <span className="font-mono text-[12.5px] break-all text-(--i-fg)">/journal/{slug || "untitled"}</span>
        </Field>
        <Field label="Author">{post.author === "Muse Code" ? post.author : <Person name={post.author} size={20} />}</Field>
        <Field label="Category">Studio Notes</Field>
        <Field label="Length">
          {words} words · {Math.max(1, Math.round(words / 220))} min read
        </Field>
        {post.status === "Published" ? (
          <Btn className="w-full justify-center">
            <CheckIcon className="size-4 text-(--i-success)" /> Published
          </Btn>
        ) : (
          <Btn primary className="w-full justify-center" onClick={publish} disabled={publishing}>
            {publishing ? <Spinner /> : null}
            {publishing ? "Publishing" : "Publish"}
          </Btn>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[12.5px] text-(--i-muted)">{label}</div>
      <div className="text-(--i-fg)">{children}</div>
    </div>
  );
}

function CategoriesPage() {
  return (
    <Page title="Categories">
      <Table cols={[{ label: "Name", w: "2fr" }, { label: "Slug", w: "1.4fr" }, { label: "Posts", w: "0.6fr", align: "right" }]} mono={[1]} rows={[["Studio Notes", "studio-notes", "11"], ["Glazes", "glazes", "6"], ["Classes", "classes", "4"], ["Shop News", "shop-news", "3"]]} />
    </Page>
  );
}

function CommentsPage() {
  const [done, setDone] = useState<number[]>([]);
  const list = [
    { who: "Iris Moreau", on: "Forty Test Tiles for One Blue", text: "Tile 31 is the one. Will that blue come in a bowl too?" },
    { who: "Sam Kline", on: "How We Fire", text: "Twelve hours with the door shut, I'd never manage it" },
    { who: "Priya Nair", on: "A Tour of the Studio", text: "Booked a Saturday class after reading this, see you in March" },
  ];
  return (
    <Page title="Comments">
      <div className="space-y-3">
        {list.map((c, i) => (
          <Box key={i} className="flex items-start gap-3 p-4">
            <Avatar name={c.who} size={32} />
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] text-(--i-strong)">
                {c.who} <span className="text-(--i-muted)">on {c.on}</span>
              </div>
              <p className="mt-1 text-[13.5px] text-(--i-fg)">{c.text}</p>
            </div>
            {done.includes(i) ? <Tag tone="success">Approved</Tag> : <Btn onClick={() => setDone((d) => [...d, i])}>Approve</Btn>}
          </Box>
        ))}
      </div>
    </Page>
  );
}

function BlogSettings() {
  const [rss, setRss] = useState(true);
  const [comments, setComments] = useState(true);
  return (
    <Page title="Site & SEO">
      <Box className="divide-y divide-(--i-line)">
        {[
          ["Address", <span key="a" className="font-mono text-[12.5px]">studio.supergrid.app/journal</span>],
          ["RSS Feed", <Switch key="r" on={rss} onChange={setRss} />],
          ["Comments", <Switch key="c" on={comments} onChange={setComments} />],
          ["Theme", <Tag key="t">Studio Light</Tag>],
        ].map(([k, v]) => (
          <div key={k as string} className="flex h-13 items-center px-4 text-[13.5px] text-(--i-fg)">
            <span className="flex-1">{k}</span>
            {v}
          </div>
        ))}
      </Box>
    </Page>
  );
}

// ---- Forms, landing pages, ads, newsletter ----

function FormsPage() {
  const { go } = useDemo();
  const forms = [
    { name: "Newsletter", count: "812", v: [3, 4, 4, 6, 5, 7, 9, 12] },
    { name: "Spring Waitlist", count: "391", v: [1, 2, 4, 3, 6, 8, 7, 10] },
    { name: "Contact", count: "81", v: [2, 1, 3, 2, 2, 3, 2, 4] },
  ];
  return (
    <Page title="Forms">
      <div className="grid grid-cols-3 gap-3">
        {forms.map((f) => (
          <Box key={f.name} className="p-4" onClick={() => go("apps/forms/submissions")}>
            <BoxTitle icon={FileIcon}>{f.name}</BoxTitle>
            <div className="mt-2 text-[22px] text-(--i-strong)">{f.count}</div>
            <div className="text-[12.5px] text-(--i-muted)">submissions</div>
            <Bars values={f.v} className="mt-3 h-8" />
          </Box>
        ))}
      </div>
    </Page>
  );
}

function LandingPage({ templates }: { templates: boolean }) {
  const pages: { name: string; status: string; photo: PhotoId; head: string; cta: string; stat?: string; focus?: string }[] = templates
    ? [
        { name: "Launch", status: "Template", photo: "tulips-white", head: "Something New Is Coming", cta: "Join the List" },
        { name: "Class Booking", status: "Template", photo: "hands-shaping", head: "Learn to Throw", cta: "Book a Seat" },
        { name: "Lead Magnet", status: "Template", photo: "clay-tools", head: "The Free Glaze Guide", cta: "Get the Guide" },
      ]
    : [
        { name: "Spring Sale", status: "Live", photo: "cups-kiln", head: "The Spring Collection", cta: "Shop Now", stat: "8,204 visits · 4.8%" },
        { name: "Saturday Wheel Classes", status: "Live", photo: "class", head: "Saturday Wheel Classes", cta: "Book a Seat", stat: "2,118 visits · 3.1%" },
        { name: "The Seconds Shelf", status: "Draft", photo: "shelf-colour", head: "Seconds, 40% Off", cta: "Browse", focus: "50% 60%" },
      ];
  return (
    <Page title={templates ? "Templates" : "Pages"}>
      <div className="grid grid-cols-2 gap-3 @min-[640px]:grid-cols-3">
        {pages.map((p) => (
          <Box key={p.name} className="overflow-hidden">
            <div className="h-44 bg-(--i-fill) p-3">
              <div className="flex h-full flex-col overflow-hidden rounded-md bg-white shadow-sm">
                <div className="flex h-5 shrink-0 items-center gap-1.5 border-b border-black/5 px-2">
                  <span className="text-[6.5px] tracking-[0.25em] text-black uppercase">Studio</span>
                  <span className="flex-1" />
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-[3px] w-4 rounded-full bg-black/15" />
                  ))}
                </div>
                <div className="relative min-h-0 flex-1">
                  <Photo id={p.photo} focus={p.focus} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                  <div className="absolute bottom-2.5 left-3 text-white">
                    <div className="text-[13px] leading-tight tracking-[-0.01em]">{p.head}</div>
                    <span className="mt-1.5 inline-block rounded-full bg-white px-2 py-0.5 text-[6.5px] tracking-[0.12em] text-black uppercase">{p.cta}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 text-[13.5px]">
              <div className="min-w-0 flex-1">
                <div className="truncate text-(--i-strong)">{p.name}</div>
                {p.stat ? <div className="text-[12px] text-(--i-muted)">{p.stat}</div> : null}
              </div>
              <Dot tone={p.status === "Live" ? "success" : "neutral"}>{p.status}</Dot>
            </div>
          </Box>
        ))}
      </div>
    </Page>
  );
}

// ---- Ad Designer ----

// What Muse Image comes back with for each brief: a photo from the Library, the copy and where the
// subject sits. Generate moves to the next one, so the demo can be run again and again.
const AD_SETS: { brief: string; photo: PhotoId; head: string; cta: string; focus: string }[] = [
  { brief: "Spring sale for the shop, warm light, the new blue mugs", photo: "cups-kiln", head: "The Spring Collection", cta: "Shop Now", focus: "50% 45%" },
  { brief: "Twenty percent off everything this week, soft and pink", photo: "tulip-pink", head: "20% Off Everything", cta: "Shop the Sale", focus: "50% 35%" },
  { brief: "Saturday wheel classes are back, six seats", photo: "class", head: "Saturday Wheel Classes", cta: "Book a Seat", focus: "50% 40%" },
  { brief: "The seconds shelf, colourful, playful", photo: "shelf-colour", head: "The Seconds Shelf", cta: "Browse", focus: "40% 55%" },
];

const FORMATS = [
  { name: "Story", size: "1080 × 1920", w: 132, h: 234 },
  { name: "Square", size: "1080 × 1080", w: 200, h: 200 },
  { name: "Landscape", size: "1920 × 1080", w: 236, h: 133 },
];
// The canvas lays the formats out in a row when it is wide, or Story and Square over Landscape
// when it is narrow, whichever shows them bigger. Sizes are the stage's before it is scaled to fit.
const GAP = 16;
const HEAD = 26;
const LAYOUTS = {
  row: { w: FORMATS.reduce((a, f) => a + f.w, 0) + GAP * 2, h: HEAD + Math.max(...FORMATS.map((f) => f.h)) },
  stack: { w: FORMATS[0]!.w + GAP + FORMATS[1]!.w, h: HEAD + FORMATS[0]!.h + GAP + HEAD + FORMATS[2]!.h },
};

/** One ad at a format's size: the photo, a shade at the bottom, the logo, headline and button. `p`
 *  is how far the image has come in, 0 to 1. */
function AdCard({ w, h, photo, focus, head, cta, p }: { w: number; h: number; photo: PhotoId; focus: string; head: string; cta: string; p: number }) {
  const small = h < 150;
  const text = Math.max(0, (p - 0.6) / 0.4);
  return (
    <div className="relative overflow-hidden rounded-md bg-(--i-fill) shadow-[0_12px_30px_rgb(0_0_0/30%)] ring-1 ring-(--i-line)" style={{ width: w, height: h }}>
      <div className="absolute inset-0" style={{ opacity: Math.min(1, p * 1.5), filter: p < 1 ? `blur(${(1 - p) * 16}px)` : undefined, transform: `scale(${1.08 - 0.08 * p})` }}>
        <Photo id={photo} focus={focus} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
      </div>
      {p < 1 ? (
        <div className="absolute inset-0 grid place-items-center text-[12px] text-(--i-meta)" style={{ opacity: 1 - p }}>
          <span className="flex flex-col items-center gap-2">
            <MuseGlyph className="h-3 w-6" />
            <span className="flex items-center gap-1.5">
              <Spinner className="size-3" /> Generating
            </span>
          </span>
        </div>
      ) : null}
      <div className="absolute top-2.5 left-3 text-[7px] tracking-[0.26em] text-white uppercase" style={{ opacity: text }}>
        Studio
      </div>
      <div className="absolute right-3 bottom-3 left-3 text-white" style={{ opacity: text, transform: `translateY(${(1 - text) * 6}px)` }}>
        <div className="leading-[1.05] tracking-[-0.01em]" style={{ fontSize: small ? 15 : w < 150 ? 17 : 21 }}>
          {head}
        </div>
        <span className="mt-2 inline-block rounded-full bg-white px-2 py-0.5 text-[7.5px] tracking-[0.12em] text-[#111] uppercase">{cta}</span>
      </div>
    </div>
  );
}

function AdDesigner() {
  const { say } = useDemo();
  const [set, setSet] = useState(0);
  const [brief, setBrief] = useState(AD_SETS[0]!.brief);
  const [photo, setPhoto] = useState<PhotoId>(AD_SETS[0]!.photo);
  const [head, setHead] = useState(AD_SETS[0]!.head);
  const [cta, setCta] = useState(AD_SETS[0]!.cta);
  const [layer, setLayer] = useState("Headline");
  const [gen, setGen] = useState([1, 1, 1]);
  const [fit, setFit] = useState<{ layout: keyof typeof LAYOUTS; scale: number }>({ layout: "row", scale: 1 });
  const canvas = useRef<HTMLDivElement>(null);
  const timer = useRef<number>(0);
  const ad = AD_SETS[set]!;
  const focus = AD_SETS.find((a) => a.photo === photo)?.focus ?? "50% 50%";

  useLayoutEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = e!.contentRect.width - 40;
      const h = e!.contentRect.height - 40;
      const at = (l: keyof typeof LAYOUTS) => Math.min(1.2, w / LAYOUTS[l].w, h / LAYOUTS[l].h);
      setFit(at("row") >= at("stack") ? { layout: "row", scale: at("row") } : { layout: "stack", scale: at("stack") });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => () => cancelAnimationFrame(timer.current), []);

  const busy = gen.some((g) => g < 1);
  const generate = () => {
    if (busy) return;
    const next = (set + 1) % AD_SETS.length;
    const n = AD_SETS[next]!;
    // a brief someone typed keeps their words; otherwise the next canned brief comes in with it
    if (brief === ad.brief) setBrief(n.brief);
    const t0 = performance.now();
    setGen([0, 0, 0]);
    setTimeout(() => {
      setSet(next);
      setPhoto(n.photo);
      setHead(n.head);
      setCta(n.cta);
    }, 250);
    const tick = (t: number) => {
      const g = FORMATS.map((_, i) => Math.min(1, Math.max(0, (t - t0 - 300 - i * 450) / 1100)));
      setGen(g);
      if (g.some((x) => x < 1)) timer.current = requestAnimationFrame(tick);
    };
    timer.current = requestAnimationFrame(tick);
  };
  const done = gen.filter((g) => g >= 1).length;
  const label = "mb-2 text-[11px] tracking-[0.08em] text-(--i-muted) uppercase";
  const input = "h-8 w-full rounded-lg border border-(--i-line) bg-(--i-bg) px-2.5 text-[13px] text-(--i-strong) outline-none focus:border-(--i-accent)";

  return (
    <Page
      title="Ad Designer"
      aside={
        <Tag tone="meta" className="ml-1">
          <MuseGlyph className="h-2 w-4" /> Muse Image
        </Tag>
      }
      end={<Btn onClick={() => say("Exported 3 formats to the Library, ready for Meta Ads")}>Export</Btn>}
    >
      <div className="@container flex h-full min-h-[520px] gap-3">
        <div className="demo-scroll flex w-[212px] shrink-0 flex-col gap-4 overflow-y-auto rounded-xl border border-(--i-line) bg-(--i-card) p-3.5">
          <div>
            <div className={label}>Brief</div>
            <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-[color-mix(in_srgb,var(--i-meta)_45%,transparent)] bg-(--i-bg) px-2.5 py-2 text-[13px] leading-snug text-(--i-strong) outline-none" />
            <button type="button" onClick={generate} disabled={busy} className="mt-2 inline-flex h-8 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-(--i-meta) text-[13px] text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-70">
              {busy ? <Spinner className="size-3" /> : <WandSparklesIcon className="size-3.5" />}
              {busy ? "Generating" : "Generate"}
            </button>
          </div>
          <div>
            <div className={label}>Source Photo</div>
            <div className="grid grid-cols-4 gap-1.5">
              {AD_SETS.map((a) => (
                <button key={a.photo} type="button" onClick={() => setPhoto(a.photo)} className={cx("aspect-square cursor-pointer overflow-hidden rounded-md ring-offset-1 ring-offset-(--i-card) transition-shadow", photo === a.photo ? "ring-2 ring-(--i-accent)" : "opacity-75 hover:opacity-100")}>
                  <Photo id={a.photo} focus={a.focus} />
                </button>
              ))}
            </div>
            <div className="mt-1.5 truncate text-[12px] text-(--i-muted)">
              {PHOTOS[photo].file} · Library
            </div>
          </div>
          <div className="space-y-2">
            <div className={label}>Copy</div>
            <input value={head} onChange={(e) => setHead(e.target.value)} aria-label="Headline" className={input} />
            <input value={cta} onChange={(e) => setCta(e.target.value)} aria-label="Call to Action" className={input} />
            <div className="flex items-center gap-2 pt-1 text-[12.5px] text-(--i-muted)">
              Palette
              {["#ffffff", "#111111", "#d99aa0", "#3c5a99"].map((c) => (
                <span key={c} className="size-4 rounded-full ring-1 ring-(--i-line)" style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-(--i-line) bg-(--i-fill)">
          <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(circle, var(--i-line) 1px, transparent 1.4px)", backgroundSize: "20px 20px" }} />
          <div ref={canvas} className="relative grid min-h-0 flex-1 place-items-center overflow-hidden">
            <div className="relative" style={{ width: LAYOUTS[fit.layout].w * fit.scale, height: LAYOUTS[fit.layout].h * fit.scale }}>
              <div
                className="absolute top-0 left-0 origin-top-left"
                style={{ width: LAYOUTS[fit.layout].w, transform: `scale(${fit.scale})`, display: "grid", gap: GAP, alignItems: "start", gridTemplateColumns: fit.layout === "row" ? FORMATS.map((f) => `${f.w}px`).join(" ") : `${FORMATS[0]!.w}px ${FORMATS[1]!.w}px` }}
              >
                {FORMATS.map((f, i) => (
                  <div key={f.name} className="flex flex-col gap-2" style={fit.layout === "stack" && i === 2 ? { gridColumn: "span 2", justifySelf: "center" } : undefined}>
                    <div className="flex h-[18px] justify-between gap-2 text-[11px] text-(--i-muted)">
                      <span className="text-(--i-fg)">{f.name}</span>
                      <span className="font-mono">{f.size}</span>
                    </div>
                    <AdCard w={f.w} h={f.h} photo={photo} focus={focus} head={head} cta={cta} p={gen[i]!} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="relative flex h-9 shrink-0 items-center gap-3 border-t border-(--i-line) px-3 text-[12px] text-(--i-muted)">
            <span className={cx("flex items-center gap-2", busy && "text-(--i-meta)")}>
              <MuseGlyph className="h-2 w-4" />
              {busy ? `Muse Image · generating ${Math.min(3, done + 1)} of 3` : "Muse Image · 3 of 3 formats ready"}
            </span>
            <span className="flex-1" />
            <span>Fit</span>
            <span className="font-mono">{Math.round(((FORMATS[1]!.w * fit.scale) / 1080) * 100)}%</span>
          </div>
        </div>

        <div className="hidden w-[210px] shrink-0 flex-col rounded-xl border border-(--i-line) bg-(--i-card) px-2 py-3.5 text-[13px] @min-[860px]:flex">
          <div className={cx(label, "flex items-center gap-1.5 px-2")}>
            <LayersIcon className="size-3" /> Layers
          </div>
          {(
            [
              [TypeIcon, "Logo"],
              [TypeIcon, "Headline"],
              [SquareIcon, "Call to Action"],
              [SlidersHorizontalIcon, "Shade"],
              [ImageIcon, PHOTOS[photo].file],
            ] as const
          ).map(([Icon, n], i) => (
            <button key={i} type="button" onClick={() => setLayer(i === 4 ? "Photo" : n)} className={cx("flex h-[30px] cursor-pointer items-center gap-2 rounded-md px-2 text-left", layer === n || (i === 4 && layer === "Photo") ? "bg-(--i-accent-soft) text-(--i-strong)" : "text-(--i-fg) hover:bg-(--i-fill)")}>
              <Icon className={cx("size-3.5 shrink-0", layer === n ? "text-(--i-accent)" : "text-(--i-muted)")} />
              <span className="min-w-0 flex-1 truncate">{n}</span>
              <EyeIcon className="size-3 text-(--i-muted)" />
            </button>
          ))}
          <div className="-mx-2 my-3 h-px bg-(--i-line)" />
          <div className={cx(label, "px-2")}>{layer}</div>
          <div className="space-y-0.5 px-2">
            {(layer === "Photo"
              ? [["Fit", "Fill"], ["Focus", focus], ["Size", "1600 × 2400"], ["Source", "Library"]]
              : layer === "Shade"
                ? [["Fill", "Gradient"], ["From", "#000 60%"], ["To", "#000 0%"], ["Blend", "Normal"]]
                : [["Font", "Cal Sans"], ["Size", layer === "Logo" ? "14" : layer === "Headline" ? "56" : "18"], ["Tracking", layer === "Logo" ? "26%" : "-1%"], ["Colour", layer === "Call to Action" ? "#111111" : "#FFFFFF"], ["Position", layer === "Logo" ? "Top left" : "Bottom left"]]
            ).map(([k, v]) => (
              <div key={k} className="flex h-7 items-center">
                <span className="w-[72px] shrink-0 text-(--i-muted)">{k}</span>
                <span className={cx("truncate text-(--i-fg)", /^[#\d-]/.test(v!) && "font-mono text-[12px]")}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Page>
  );
}

function NewsletterPage() {
  const rowsN: [string, ReactNode, string, number | null, string][] = [
    ["The Seconds Shelf Opens Friday", <Dot key="s" tone="meta">Scheduled</Dot>, "Subscribers · 1,284", null, "Fri 9:00"],
    ["Forty Test Tiles for One Blue", <Dot key="s" tone="success">Sent</Dot>, "1,204", 0.58, "Oct 1"],
    ["Welcome to the Studio", <Dot key="s" tone="accent">Automated</Dot>, "New signups", 0.71, "Always on"],
    ["Saturday Classes: Six Seats", <Dot key="s" tone="success">Sent</Dot>, "Waitlist · 391", 0.64, "Sep 18"],
    ["Now Stocking Six Shops", <Dot key="s" tone="success">Sent</Dot>, "1,118", 0.49, "Sep 3"],
  ];
  return (
    <Page title="Campaigns">
      <div className="mb-3 grid grid-cols-2 gap-2.5 @min-[600px]:grid-cols-3">
        <Stat label="Subscribers" value="1,284" delta="+128" />
        <Stat label="Average Open Rate" value="58%" delta="+6%" />
        <Stat label="Clicks, 30 Days" value="2,906" delta="+19%" />
      </div>
      <Table
        cols={[{ label: "Subject", w: "2.2fr" }, { label: "Status", w: "1fr" }, { label: "Sent To", w: "1.2fr" }, { label: "Opens", w: "1.1fr" }, { label: "When", w: "0.8fr", align: "right" }]}
        rows={rowsN.map(([s, st, to, open, when]) => [
          s,
          st,
          <span key="t" className="text-(--i-muted)">{to}</span>,
          open === null ? (
            <span key="o" className="text-(--i-muted)">—</span>
          ) : (
            <span key="o" className="flex items-center gap-2">
              <span className="h-1.5 w-16 rounded-full bg-(--i-fill)">
                <span className="block h-full rounded-full bg-(--i-accent)" style={{ width: `${open * 100}%` }} />
              </span>
              <span className="text-(--i-strong) tabular-nums">{Math.round(open * 100)}%</span>
            </span>
          ),
          <span key="w" className="text-(--i-muted)">{when}</span>,
        ])}
      />
    </Page>
  );
}

// ---- Database ----

// Each table as the app's grid draws it: a column's kind sets how its cells look (people with an
// avatar, tags as pills, money and counts right-aligned), `count` is the table's real size and the
// rows are its first page.
type Kind = "id" | "text" | "strong" | "person" | "tags" | "status" | "money" | "num" | "mono" | "when";
type DbCol = { key: string; label: string; kind: Kind; w: string; min: number };
type DbTable = { count: string; short: string; cols: DbCol[]; rows: Record<string, string>[]; chips?: { label: string; key: string; has?: string }[] };

// `min` is the narrowest the grid can be and still show the column, so a narrow window keeps the
// columns that matter and drops the rest.
const col = (key: string, kind: Kind, w = "1fr", min = 0): DbCol => ({ key, label: key, kind, w, min });
const rows = (keys: string[], data: string[][]) => data.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ""])));

const DB: Record<string, DbTable> = {
  contacts: {
    count: "1,284",
    short: "1.3k",
    cols: [col("id", "id", "0.7fr", 760), col("name", "person", "1.35fr"), col("email", "text", "1.6fr", 600), col("tags", "tags", "1.5fr"), col("source", "text", "1fr", 680), col("spent", "money", "0.7fr"), col("created_at", "when", "0.8fr", 480)],
    chips: [{ label: "All", key: "" }, { label: "Customers", key: "tags", has: "customer" }, { label: "Subscribers", key: "tags", has: "subscriber" }, { label: "Waitlist", key: "tags", has: "waitlist" }],
    rows: rows(
      ["id", "name", "email", "tags", "source", "spent", "created_at"],
      [
        ["c_8f2k1", "Nora Patel", "nora@patel.design", "customer, vip", "Spring Sale", "$620", "2m ago"],
        ["c_7d1qa", "Felix Haddad", "felix@haddad.cafe", "waitlist", "Wheel Class", "", "4m ago"],
        ["c_6h3zt", "Iris Moreau", "iris@moreau.fr", "customer, subscriber", "Instagram", "$120", "1h ago"],
        ["c_5m9xe", "Ivy Chen", "ivy@chen.email", "customer, wholesale", "Wholesale", "$1,140", "3h ago"],
        ["c_4b2wd", "Sam Kline", "sam@kline.co", "subscriber", "Journal", "", "5h ago"],
        ["c_3p8rv", "Lena Ortiz", "lena@ortiz.fm", "customer, subscriber", "Newsletter", "$412", "Yesterday"],
        ["c_2n5yu", "Ola Berg", "ola@berg.no", "waitlist", "Wheel Class", "", "Yesterday"],
        ["c_1x4ke", "Theo Marsh", "theo@marsh.dev", "customer", "Spring Sale", "$96", "Mon"],
        ["c_0w7hd", "Priya Nair", "priya@north.io", "subscriber", "Journal", "", "Mon"],
        ["c_9v3ma", "Jonah Reyes", "jonah@reyes.co", "customer, subscriber", "Instagram", "$184", "Sun"],
        ["c_8u2lb", "Ama Owusu", "ama@owusu.studio", "subscriber", "Newsletter", "", "Sun"],
        ["c_7t6nc", "Kiln & Co.", "orders@kilnand.co", "wholesale", "Wholesale", "$2,380", "Sat"],
      ],
    ),
  },
  blog_posts: {
    count: "24",
    short: "24",
    cols: [col("id", "id", "0.5fr", 680), col("title", "strong", "2fr"), col("status", "status", "0.9fr"), col("author", "person", "1.2fr", 520), col("views", "num", "0.6fr"), col("updated_at", "when", "0.8fr", 600)],
    chips: [{ label: "All", key: "" }, { label: "Published", key: "status", has: "published" }, { label: "Drafts", key: "status", has: "draft" }],
    rows: rows(
      ["id", "title", "status", "author", "views", "updated_at"],
      [
        ["p_24", "Forty Test Tiles for One Blue", "published", "Maya Chen", "1,562", "2h ago"],
        ["p_23", "The Seconds Shelf Opens Friday", "scheduled", "Leo Dubois", "", "Yesterday"],
        ["p_22", "How We Fire", "published", "Leo Dubois", "980", "3d ago"],
        ["p_21", "Saturday Wheel Classes Are Back", "draft", "Maya Chen", "", "4d ago"],
        ["p_20", "A Tour of the Studio", "published", "Maya Chen", "1,110", "1w ago"],
        ["p_19", "Caring for Stoneware", "published", "Leo Dubois", "655", "2w ago"],
        ["p_18", "Now Stocking Six Shops", "published", "Maya Chen", "1,204", "3w ago"],
        ["p_17", "Why We Sell Seconds", "published", "Maya Chen", "742", "Oct 2"],
      ],
    ),
  },
  form_submissions: {
    count: "3,118",
    short: "3.1k",
    cols: [col("id", "id", "0.6fr", 760), col("form", "status", "1.1fr"), col("name", "person", "1.3fr"), col("email", "text", "1.5fr", 640), col("page", "mono", "1.3fr", 560), col("created_at", "when", "0.8fr")],
    chips: [{ label: "All", key: "" }, { label: "Newsletter", key: "form", has: "Newsletter" }, { label: "Spring Waitlist", key: "form", has: "Spring Waitlist" }],
    rows: rows(
      ["id", "form", "name", "email", "page", "created_at"],
      [
        ["s_9a1", "Spring Waitlist", "Felix Haddad", "felix@haddad.cafe", "/spring-sale", "4m ago"],
        ["s_9a0", "Newsletter", "Iris Moreau", "iris@moreau.fr", "/journal/forty-test-tiles", "1h ago"],
        ["s_8z9", "Newsletter", "Sam Kline", "sam@kline.co", "/journal/how-we-fire", "5h ago"],
        ["s_8z8", "Wholesale", "Kiln & Co.", "orders@kilnand.co", "/wholesale", "6h ago"],
        ["s_8z7", "Spring Waitlist", "Ola Berg", "ola@berg.no", "/spring-sale", "Yesterday"],
        ["s_8z6", "Newsletter", "Priya Nair", "priya@north.io", "/journal", "Mon"],
        ["s_8z5", "Spring Waitlist", "Theo Marsh", "theo@marsh.dev", "/classes", "Mon"],
        ["s_8z4", "Contact", "Ama Owusu", "ama@owusu.studio", "/contact", "Sun"],
      ],
    ),
  },
  landing_pages: {
    count: "6",
    short: "6",
    cols: [col("id", "id", "0.5fr", 680), col("title", "strong", "1.6fr"), col("slug", "mono", "1.4fr", 560), col("status", "status", "0.8fr"), col("visits", "num", "0.7fr"), col("conversion", "num", "0.8fr")],
    rows: rows(
      ["id", "title", "slug", "status", "visits", "conversion"],
      [
        ["l_6", "Spring Sale", "/spring-sale", "live", "8,204", "4.8%"],
        ["l_5", "Saturday Wheel Classes", "/classes", "live", "2,118", "3.1%"],
        ["l_4", "Wholesale", "/wholesale", "live", "640", "6.2%"],
        ["l_3", "The Seconds Shelf", "/seconds", "draft", "", ""],
        ["l_2", "Holiday Gift Guide", "/gifts", "archived", "5,902", "2.7%"],
        ["l_1", "Studio Open Day", "/open-day", "archived", "1,377", "3.9%"],
      ],
    ),
  },
  events: {
    count: "48,612",
    short: "48.6k",
    cols: [col("id", "id", "0.6fr", 700), col("name", "mono", "1.2fr"), col("source", "status", "0.9fr", 560), col("contact", "person", "1.3fr"), col("data", "text", "1.4fr", 620), col("at", "when", "0.6fr")],
    rows: rows(
      ["id", "name", "source", "contact", "data", "at"],
      [
        ["e_41k", "order.paid", "checkout", "Nora Patel", "$92 · 2 items", "now"],
        ["e_41j", "form.submitted", "forms", "Felix Haddad", "Spring Waitlist", "4m"],
        ["e_41h", "contact.created", "core", "Felix Haddad", "waitlist", "4m"],
        ["e_41g", "page.viewed", "landing", "", "/spring-sale", "5m"],
        ["e_41f", "email.opened", "newsletter", "Iris Moreau", "The Seconds Shelf", "9m"],
        ["e_41e", "order.paid", "checkout", "Ivy Chen", "$1,140 · 24 items", "26m"],
        ["e_41d", "post.published", "blog", "Maya Chen", "Forty Test Tiles", "2h"],
        ["e_41c", "workflow.ran", "core", "Nora Patel", "Big Orders Become VIP", "2h"],
      ],
    ),
  },
};

const TABLES = Object.keys(DB);

function tagTone(t: string) {
  return ({ customer: "success", subscriber: "meta", waitlist: "warning", vip: "accent", published: "success", live: "success", scheduled: "meta", draft: "neutral", archived: "neutral", checkout: "success", forms: "meta", blog: "accent", core: "neutral", landing: "warning", newsletter: "meta" } as const)[t] ?? "neutral";
}

function Cell({ kind, v }: { kind: Kind; v: string }) {
  if (!v) return <span className="text-(--i-muted)">—</span>;
  if (kind === "id") return <span className="font-mono text-[12px] text-(--i-muted)">{v}</span>;
  if (kind === "strong") return <span className="text-(--i-strong)">{v}</span>;
  if (kind === "person") return <Person name={v} size={20} />;
  if (kind === "mono") return <span className="font-mono text-[12.5px]">{v}</span>;
  if (kind === "status") return <Dot tone={tagTone(v)}>{v}</Dot>;
  if (kind === "when") return <span className="text-(--i-muted)">{v}</span>;
  if (kind === "money" || kind === "num") return <span className="text-(--i-strong) tabular-nums">{v}</span>;
  if (kind === "tags")
    return (
      <span className="flex gap-1 overflow-hidden">
        {v.split(", ").map((t) => (
          <Tag key={t} tone={tagTone(t)} className="px-2 py-px text-[12px]">
            {t}
          </Tag>
        ))}
      </span>
    );
  return <span className="truncate">{v}</span>;
}

/** A table as the app's database grid: toolbar, checkbox column, typed cells and the pager. */
function TablePage({ table, bare }: { table: string; bare?: boolean }) {
  const t = DB[table]!;
  const [q, setQ] = useState("");
  const [chip, setChip] = useState("All");
  const [sel, setSel] = useState<string[]>([]);
  const [box, width] = useWidth<HTMLDivElement>();
  const c = t.chips?.find((x) => x.label === chip);
  const shown = t.rows.filter((r) => (!c?.has || r[c.key]!.includes(c.has)) && (!q || Object.values(r).some((v) => v.toLowerCase().includes(q.toLowerCase()))));
  const cols = t.cols.filter((x) => !(bare && x.kind === "id") && (!width || width >= x.min));
  const template = `28px ${cols.map((x) => (x.kind === "money" || x.kind === "num" ? `minmax(56px,${x.w})` : `minmax(0,${x.w})`)).join(" ")}`;
  const right = (k: Kind) => k === "money" || k === "num";
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const title = bare ? (table === "contacts" ? "Subscribers" : "Submissions") : <span className="font-mono text-[19px]">{table}</span>;
  return (
    <Page title={title} aside={<Tag className="tabular-nums">{t.count} rows</Tag>}>
      <Toolbar query={q} onQuery={setQ} placeholder={`Search ${bare ? title : table}`} chips={t.chips?.map((x) => x.label)} chip={chip} onChip={setChip} count={sel.length ? `${sel.length} selected` : undefined} />
      <div ref={box} className="overflow-hidden rounded-xl border border-(--i-line) bg-(--i-card)">
        <div className="grid h-9 items-center gap-3 border-b border-(--i-line) px-3 text-[12.5px] text-(--i-muted)" style={{ gridTemplateColumns: template }}>
          <Check on={sel.length > 0 && sel.length === shown.length} onClick={() => setSel(sel.length === shown.length ? [] : shown.map((r) => r[cols[0]!.key]! + r[cols[1]!.key]))} />
          {cols.map((x) => (
            <div key={x.key} className={cx("truncate", !bare && "font-mono text-[12px]", right(x.kind) && "text-right")}>
              {bare ? x.label.replace(/_/g, " ").replace(/^\w/, (m) => m.toUpperCase()) : x.label}
            </div>
          ))}
        </div>
        {shown.map((r, i) => {
          const id = r[cols[0]!.key]! + r[cols[1]!.key];
          const on = sel.includes(id);
          return (
            <div key={id} onClick={() => toggle(id)} className={cx("grid h-10 cursor-pointer items-center gap-3 px-3 text-[13.5px] text-(--i-fg) transition-colors", i > 0 && "border-t border-(--i-line)", on ? "bg-(--i-accent-soft)" : "hover:bg-(--i-fill)")} style={{ gridTemplateColumns: template }}>
              <Check on={on} />
              {cols.map((x) => (
                <div key={x.key} className={cx("min-w-0 truncate", right(x.kind) && "text-right")}>
                  <Cell kind={x.kind} v={r[x.key]!} />
                </div>
              ))}
            </div>
          );
        })}
        {shown.length ? null : <div className="grid h-24 place-items-center text-[13.5px] text-(--i-muted)">No rows match “{q}”</div>}
        <div className="flex h-10 items-center gap-3 border-t border-(--i-line) px-4 text-[12.5px] text-(--i-muted)">
          <span>
            {shown.length} of {t.count}
          </span>
          <span className="flex-1" />
          <span>Page 1</span>
          <span className="flex gap-1">
            <span className="grid size-6 place-items-center rounded-md border border-(--i-line) opacity-50">‹</span>
            <span className="grid size-6 place-items-center rounded-md border border-(--i-line)">›</span>
          </span>
        </div>
      </div>
    </Page>
  );
}

function Check({ on, onClick }: { on: boolean; onClick?: () => void }) {
  return (
    <span
      onClick={(e) => {
        if (!onClick) return;
        e.stopPropagation();
        onClick();
      }}
      className={cx("grid size-4 place-items-center rounded-[5px] border transition-colors", on ? "border-(--i-accent) bg-(--i-accent) text-(--i-on-accent)" : "border-(--i-input)", onClick && "cursor-pointer")}
    >
      {on ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
    </span>
  );
}

function QueryPage() {
  const [sql, setSql] = useState("select form, count(*) as signups\nfrom form_submissions\nwhere created_at > date('now', '-7 days')\ngroup by form\norder by signups desc;");
  const [ran, setRan] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Page title="Query">
      <textarea value={sql} onChange={(e) => setSql(e.target.value)} spellCheck={false} className="h-32 w-full resize-none rounded-xl border border-(--i-line) bg-(--i-card) p-4 font-mono text-[13px] leading-relaxed text-(--i-strong) outline-none focus:border-(--i-accent)" />
      <div className="mt-3 flex items-center gap-3">
        <Btn
          primary
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setTimeout(() => {
              setBusy(false);
              setRan(true);
            }, 700);
          }}
        >
          {busy ? <Spinner /> : <PlayIcon className="size-3.5" />} Run
        </Btn>
        {ran ? <span className="text-[13px] text-(--i-muted)">3 rows · 14 ms</span> : null}
      </div>
      {ran ? (
        <div className="mt-3">
          <Table cols={[{ label: "form" }, { label: "signups", align: "right" }]} rows={[["Newsletter", "71"], ["Spring Waitlist", "49"], ["Contact", "8"]]} />
        </div>
      ) : null}
    </Page>
  );
}

function MigrationsPage() {
  return (
    <Page title="Migrations">
      <Table
        cols={[{ label: "Migration", w: "2.4fr" }, { label: "App", w: "1fr" }, { label: "Applied", w: "1fr", align: "right" }]}
        mono={[0]}
        rows={[
          ["0007_newsletter_form.sql", "forms", "Today"],
          ["0006_landing_variants.sql", "landing", "3d ago"],
          ["0005_blog_comments.sql", "blog", "1w ago"],
          ["0004_blog_posts.sql", "blog", "2w ago"],
          ["0001_core.sql", "core", "1mo ago"],
        ]}
      />
    </Page>
  );
}

function BackupsPage() {
  const { say } = useDemo();
  return (
    <Page title="Backups">
      <Box className="divide-y divide-(--i-line)">
        {["Today, 9:00", "Yesterday, 9:00", "Mon, 9:00", "Sun, 9:00"].map((t) => (
          <div key={t} className="flex h-13 items-center gap-3 px-4 text-[13.5px] text-(--i-fg)">
            <HistoryIcon className="size-4 text-(--i-muted)" />
            <span className="flex-1">{t}</span>
            <Btn onClick={() => say("Time Travel restores D1 to any minute in the last 30 days")}>Restore</Btn>
          </div>
        ))}
      </Box>
    </Page>
  );
}

// ---- Workflows ----

type Flow = { id: string; name: string; steps: { kind: string; title: string; note: string }[] };

const WORKFLOWS: Flow[] = [
  {
    id: "new-subscriber",
    name: "New Subscriber",
    steps: [
      { kind: "When", title: "form.submitted", note: "Form is Newsletter" },
      { kind: "Then", title: "Tag the contact", note: "subscriber" },
      { kind: "Then", title: "Send an email", note: "Welcome to the Studio" },
      { kind: "Wait", title: "Wait 3 days", note: "" },
      { kind: "Then", title: "Send an email", note: "Five landing pages that convert" },
    ],
  },
  {
    id: "post-published",
    name: "Post Published",
    steps: [
      { kind: "When", title: "post.published", note: "Any category" },
      { kind: "Then", title: "Create a campaign", note: "Newsletter · draft" },
      { kind: "Then", title: "HTTP request", note: "POST to Slack #content" },
    ],
  },
];

function FlowPage({ flow }: { flow: Flow }) {
  const [on, setOn] = useState(true);
  return (
    <Page title={flow.name} end={<div className="flex items-center gap-2 text-[13px] text-(--i-muted)">{on ? "On" : "Off"} <Switch on={on} onChange={setOn} /></div>}>
      <div className="flex flex-col items-center py-2">
        {flow.steps.map((s, i) => (
          <div key={i} className="flex flex-col items-center">
            {i ? <div className="h-6 w-px bg-(--i-input)" /> : null}
            <Box className="flex w-[340px] items-center gap-3 px-4 py-3">
              <span className={cx("w-12 shrink-0 rounded-md py-0.5 text-center text-[11.5px]", s.kind === "When" ? "bg-(--i-accent-soft) text-(--i-accent)" : "bg-(--i-fill) text-(--i-muted)")}>{s.kind}</span>
              <div className="min-w-0">
                <div className={cx("text-[14px] text-(--i-strong)", s.kind === "When" && "font-mono text-[13px]")}>{s.title}</div>
                {s.note ? <div className="text-[12.5px] text-(--i-muted)">{s.note}</div> : null}
              </div>
            </Box>
          </div>
        ))}
      </div>
    </Page>
  );
}

// Signups a day for the last eight weeks: steady, then the spring launch.
const SIGNUPS = Array.from({ length: 56 }, (_, i) => {
  const launch = i >= 44 ? 1 + 2.2 * Math.exp(-(i - 44) / 5) : 1;
  return Math.round((5 + i * 0.08) * launch * (0.75 + 0.5 * Math.abs(Math.sin(i * 2.3))));
});

function ReportPage() {
  return (
    <Page title="Signups" aside={<Tag>Last 8 Weeks</Tag>}>
      <div className="grid grid-cols-2 gap-2.5 @min-[600px]:grid-cols-4">
        <Stat label="This Week" value="128" delta="+24%" />
        <Stat label="Last 8 Weeks" value="563" delta="+61%" />
        <Stat label="Conversion" value="3.6%" delta="+0.8%" />
        <Stat label="Best Source" value="Spring Sale" />
      </div>
      <Box className="mt-3 p-4">
        <BoxTitle icon={ChartColumnIcon} aside={<span className="text-[12.5px] text-(--i-muted)">Hover to read a day</span>}>
          Signups a Day
        </BoxTitle>
        <AreaChart values={SIGNUPS} labels={["Sep 9", "Sep 23", "Oct 7", "Oct 21", "Nov 4"]} height={150} className="mt-4" format={(v) => `${v} signups`} point={(i) => (55 - i ? `${55 - i}d ago` : "today")} />
      </Box>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Box className="p-4">
          <BoxTitle>By Source</BoxTitle>
          <div className="mt-4">
            <Meter items={[["Spring Sale", 219], ["Journal", 131], ["Instagram", 96], ["Wheel Classes", 71], ["Newsletter", 46]]} />
          </div>
        </Box>
        <Box className="p-4">
          <BoxTitle>By Form</BoxTitle>
          <div className="mt-4">
            <Meter items={[["Spring Waitlist", 248], ["Newsletter", 212], ["Class Booking", 74], ["Wholesale", 21], ["Contact", 8]]} />
          </div>
        </Box>
      </div>
    </Page>
  );
}

const EVENTS = [
  { name: "form.submitted", source: "forms", at: "now" },
  { name: "contact.created", source: "core", at: "now" },
  { name: "page.viewed", source: "landing", at: "1m" },
  { name: "post.published", source: "blog", at: "2h" },
  { name: "email.opened", source: "newsletter", at: "2h" },
  { name: "order.paid", source: "checkout", at: "3h" },
];
const MORE = ["page.viewed", "email.opened", "form.submitted", "contact.updated", "page.viewed", "comment.created"];

function EventsPage() {
  const [list, setList] = useState(EVENTS);
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      const name = MORE[n++ % MORE.length]!;
      setList((l) => [{ name, source: name.split(".")[0] === "page" ? "landing" : name.split(".")[0]!, at: "now" }, ...l.map((e) => (e.at === "now" ? { ...e, at: "1m" } : e))].slice(0, 9));
    }, 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <Page title="Events" aside={<Tag tone="success"><span className="size-1.5 animate-pulse rounded-full bg-current" /> Live</Tag>}>
      <Table cols={[{ label: "Event", w: "1.6fr" }, { label: "Source", w: "1fr" }, { label: "When", w: "0.6fr", align: "right" }]} mono={[0]} rows={list.map((e) => [e.name, <Dot key="s" tone={tagTone(e.source)}>{e.source}</Dot>, <span key="a" className="text-(--i-muted)">{e.at}</span>])} />
    </Page>
  );
}

function LogPage() {
  const lines = [
    ["09:41:02", "info", "POST /api/forms/newsletter 201 · 38ms"],
    ["09:41:02", "info", "workflow new-subscriber started · c_8f2k1"],
    ["09:41:03", "info", "email sent · Welcome to the Studio"],
    ["09:38:15", "warn", "image resize took 1.2s · hero-spring.jpg"],
    ["09:30:00", "info", "cron · backups.daily ok"],
    ["09:12:44", "info", "GET /blog/why-we-own-our-marketing-stack 200 · 12ms"],
  ];
  return (
    <Page title="Logging">
      <Box className="p-4 font-mono text-[12.5px] leading-7">
        {lines.map(([t, l, m], i) => (
          <div key={i} className="flex gap-3 text-(--i-fg)">
            <span className="text-(--i-muted)">{t}</span>
            <span className={l === "warn" ? "text-(--i-warning)" : "text-(--i-success)"}>{l}</span>
            <span className="truncate">{m}</span>
          </div>
        ))}
      </Box>
    </Page>
  );
}

function HooksPage() {
  return (
    <Page title="Hooks">
      <Table
        cols={[{ label: "Event", w: "1.4fr" }, { label: "From", w: "0.8fr" }, { label: "Runs", w: "1.4fr" }]}
        mono={[0]}
        rows={[
          ["form.submitted", "forms", "New Subscriber"],
          ["post.published", "blog", "Post Published"],
          ["contact.created", "core", "—"],
          ["order.paid", "checkout", "—"],
        ]}
      />
    </Page>
  );
}

// ---- Library ----

const IMAGE_KIND: Record<PhotoId, "Products" | "Studio" | "Campaigns"> = {
  "cups-kiln": "Products",
  "cup-speckled": "Products",
  "bowls-small": "Products",
  "shelf-white": "Products",
  "shelf-colour": "Products",
  "potter-bowl": "Products",
  "wheel-tools": "Studio",
  "hands-wheel": "Studio",
  glazes: "Studio",
  class: "Studio",
  "hands-shaping": "Studio",
  "clay-tools": "Studio",
  shop: "Studio",
  "tulip-pink": "Campaigns",
  "tulips-white": "Campaigns",
};

/** The original's size, as Cloudflare Images would report it: the WebP here is a 640 px copy. */
function original(id: PhotoId) {
  const { w, h } = PHOTOS[id];
  const k = 3.75;
  const W = Math.round(w * k);
  const H = Math.round(h * k);
  return { W, H, mb: ((W * H * 0.26) / 1e6).toFixed(1) };
}

function ImagesPage() {
  const { say } = useDemo();
  const [q, setQ] = useState("");
  const [chip, setChip] = useState("All");
  const [sel, setSel] = useState<PhotoId>("cups-kiln");
  const [zoom, setZoom] = useState(false);
  const [box, width] = useWidth<HTMLDivElement>();
  const wide = width >= 720;
  const ids = (Object.keys(PHOTOS) as PhotoId[]).filter((id) => (chip === "All" || IMAGE_KIND[id] === chip) && (!q || PHOTOS[id].file.includes(q.toLowerCase())));
  const s = original(sel);
  const details = (
    <>
      <div className="mt-3 truncate text-[14px] text-(--i-strong)">{PHOTOS[sel].file}</div>
      <div className="mt-2 space-y-1 text-(--i-muted)">
        {[
          ["Size", `${s.W} × ${s.H}`],
          ["File", `JPEG · ${s.mb} MB`],
          ["Folder", IMAGE_KIND[sel]],
          ["Used In", sel === "cups-kiln" ? "Spring Sale, 3 ads" : sel === "glazes" ? "Forty Test Tiles" : sel === "shop" ? "A Tour of the Studio" : "—"],
        ].map(([k, v]) => (
          <div key={k} className="flex">
            <span className="w-16 shrink-0">{k}</span>
            <span className="truncate text-(--i-fg)">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 mb-1.5 text-[11px] tracking-[0.08em] text-(--i-muted) uppercase">Variants</div>
      {["public", "thumb", "og"].map((v) => (
        <button key={v} type="button" onClick={() => say(`Copied the ${v} URL`)} className="flex h-7 w-full cursor-pointer items-center gap-2 rounded-md px-1.5 font-mono text-[11.5px] text-(--i-fg) hover:bg-(--i-fill)">
          <span className="w-12 shrink-0 text-left text-(--i-muted)">{v}</span>
          <span className="truncate">/cdn-cgi/imagedelivery/…/{v}</span>
        </button>
      ))}
    </>
  );
  return (
    <Page title="Images" aside={<Tag>Cloudflare Images</Tag>}>
      <div ref={box} className="flex gap-4">
        <div className="min-w-0 flex-1">
          <Toolbar query={q} onQuery={setQ} placeholder="Search images" chips={["All", "Products", "Studio", "Campaigns"]} chip={chip} onChip={setChip} count={`${ids.length} images`} />
          <div className={cx("grid gap-2.5", width >= 900 ? "grid-cols-5" : width >= 560 ? "grid-cols-4" : "grid-cols-3")}>
            {ids.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSel(id);
                  setZoom(true);
                }}
                className="group cursor-pointer text-left"
              >
                <div className={cx("aspect-[4/3] overflow-hidden rounded-lg ring-offset-2 ring-offset-(--i-bg) transition-shadow", wide && sel === id ? "ring-2 ring-(--i-accent)" : "ring-1 ring-(--i-line)")}>
                  <Photo id={id} className="transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="mt-1.5 truncate text-[12.5px] text-(--i-fg)">{PHOTOS[id].file}</div>
                <div className="text-[11.5px] text-(--i-muted)">
                  {original(id).W} × {original(id).H}
                </div>
              </button>
            ))}
          </div>
        </div>
        {wide ? (
          <div key={sel} className="demo-in w-[220px] shrink-0 self-start rounded-xl border border-(--i-line) bg-(--i-card) p-3 text-[13px]">
            <div className="aspect-[4/3] overflow-hidden rounded-lg bg-(--i-fill)">
              <Photo id={sel} className="object-contain" />
            </div>
            {details}
          </div>
        ) : null}
      </div>
      {!wide && zoom ? (
        <div className="demo-fade absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/55 p-6 backdrop-blur-[2px]" onClick={() => setZoom(false)}>
          <div onClick={(e) => e.stopPropagation()} className="demo-in flex w-full max-w-[560px] gap-4 rounded-xl border border-(--i-line) bg-(--i-card) p-3 text-[13px] shadow-2xl">
            <div className="h-[300px] min-w-0 flex-1 overflow-hidden rounded-lg bg-(--i-fill)">
              <Photo id={sel} className="object-contain" />
            </div>
            <div className="w-[200px] shrink-0">{details}</div>
          </div>
        </div>
      ) : null}
    </Page>
  );
}

const VIDEOS: { name: string; photo: PhotoId; dur: string; secs: number; views: string; watch: string; added: string; encoding?: number; focus?: string }[] = [
  { name: "The Spring Collection", photo: "cups-kiln", dur: "2:14", secs: 134, views: "3,402", watch: "61h", added: "Today" },
  { name: "Wheel Class: Centering", photo: "hands-wheel", dur: "12:48", secs: 768, views: "1,118", watch: "142h", added: "3d ago", focus: "50% 60%" },
  { name: "How We Fire", photo: "glazes", dur: "8:05", secs: 485, views: "2,077", watch: "96h", added: "1w ago" },
  { name: "A Tour of the Studio", photo: "shop", dur: "4:36", secs: 276, views: "1,562", watch: "58h", added: "2w ago" },
  { name: "Hand-Building Basics", photo: "hands-shaping", dur: "18:20", secs: 1100, views: "904", watch: "121h", added: "3w ago" },
  { name: "Saturday Class, Week 1", photo: "class", dur: "6:12", secs: 372, views: "—", watch: "—", added: "Just now", encoding: 64 },
];

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function MediaPage() {
  const [open, setOpen] = useState<number | null>(null);
  return open === null ? (
    <Page title="Media" aside={<Tag>Cloudflare Stream</Tag>}>
      <div className="grid grid-cols-2 gap-3 @min-[640px]:grid-cols-3">
        {VIDEOS.map((v, i) => (
          <Box key={v.name} className="group overflow-hidden" onClick={v.encoding ? undefined : () => setOpen(i)}>
            <div className="relative aspect-video overflow-hidden">
              <Photo id={v.photo} focus={v.focus} className={cx("transition-transform duration-500 group-hover:scale-105", !!v.encoding && "blur-[2px] brightness-75")} />
              {v.encoding ? (
                <div className="absolute inset-x-3 bottom-3 text-[11.5px] text-white">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Spinner className="size-2.5" /> Encoding {v.encoding}%
                  </div>
                  <div className="h-1 rounded-full bg-white/25">
                    <div className="h-full rounded-full bg-white" style={{ width: `${v.encoding}%` }} />
                  </div>
                </div>
              ) : (
                <>
                  <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="grid size-10 place-items-center rounded-full bg-black/45 backdrop-blur-sm">
                      <PlayIcon className="size-4 fill-white text-white" />
                    </span>
                  </span>
                  <span className="absolute right-2 bottom-2 rounded bg-black/60 px-1.5 text-[11px] text-white tabular-nums">{v.dur}</span>
                </>
              )}
            </div>
            <div className="p-3">
              <div className="truncate text-[13.5px] text-(--i-strong)">{v.name}</div>
              <div className="mt-0.5 text-[12px] text-(--i-muted)">{v.encoding ? "Processing" : `${v.views} views · ${v.added}`}</div>
            </div>
          </Box>
        ))}
      </div>
    </Page>
  ) : (
    <Player v={VIDEOS[open]!} onBack={() => setOpen(null)} />
  );
}

/** One video open: the player, which really plays (the photo drifts and the scrubber runs), its
 *  numbers from Stream's analytics, and the embed code. */
function Player({ v, onBack }: { v: (typeof VIDEOS)[number]; onBack: () => void }) {
  const { say } = useDemo();
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setT((x) => (x + 1 >= v.secs ? 0 : x + 1)), 250);
    return () => clearInterval(id);
  }, [playing, v.secs]);
  return (
    <Page
      title={
        <span className="flex items-center gap-2">
          <button type="button" onClick={onBack} className="cursor-pointer text-(--i-muted) hover:text-(--i-strong)">
            Media
          </button>
          <span className="text-(--i-muted)">/</span>
          {v.name}
        </span>
      }
      aside={<Dot tone="success">Ready</Dot>}
    >
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <div className="group relative aspect-video overflow-hidden rounded-xl bg-black" onClick={() => setPlaying(!playing)}>
            <div className="absolute inset-0 transition-transform duration-[2000ms] ease-linear" style={{ transform: `scale(${1.04 + (t / v.secs) * 0.18}) translateX(${(t / v.secs) * -3}%)` }}>
              <Photo id={v.photo} focus={v.focus} />
            </div>
            {playing ? null : (
              <span className="absolute inset-0 grid place-items-center bg-black/25">
                <span className="grid size-14 place-items-center rounded-full bg-black/50 backdrop-blur-sm">
                  <PlayIcon className="size-6 fill-white text-white" />
                </span>
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pt-8 pb-3 text-white">
              <div className="h-1 cursor-pointer rounded-full bg-white/25">
                <div className="relative h-full rounded-full bg-white" style={{ width: `${(t / v.secs) * 100}%` }}>
                  <span className="absolute top-1/2 -right-1.5 size-3 -translate-y-1/2 rounded-full bg-white" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3 text-[12px] tabular-nums">
                {playing ? <PauseIcon className="size-4 fill-white" /> : <PlayIcon className="size-4 fill-white" />}
                <Volume2Icon className="size-4" />
                <span>
                  {clock(t)} / {v.dur}
                </span>
                <span className="flex-1" />
                <span className="rounded border border-white/40 px-1 text-[10px]">1080p</span>
                <MaximizeIcon className="size-3.5" />
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <Stat label="Views" value={v.views} delta="+12%" />
            <Stat label="Watch Time" value={v.watch} />
            <Stat label="Average View" value={clock(v.secs * 0.62)} />
          </div>
        </div>
        <div className="w-[220px] shrink-0 space-y-3 text-[13px]">
          <Box className="p-3">
            <div className="mb-2 text-[11px] tracking-[0.08em] text-(--i-muted) uppercase">Details</div>
            {[
              ["Length", v.dur],
              ["Size", "1920 × 1080"],
              ["Uploaded", v.added],
              ["Captions", "English"],
            ].map(([k, x]) => (
              <div key={k} className="flex h-6 items-center">
                <span className="w-20 text-(--i-muted)">{k}</span>
                <span className="text-(--i-fg)">{x}</span>
              </div>
            ))}
          </Box>
          <Box className="p-3">
            <div className="mb-2 text-[11px] tracking-[0.08em] text-(--i-muted) uppercase">Embed</div>
            <div className="rounded-md bg-(--i-fill) p-2 font-mono text-[11px] leading-relaxed break-all text-(--i-fg)">
              &lt;stream src=&quot;5d1f…a92c&quot; controls&gt;&lt;/stream&gt;
            </div>
            <Btn className="mt-2 w-full justify-center" onClick={() => say("Copied the embed code")}>
              Copy Embed Code
            </Btn>
          </Box>
        </div>
      </div>
    </Page>
  );
}

function FilesPage() {
  return (
    <Page title="Files" aside={<Tag>R2</Tag>}>
      <Table
        cols={[{ label: "Name", w: "2fr" }, { label: "Size", w: "0.7fr" }, { label: "Added", w: "0.8fr", align: "right" }]}
        rows={[
          ["creator-playbook.pdf", "4.2 MB", "Today"],
          ["spring-price-list.csv", "18 KB", "2d ago"],
          ["brand-kit.zip", "26 MB", "1w ago"],
          ["webinar-slides.pdf", "8.9 MB", "2w ago"],
        ]}
      />
    </Page>
  );
}

function SiteThemesPage() {
  const [active, setActive] = useState("Studio Light");
  const themes = [
    { name: "Studio Light", bg: "#ffffff", fg: "#1d1d1f", accent: "#e8614a", font: "Cal Sans" },
    { name: "Night Press", bg: "#13151c", fg: "#ededed", accent: "#7c8cf8", font: "Cal Sans" },
    { name: "Garden", bg: "#f4f1e8", fg: "#1f2a1c", accent: "#2f7a62", font: "Serif" },
  ];
  return (
    <Page title="Themes">
      <div className="grid grid-cols-3 gap-3">
        {themes.map((t) => (
          <Box key={t.name} className="overflow-hidden" onClick={() => setActive(t.name)}>
            <div className="h-28 p-4" style={{ background: t.bg, color: t.fg, fontFamily: t.font === "Serif" ? "Georgia, serif" : undefined }}>
              <div className="text-[18px]">Aa</div>
              <div className="mt-2 flex gap-1.5">
                {[t.fg, t.accent, t.bg].map((c, i) => (
                  <span key={i} className="size-5 rounded-full ring-1 ring-black/10" style={{ background: c }} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 text-[13.5px]">
              <span className="flex-1 text-(--i-strong)">{t.name}</span>
              {active === t.name ? <Tag tone="accent">Active</Tag> : null}
            </div>
          </Box>
        ))}
      </div>
      <p className="mt-4 text-[13px] text-(--i-muted)">Site themes are what your visitors see. The admin&apos;s own look is in Settings, Appearance</p>
    </Page>
  );
}

function SkillsPage() {
  return (
    <Page title="Skills">
      <div className="space-y-3">
        {[
          ["Write a Blog Post", "Voice, length and the checks before a draft goes in", "blog"],
          ["Make an Ad", "Sizes, safe areas and the brand's colors for Muse Image", "ads"],
          ["Launch a Landing Page", "Template, form, tracking and the publish step", "landing"],
        ].map(([n, d, app]) => (
          <Box key={n} className="flex items-center gap-3 p-4">
            <SparklesIcon className="size-4 text-(--i-accent)" />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] text-(--i-strong)">{n}</div>
              <div className="text-[13px] text-(--i-muted)">{d}</div>
            </div>
            <Tag className="font-mono">{app}</Tag>
          </Box>
        ))}
      </div>
    </Page>
  );
}

function SitemapPage() {
  const tree = [
    ["/", "core"],
    ["/blog", "blog"],
    ["/blog/[slug]", "blog"],
    ["/spring-sale", "landing"],
    ["/creator-course", "landing"],
    ["/api/forms/[id]", "forms"],
  ];
  return (
    <Page title="Sitemap" aside={<Tag className="font-mono">studio.supergrid.app</Tag>}>
      <Table cols={[{ label: "Route", w: "2fr" }, { label: "App", w: "1fr" }]} mono={[0]} rows={tree} />
    </Page>
  );
}

// ---- Code (Dev mode) ----

const CODE = [
  "export async function publish(id, { db, events }) {",
  "  await db.blog_posts.update(id, {",
  "    status: 'published',",
  "    published_at: Date.now(),",
  "  })",
  "  await events.emit('post.published', { id })",
  "}",
];

function CodeFilesPage() {
  const tree = ["apps/", "  blog/", "    admin/", "    pages/", "    worker/index.ts", "    manifest.json", "  forms/", "  landing/", "core/", "site/", "package.json"];
  return (
    <div className="flex h-full min-h-0">
      <div className="w-52 shrink-0 border-r border-(--i-line) p-3 font-mono text-[12.5px] leading-7 text-(--i-fg)">
        {tree.map((l) => (
          <div key={l} className={cx("flex items-center gap-1.5 rounded px-1.5 whitespace-pre", l.includes("worker/index.ts") && "bg-(--i-fill) text-(--i-strong)")}>
            {l.trim().endsWith("/") ? <FolderIcon className="size-3.5 text-(--i-muted)" /> : <FileCodeIcon className="size-3.5 text-(--i-muted)" />}
            {l.trimEnd()}
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1 p-5">
        <div className="mb-3 font-mono text-[12.5px] text-(--i-muted)">apps/blog/worker/index.ts</div>
        <div className="font-mono text-[13px] leading-7">
          {CODE.map((l, i) => (
            <div key={i} className="flex gap-4 whitespace-pre text-(--i-fg)">
              <span className="w-4 text-right text-(--i-muted)">{i + 1}</span>
              {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GitPage() {
  return (
    <Page title="Git" aside={<Tag className="font-mono"><GitBranchIcon className="size-3" /> main</Tag>}>
      <Table
        cols={[{ label: "Commit", w: "2.4fr" }, { label: "By", w: "0.9fr" }, { label: "When", w: "0.7fr", align: "right" }]}
        rows={[
          ["Add newsletter signup to blog posts", "Muse Code", "5m"],
          ["Install Landing Pages 2.1.0 from Theo Marsh", "Muse Code", "3d"],
          ["Ad Designer: square and story sizes", "Dylan", "4d"],
          ["Install Blog 1.0.0", "Muse Code", "2w"],
        ]}
      />
    </Page>
  );
}

function ServerPage() {
  return (
    <Page title="Server" aside={<Tag tone="success">Running</Tag>}>
      <Box className="p-4 font-mono text-[12.5px] leading-7 text-(--i-fg)">
        <div className="text-(--i-muted)">$ wrangler dev</div>
        <div>⎔ Starting local server…</div>
        <div>
          Ready on <span className="text-(--i-accent)">http://localhost:8787</span>
        </div>
        <div className="text-(--i-muted)">[wrangler] GET /blog 200 OK (11ms)</div>
        <div className="text-(--i-muted)">[wrangler] POST /api/forms/newsletter 201 (34ms)</div>
      </Box>
    </Page>
  );
}

function DeploysPage() {
  const [list, setList] = useState([
    { v: "v42", note: "Add newsletter signup to blog posts", at: "5m ago", live: true },
    { v: "v41", note: "Install Landing Pages 2.1.0", at: "3d ago", live: false },
  ]);
  const [busy, setBusy] = useState(false);
  return (
    <Page
      title="Deploys"
      end={
        <Btn
          primary
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setTimeout(() => {
              setList((l) => [{ v: `v${43 + l.length - 2}`, note: "Deploy from Studio", at: "Just now", live: true }, ...l.map((x) => ({ ...x, live: false }))]);
              setBusy(false);
            }, 1600);
          }}
        >
          {busy ? <Spinner /> : <RocketIcon className="size-3.5" />}
          {busy ? "Deploying" : "Deploy"}
        </Btn>
      }
    >
      <Table cols={[{ label: "Version", w: "0.6fr" }, { label: "Change", w: "2.2fr" }, { label: "When", w: "0.8fr" }, { label: "", w: "0.6fr", align: "right" }]} mono={[0]} rows={list.map((x) => [x.v, x.note, x.at, x.live ? <Tag key="l" tone="success">Live</Tag> : ""])} />
    </Page>
  );
}

