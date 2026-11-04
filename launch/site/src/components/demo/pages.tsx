"use client";

import {
  ActivityIcon,
  ArrowRightIcon,
  ChartColumnIcon,
  CheckIcon,
  ClapperboardIcon,
  DatabaseIcon,
  FileCodeIcon,
  FileIcon,
  FolderIcon,
  GitBranchIcon,
  GlobeIcon,
  HistoryIcon,
  ImageIcon,
  LibraryIcon,
  ListOrderedIcon,
  MapIcon,
  MessageSquareIcon,
  PaletteIcon,
  PlayIcon,
  RocketIcon,
  ScrollTextIcon,
  ServerIcon,
  SparklesIcon,
  SquareTerminalIcon,
  TableIcon,
  TagsIcon,
  WebhookIcon,
  WorkflowIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { MuseGlyph } from "@/components/brand";
import { CATALOG, useDemo, type AppId } from "./state";
import { Bars, Box, BoxTitle, Btn, Page, Spinner, Switch, Table, Tabs, Tag, cx } from "./ui";

// Every page the demo can show, looked up from the route. Each returns its breadcrumb, the main
// action the title bar carries (title-bar-breadcrumb-only), the second panel's items when the
// section has one, and the page itself.

export type SubItem = { label: string; to: string; icon?: LucideIcon; meta?: string };
export type SubNav = { title: string; groups: { label?: string; items: SubItem[] }[] };
export type Resolved = { crumbs: string[]; action?: { label: string; run: () => void }; sub?: SubNav; body: ReactNode };

type D = ReturnType<typeof useDemo>;

const TABLES = ["contacts", "blog_posts", "form_submissions", "landing_pages", "events"];

export function resolve(route: string, d: D): Resolved {
  const [head, a, b, c] = route.split("/");
  if (head === "store") return { crumbs: ["App Store"], body: <StorePage /> };
  if (head === "apps" && a) return appPage(a as AppId, b, c, d);
  if (head === "database") {
    const sub: SubNav = { title: "Database", groups: [{ label: "Tables", items: TABLES.map((t) => ({ label: t, to: `database/${t}`, icon: TableIcon, meta: String(ROWS[t]?.length ?? 0) })) }, { items: [{ label: "Query", to: "database/query", icon: SquareTerminalIcon }, { label: "Migrations", to: "database/migrations", icon: ListOrderedIcon }, { label: "Backups", to: "database/backups", icon: HistoryIcon }] }] };
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
    const newPost = { label: "New Post", run: () => d.go(`${base}/post/${d.addPost({ title: "Untitled post", status: "Draft", author: "Dylan", updated: "Just now", body: "" })}`) };
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

function HomePage() {
  const { go, installed } = useDemo();
  return (
    <Page title="Studio" aside={<Tag className="ml-1 font-mono">studio.supergrid.app</Tag>}>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Visitors" value="18,402" delta="+12%" values={[8, 9, 7, 11, 10, 12, 14, 13, 15, 17, 16, 19]} />
        <Stat label="Signups" value="1,284" delta="+24%" values={[4, 6, 5, 7, 6, 9, 8, 10, 9, 12, 14, 16]} />
        <Stat label="Revenue" value="$12,940" delta="+8%" values={[10, 11, 9, 12, 13, 12, 14, 13, 15, 14, 16, 17]} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Box className="p-4" onClick={() => go("database/contacts")}>
          <BoxTitle icon={DatabaseIcon} aside={<Tag>D1</Tag>}>
            Database
          </BoxTitle>
          <div className="mt-3 space-y-2 text-[13.5px]">
            {TABLES.slice(0, 4).map((t) => (
              <div key={t} className="flex text-(--i-fg)">
                <span className="flex-1 font-mono text-[12.5px]">{t}</span>
                <span className="text-(--i-muted)">{(ROWS[t]?.length ?? 0) * 214} rows</span>
              </div>
            ))}
          </div>
        </Box>
        <Box className="p-4" onClick={() => go("workflows/events")}>
          <BoxTitle icon={ActivityIcon} aside={<span className="size-2 animate-pulse rounded-full bg-(--i-success)" />}>
            Events
          </BoxTitle>
          <div className="mt-3 space-y-2 text-[13.5px]">
            {EVENTS.slice(0, 4).map((e) => (
              <div key={e.name + e.at} className="flex text-(--i-fg)">
                <span className="flex-1 font-mono text-[12.5px]">{e.name}</span>
                <span className="text-(--i-muted)">{e.at}</span>
              </div>
            ))}
          </div>
        </Box>
        <Box className="p-4" onClick={() => go("workflows/flow/new-subscriber")}>
          <BoxTitle icon={WorkflowIcon}>Workflows</BoxTitle>
          <div className="mt-4 flex items-center gap-2 text-[12.5px] text-(--i-fg)">
            {["form.submitted", "Tag", "Email"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i ? <span className="h-px w-4 bg-(--i-input)" /> : null}
                <span className="rounded-md border border-(--i-line) px-2 py-1">{s}</span>
              </div>
            ))}
          </div>
        </Box>
        <Box className="p-4" onClick={() => go("store")}>
          <BoxTitle icon={ZapIcon} aside={<span className="text-[12.5px] text-(--i-muted)">{installed.length} installed</span>}>
            Apps
          </BoxTitle>
          <div className="mt-3 flex flex-wrap gap-2">
            {installed.map((id) => {
              const A = CATALOG[id];
              return (
                <span key={id} className="inline-flex items-center gap-1.5 rounded-lg bg-(--i-fill) px-2.5 py-1 text-[13px] text-(--i-fg)">
                  <A.icon className="size-3.5 text-(--i-muted)" /> {A.name}
                </span>
              );
            })}
          </div>
        </Box>
      </div>
      <Box className="mt-3 p-4" onClick={() => go("library/images")}>
        <BoxTitle icon={ImageIcon}>Media Library</BoxTitle>
        <div className="mt-3 grid grid-cols-8 gap-2">
          {SWATCHES.slice(0, 8).map((s, i) => (
            <div key={i} className="aspect-square rounded-lg" style={{ background: s }} />
          ))}
        </div>
      </Box>
    </Page>
  );
}

function Stat({ label, value, delta, values }: { label: string; value: string; delta: string; values: number[] }) {
  return (
    <Box className="p-4">
      <div className="text-[13px] text-(--i-muted)">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-[24px] text-(--i-strong)">{value}</span>
        <span className="text-[12.5px] text-(--i-success)">{delta}</span>
      </div>
      <Bars values={values} className="mt-3 h-9" />
    </Box>
  );
}

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
          Install {a.name} 1.0.0 from {a.by}
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
  const shown = posts.filter((p) => tab === "All" || p.status === tab);
  return (
    <Page title="Posts" aside={<Tabs items={["All", "Published", "Draft", "Scheduled"]} value={tab} onChange={setTab} />}>
      <Table
        cols={[{ label: "Title", w: "2.4fr" }, { label: "Status", w: "1fr" }, { label: "Author", w: "0.9fr" }, { label: "Updated", w: "0.9fr", align: "right" }]}
        rows={shown.map((p) => [p.title, <Tag key="s" tone={statusTone(p.status)}>{p.status}</Tag>, p.author, <span key="u" className="text-(--i-muted)">{p.updated}</span>])}
        onRow={(i) => go(`apps/blog/post/${shown[i]!.id}`)}
      />
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
  return (
    <div className="flex h-full min-h-0">
      <div className="demo-scroll min-w-0 flex-1 overflow-y-auto px-10 py-8">
        <input value={post.title} onChange={(e) => updatePost(id, { title: e.target.value })} className="w-full bg-transparent text-[28px] leading-tight text-(--i-strong) outline-none" />
        <textarea
          value={post.body}
          onChange={(e) => updatePost(id, { body: e.target.value })}
          placeholder="Write, or ask Muse Code for a draft"
          className="mt-4 h-[420px] w-full resize-none bg-transparent text-[15px] leading-relaxed text-(--i-fg) outline-none placeholder:text-(--i-muted)"
        />
      </div>
      <div className="w-[230px] shrink-0 space-y-4 border-l border-(--i-line) p-5 text-[13.5px]">
        <Field label="Status">
          <Tag tone={statusTone(post.status)}>{post.status}</Tag>
        </Field>
        <Field label="Slug">
          <span className="font-mono text-[12.5px] break-all text-(--i-fg)">/blog/{slug || "untitled"}</span>
        </Field>
        <Field label="Author">{post.author}</Field>
        <Field label="Category">Product</Field>
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
      <Table cols={[{ label: "Name", w: "2fr" }, { label: "Slug", w: "1.4fr" }, { label: "Posts", w: "0.6fr", align: "right" }]} mono={[1]} rows={[["Product", "product", "14"], ["Guides", "guides", "9"], ["Creators", "creators", "6"], ["Company", "company", "3"]]} />
    </Page>
  );
}

function CommentsPage() {
  const [done, setDone] = useState<number[]>([]);
  const list = [
    { who: "Maya R.", on: "Why we own our marketing stack", text: "This is exactly where we landed after leaving three tools last year" },
    { who: "Sam K.", on: "Five landing pages that convert", text: "Would love a template for the second one" },
    { who: "Priya N.", on: "Notes from the creator summit", text: "Great write-up, the section on email was spot on" },
  ];
  return (
    <Page title="Comments">
      <div className="space-y-3">
        {list.map((c, i) => (
          <Box key={i} className="flex items-start gap-3 p-4">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-(--i-fill) text-[13px] text-(--i-fg)">{c.who[0]}</div>
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
          ["Address", <span key="a" className="font-mono text-[12.5px]">studio.supergrid.app/blog</span>],
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
  const pages = templates
    ? [
        { name: "Launch", status: "Template", c: SWATCHES[0]! },
        { name: "Webinar", status: "Template", c: SWATCHES[3]! },
        { name: "Lead Magnet", status: "Template", c: SWATCHES[5]! },
      ]
    : [
        { name: "Spring Sale", status: "Live", c: SWATCHES[0]!, v: "4.8% conv" },
        { name: "Creator Course", status: "Live", c: SWATCHES[2]!, v: "3.1% conv" },
        { name: "Webinar: Own Your Stack", status: "Draft", c: SWATCHES[4]! },
      ];
  return (
    <Page title={templates ? "Templates" : "Pages"}>
      <div className="grid grid-cols-3 gap-3">
        {pages.map((p) => (
          <Box key={p.name} className="overflow-hidden">
            <div className="h-36 p-3" style={{ background: p.c }}>
              <div className="h-full rounded-md bg-white/90 p-3">
                <div className="h-2 w-10 rounded bg-black/15" />
                <div className="mt-3 h-3 w-3/4 rounded bg-black/70" />
                <div className="mt-1.5 h-3 w-1/2 rounded bg-black/70" />
                <div className="mt-3 h-2 w-2/3 rounded bg-black/15" />
                <div className="mt-3 h-4 w-14 rounded bg-black/80" />
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 text-[13.5px]">
              <span className="flex-1 truncate text-(--i-strong)">{p.name}</span>
              {"v" in p && p.v ? <span className="text-[12.5px] text-(--i-muted)">{p.v}</span> : null}
              <Tag tone={p.status === "Live" ? "success" : "neutral"}>{p.status}</Tag>
            </div>
          </Box>
        ))}
      </div>
    </Page>
  );
}

const ADS = [
  [
    { bg: "linear-gradient(160deg,#f6b26b,#e8614a 60%,#7a2b1f)", head: "Spring Sale", sub: "Everything 20% off" },
    { bg: "linear-gradient(160deg,#1f2a44,#3c5a99 60%,#a6c0ff)", head: "New Season", sub: "Shop the drop" },
    { bg: "linear-gradient(160deg,#16302b,#2f7a62 60%,#bfe8c9)", head: "Fresh Picks", sub: "Made for spring" },
    { bg: "linear-gradient(160deg,#2b1630,#8a3c9e 60%,#f0b5ff)", head: "This Weekend", sub: "Doors open at 10" },
  ],
  [
    { bg: "linear-gradient(160deg,#ffe29a,#ff9a62 55%,#c2410c)", head: "Golden Hour", sub: "20% off till Sunday" },
    { bg: "linear-gradient(160deg,#0f172a,#7c3aed 60%,#f0abfc)", head: "Night Market", sub: "Members first" },
    { bg: "linear-gradient(160deg,#ecfccb,#65a30d 60%,#14532d)", head: "In Bloom", sub: "The spring edit" },
    { bg: "linear-gradient(160deg,#cffafe,#0891b2 60%,#164e63)", head: "Fresh Start", sub: "New courses inside" },
  ],
];

function AdDesigner() {
  const [prompt, setPrompt] = useState("Spring sale for the shop, warm light, square");
  const [set, setSet] = useState(0);
  const [loading, setLoading] = useState(false);
  const run = () => {
    setLoading(true);
    setTimeout(() => {
      setSet((s) => (s + 1) % ADS.length);
      setLoading(false);
    }, 1300);
  };
  return (
    <Page
      title="Ad Designer"
      aside={
        <Tag tone="meta" className="ml-1">
          <MuseGlyph className="h-2 w-4" /> Muse Image
        </Tag>
      }
    >
      <div className="flex gap-2">
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} className="h-10 min-w-0 flex-1 rounded-lg border border-(--i-line) bg-(--i-card) px-3 text-[14px] text-(--i-strong) outline-none focus:border-(--i-accent)" />
        <Btn primary onClick={run} disabled={loading} className="h-10 px-4">
          {loading ? <Spinner /> : <SparklesIcon className="size-4" />}
          Generate
        </Btn>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-3">
        {ADS[set]!.map((a, i) => (
          <div key={`${set}-${i}`} className="relative aspect-square overflow-hidden rounded-xl border border-(--i-line) bg-(--i-fill)">
            <div className={cx("absolute inset-0 transition-[opacity,filter,transform] duration-700", loading ? "scale-105 opacity-30 blur-xl" : "opacity-100")} style={{ background: a.bg, transitionDelay: `${i * 80}ms` }} />
            <div className={cx("absolute inset-x-3 bottom-3 transition-opacity duration-500", loading && "opacity-0")}>
              <div className="text-[19px] leading-tight text-white">{a.head}</div>
              <div className="text-[12px] text-white/80">{a.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

function NewsletterPage() {
  return (
    <Page title="Campaigns">
      <Table
        cols={[{ label: "Subject", w: "2.2fr" }, { label: "Status", w: "1fr" }, { label: "Sent To", w: "1fr" }, { label: "Opens", w: "0.7fr", align: "right" }]}
        rows={[
          ["Spring Sale starts Friday", <Tag key="s" tone="meta">Scheduled</Tag>, "Subscribers", "—"],
          ["Five landing pages that convert", <Tag key="s" tone="success">Sent</Tag>, "1,204", "58%"],
          ["Welcome to the Studio", <Tag key="s" tone="success">Automated</Tag>, "New signups", "71%"],
        ]}
      />
    </Page>
  );
}

// ---- Database ----

const ROWS: Record<string, string[][]> = {
  contacts: [
    ["c_8f2k1", "maya@rivera.studio", "Maya Rivera", "subscriber, customer", "2m ago"],
    ["c_7d1qa", "sam@kline.co", "Sam Kline", "subscriber", "14m ago"],
    ["c_6h3zt", "priya@north.io", "Priya Nair", "waitlist", "1h ago"],
    ["c_5m9xe", "theo@marsh.dev", "Theo Marsh", "customer", "3h ago"],
    ["c_4b2wd", "lena@ortiz.fm", "Lena Ortiz", "subscriber", "5h ago"],
    ["c_3p8rv", "ivy@chen.email", "Ivy Chen", "subscriber, partner", "Yesterday"],
    ["c_2n5yu", "ola@berg.no", "Ola Berg", "waitlist", "Yesterday"],
  ],
  blog_posts: [
    ["p_1", "why-we-own-our-marketing-stack", "Why we own our marketing stack", "published", "2h ago"],
    ["p_2", "spring-launch", "Spring launch: what's new", "scheduled", "Yesterday"],
    ["p_3", "five-landing-pages", "Five landing pages that convert", "published", "3d ago"],
    ["p_4", "writing-with-muse-code", "How we write with Muse Code", "draft", "4d ago"],
  ],
  form_submissions: [
    ["s_9a1", "Newsletter", "maya@rivera.studio", "/blog/why-we-own", "2m ago"],
    ["s_9a0", "Spring Waitlist", "priya@north.io", "/spring-sale", "1h ago"],
    ["s_8z7", "Newsletter", "sam@kline.co", "/blog/five-landing-pages", "2h ago"],
    ["s_8z6", "Contact", "hello@acme.co", "/contact", "4h ago"],
    ["s_8z5", "Spring Waitlist", "ola@berg.no", "/spring-sale", "Yesterday"],
  ],
  landing_pages: [
    ["l_1", "spring-sale", "Spring Sale", "live", "1d ago"],
    ["l_2", "creator-course", "Creator Course", "live", "6d ago"],
    ["l_3", "webinar-own-your-stack", "Webinar: Own Your Stack", "draft", "2d ago"],
  ],
  events: [
    ["e_41k", "form.submitted", "forms", "s_9a1", "2m ago"],
    ["e_41j", "contact.created", "core", "c_8f2k1", "2m ago"],
    ["e_41h", "post.published", "blog", "p_1", "2h ago"],
    ["e_41g", "page.viewed", "landing", "l_1", "2h ago"],
  ],
};

const COLS: Record<string, string[]> = {
  contacts: ["id", "email", "name", "tags", "created_at"],
  blog_posts: ["id", "slug", "title", "status", "updated_at"],
  form_submissions: ["id", "form", "email", "page", "created_at"],
  landing_pages: ["id", "slug", "title", "status", "updated_at"],
  events: ["id", "name", "source", "subject", "at"],
};

function TablePage({ table, bare }: { table: string; bare?: boolean }) {
  return (
    <Page title={bare ? (table === "contacts" ? "Subscribers" : "Submissions") : <span className="font-mono text-[19px]">{table}</span>} aside={bare ? undefined : <Tag>{(ROWS[table]?.length ?? 0) * 214} rows</Tag>}>
      <Table cols={COLS[table]!.map((c, i) => ({ label: c, w: i === 0 ? "0.8fr" : i === 1 || i === 2 ? "1.6fr" : "1fr" }))} rows={ROWS[table]!} mono={[0]} />
    </Page>
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

function ReportPage() {
  const weeks = [42, 51, 47, 63, 58, 71, 103, 128];
  return (
    <Page title="Signups">
      <div className="grid grid-cols-3 gap-3">
        {[
          ["This Week", "128", "+24%"],
          ["Last 8 Weeks", "563", "+61%"],
          ["Best Source", "Spring Sale", "39%"],
        ].map(([k, v, n]) => (
          <Box key={k} className="p-4">
            <div className="text-[13px] text-(--i-muted)">{k}</div>
            <div className="mt-1 text-[22px] text-(--i-strong)">{v}</div>
            <div className="text-[12.5px] text-(--i-success)">{n}</div>
          </Box>
        ))}
      </div>
      <Box className="mt-3 p-4">
        <BoxTitle icon={ChartColumnIcon}>By Week</BoxTitle>
        <Bars values={weeks} className="mt-4 h-40" />
        <div className="mt-2 flex justify-between text-[11.5px] text-(--i-muted)">
          {weeks.map((_, i) => (
            <span key={i} className="flex-1 text-center">
              W{i + 1}
            </span>
          ))}
        </div>
      </Box>
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
      <Table cols={[{ label: "Event", w: "1.6fr" }, { label: "Source", w: "1fr" }, { label: "When", w: "0.6fr", align: "right" }]} mono={[0]} rows={list.map((e) => [e.name, e.source, e.at])} />
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

const SWATCHES = [
  "linear-gradient(135deg,#f6b26b,#e8614a)",
  "linear-gradient(135deg,#3c5a99,#a6c0ff)",
  "linear-gradient(135deg,#2f7a62,#bfe8c9)",
  "linear-gradient(135deg,#8a3c9e,#f0b5ff)",
  "linear-gradient(135deg,#0891b2,#cffafe)",
  "linear-gradient(135deg,#c2410c,#ffe29a)",
  "linear-gradient(135deg,#7c3aed,#0f172a)",
  "linear-gradient(135deg,#65a30d,#ecfccb)",
  "linear-gradient(135deg,#ec1480,#ff5a1f)",
  "linear-gradient(135deg,#26d9f0,#9b3dff)",
];

function ImagesPage() {
  const names = ["hero-spring.jpg", "course-cover.png", "team.jpg", "webinar.png", "logo-mark.svg", "sale-banner.jpg", "studio.jpg", "bloom.png", "launch.jpg", "og-card.png"];
  return (
    <Page title="Images" aside={<Tag>Cloudflare Images</Tag>}>
      <div className="grid grid-cols-5 gap-3">
        {names.map((n, i) => (
          <div key={n}>
            <div className="aspect-[4/3] rounded-lg" style={{ background: SWATCHES[i % SWATCHES.length] }} />
            <div className="mt-1.5 truncate text-[12.5px] text-(--i-muted)">{n}</div>
          </div>
        ))}
      </div>
    </Page>
  );
}

function MediaPage() {
  const vids = [
    ["Spring launch film", "2:14"],
    ["Course intro", "4:02"],
    ["Webinar replay", "48:10"],
    ["Product tour", "1:36"],
  ];
  return (
    <Page title="Media" aside={<Tag>Cloudflare Stream</Tag>}>
      <div className="grid grid-cols-2 gap-3">
        {vids.map(([n, d], i) => (
          <Box key={n} className="overflow-hidden">
            <div className="relative grid aspect-video place-items-center" style={{ background: SWATCHES[(i * 3) % SWATCHES.length] }}>
              <span className="grid size-10 place-items-center rounded-full bg-black/40 backdrop-blur-sm">
                <PlayIcon className="size-4 fill-white text-white" />
              </span>
              <span className="absolute right-2 bottom-2 rounded bg-black/50 px-1.5 text-[11.5px] text-white">{d}</span>
            </div>
            <div className="p-3 text-[13.5px] text-(--i-strong)">{n}</div>
          </Box>
        ))}
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

