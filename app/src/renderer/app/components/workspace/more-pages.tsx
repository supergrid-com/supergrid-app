import { ArrowUpDownIcon, BarChart3Icon, ExternalLinkIcon, FileSpreadsheetIcon, FileTextIcon, ImageIcon, NetworkIcon, PaletteIcon, PlusIcon, ScrollTextIcon, SearchIcon, UploadCloudIcon, UsersIcon } from "lucide-react";
import * as React from "react";
import { AppIcon } from "~/components/app-icon";
import { Card, WorkspaceFrame, IndexHeader } from "~/components/workspace/frame";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { toastManager } from "~/components/ui/toast";
import { activity, appName, audit, catalog, files, tables, type Workspace } from "~/lib/mock";
import { cn } from "~/lib/utils";

// The rest of the workspace sections: analytics, contacts, logging, sitemap, media, design.
// All canned, like the others.

type PageProps = { ws: Workspace; onOpenNav: () => void };

const notYet = () => toastManager.add({ title: "Not in the POC", type: "info" });

function IconButton({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-xs" aria-label={label} className="text-muted-foreground hover:text-foreground" />}>{children}</TooltipTrigger>
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );
}

function StatTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-heading text-xl font-bold leading-tight">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

// ---- Analytics ----

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const visits = [820, 1140, 960, 1380, 1720, 640, 710];
const topPages = [
  { path: "/", views: 4120, change: "+8%" },
  { path: "/pricing", views: 1860, change: "+21%" },
  { path: "/blog", views: 1210, change: "-3%" },
  { path: "/about", views: 640, change: "+1%" },
  { path: "/f/spring-offer", views: 530, change: "+44%" },
];

export function AnalyticsPage({ ws, onOpenNav }: PageProps): React.ReactElement {
  const max = Math.max(...visits);
  return (
    <WorkspaceFrame icon={<BarChart3Icon />} title="Analytics" onOpenNav={onOpenNav} actions={<Button size="xs" variant="outline">Last 7 days</Button>}>
      <Card padded={false}>
        <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
          <StatTile label="Visitors" value="7,370" hint="+12% vs last week" />
          <StatTile label="Page views" value="12.4k" hint="1.7 per visit" />
          <StatTile label="Contacts" value={ws.contacts.toLocaleString()} hint="+12 this week" />
          <StatTile label="Conversion" value="3.6%" hint="checkouts / visits" />
        </div>
      </Card>
      <Card title="Visits" description="Unique visitors per day.">
        <div className="flex h-40 gap-2">
          {visits.map((v, i) => (
            <div key={days[i]} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-1 items-end">
                <div className="w-full rounded-t-md bg-primary/80" style={{ height: `${(v / max) * 100}%` }} title={`${v}`} />
              </div>
              <span className="text-[11px] text-muted-foreground">{days[i]}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Top pages" padded={false}>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="h-9 border-b ps-4 font-medium">Page</th>
              <th className="h-9 border-b px-2 text-right font-medium">Views</th>
              <th className="h-9 border-b px-2 pe-4 text-right font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {topPages.map((p) => (
              <tr key={p.path} className="hover:bg-accent/40">
                <td className="border-b py-2.5 ps-4 font-mono text-xs">{p.path}</td>
                <td className="border-b px-2 text-right tabular-nums">{p.views.toLocaleString()}</td>
                <td className={cn("border-b px-2 pe-4 text-right text-xs", p.change.startsWith("-") ? "text-destructive-foreground" : "text-success-foreground")}>{p.change}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="h-10" />
    </WorkspaceFrame>
  );
}

// ---- Contacts ----

export function ContactsPage({ ws, onOpenNav }: PageProps): React.ReactElement {
  const rows = tables.find((t) => t.id === "contacts")?.rows ?? [];
  return (
    <WorkspaceFrame
      icon={<UsersIcon />}
      title="Contacts"
      onOpenNav={onOpenNav}
      actions={
        <>
          <Button size="xs" variant="outline" onClick={notYet}>
            Import
          </Button>
          <Button size="xs" onClick={notYet}>
            <PlusIcon />
            Add contact
          </Button>
        </>
      }
    >
      <Card padded={false}>
        <IndexHeader
          tabs={["All", "Subscribed", "Customers", "New this week"]}
          right={
            <>
              <IconButton label="Search and filter">
                <SearchIcon />
              </IconButton>
              <IconButton label="Sort">
                <ArrowUpDownIcon />
              </IconButton>
            </>
          }
        />
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="h-9 w-8 border-b ps-4">
                <span className="block size-3.5 rounded-sm border" />
              </th>
              <th className="h-9 border-b px-2 font-medium">Contact</th>
              <th className="h-9 border-b px-2 font-medium max-sm:hidden">Source</th>
              <th className="h-9 border-b px-2 font-medium">Status</th>
              <th className="h-9 border-b px-2 pe-4 text-right font-medium max-sm:hidden">Added</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-accent/40">
                <td className="border-b ps-4">
                  <span className="block size-3.5 rounded-sm border" />
                </td>
                <td className="border-b px-2 py-2">
                  <div className="font-medium">{String(r.name)}</div>
                  <div className="text-xs text-muted-foreground">{String(r.email)}</div>
                </td>
                <td className="border-b px-2 text-xs text-muted-foreground max-sm:hidden">{String(r.source)}</td>
                <td className="border-b px-2">
                  {r.subscribed ? (
                    <Badge variant="success" size="sm">
                      Subscribed
                    </Badge>
                  ) : (
                    <Badge variant="outline" size="sm">
                      Not subscribed
                    </Badge>
                  )}
                </td>
                <td className="border-b px-2 pe-4 text-right text-xs text-muted-foreground max-sm:hidden">{String(r.created_at).slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="h-10" />
    </WorkspaceFrame>
  );
}

// ---- Logging ----

const levels = ["info", "info", "warn", "info", "error", "info"] as const;

export function LoggingPage({ ws, onOpenNav }: PageProps): React.ReactElement {
  const lines = [
    ...audit.map((l, i) => ({ id: l.id, at: l.when, level: levels[i % levels.length], source: "platform", text: `${l.who} ${l.what} (${l.where})` })),
    ...activity.map((a) => ({ id: a.id, at: a.when, level: "info" as const, source: a.kind, text: `${a.who} ${a.what}` })),
    ...ws.installs.map((i) => ({ id: i.app, at: ws.lastDeploy, level: i.status === "failed" ? ("error" as const) : ("info" as const), source: i.worker, text: i.status === "failed" ? `deploy failed: missing binding RESEND_API_KEY` : `deployed ${appName(i.app)} ${i.version}` })),
  ];
  return (
    <WorkspaceFrame icon={<ScrollTextIcon />} title="Logging" onOpenNav={onOpenNav} actions={<Button size="xs" variant="outline" onClick={notYet}>Live tail</Button>} width="wide">
      <Card padded={false}>
        <IndexHeader
          tabs={["All", "Errors", "Deploys", "Requests"]}
          right={
            <>
              <IconButton label="Search">
                <SearchIcon />
              </IconButton>
            </>
          }
        />
        <ul className="divide-y font-mono text-xs">
          {lines.map((l, i) => (
            <li key={`${l.id}-${i}`} className="flex items-start gap-3 px-4 py-2 hover:bg-accent/40">
              <span className="w-20 shrink-0 text-muted-foreground">{l.at}</span>
              <span className={cn("w-11 shrink-0 uppercase", l.level === "error" ? "text-destructive-foreground" : l.level === "warn" ? "text-warning-foreground" : "text-muted-foreground")}>{l.level}</span>
              <span className="w-28 shrink-0 truncate text-muted-foreground max-sm:hidden">{l.source}</span>
              <span className="min-w-0 flex-1 truncate">{l.text}</span>
            </li>
          ))}
        </ul>
      </Card>
      <div className="h-10" />
    </WorkspaceFrame>
  );
}

// ---- Sitemap ----

export function SitemapPage({ ws, onOpenNav }: PageProps): React.ReactElement {
  const pages = tables.find((t) => t.id === "pages")?.rows ?? [];
  const funnels = tables.find((t) => t.id === "funnels")?.rows ?? [];
  const host = ws.url.replace(/^https?:\/\//, "");
  const Node = ({ path, label, status, depth, app }: { path: string; label: string; status?: string; depth: number; app?: Parameters<typeof AppIcon>[0]["app"] }) => (
    <li className="flex items-center gap-2 px-4 py-2 text-[13px] hover:bg-accent/40" style={{ paddingInlineStart: 16 + depth * 20 }}>
      {app ? <AppIcon app={app} size="xs" /> : <span className="size-4 shrink-0 rounded-sm border bg-muted" />}
      <span className="font-mono text-xs">{path}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="flex-1" />
      {status && (
        <Badge variant={status === "published" || status === "live" ? "success" : "warning"} size="sm">
          {status}
        </Badge>
      )}
    </li>
  );
  return (
    <WorkspaceFrame
      icon={<NetworkIcon />}
      title="Sitemap"
      onOpenNav={onOpenNav}
      actions={
        <Button size="xs" variant="outline" render={<a href={`${ws.url}/sitemap.xml`} target="_blank" rel="noreferrer" />}>
          <ExternalLinkIcon />
          sitemap.xml
        </Button>
      }
    >
      <Card title={host} description="Every route the workspace serves, by app." padded={false}>
        <ul className="divide-y border-t">
          {ws.installs.map((i) => {
            const meta = catalog.find((a) => a.id === i.app);
            if (!meta) return null;
            const rows = i.app === "pages" ? pages.map((p) => ({ path: String(p.slug), label: String(p.title), status: String(p.status) })) : i.app === "funnels" ? funnels.map((f) => ({ path: `${meta.mount}/${f.name}`, label: String(f.name), status: String(f.status) })) : [{ path: meta.mount, label: meta.name, status: undefined }];
            return (
              <React.Fragment key={i.app}>
                <Node path={meta.mount} label={meta.name} depth={0} app={i.app} />
                {rows.map((r) => (
                  <Node key={r.path} path={r.path} label={r.label} status={r.status} depth={1} />
                ))}
              </React.Fragment>
            );
          })}
        </ul>
      </Card>
      <div className="h-10" />
    </WorkspaceFrame>
  );
}

// ---- Media ----

export function MediaPage({ ws, onOpenNav }: PageProps): React.ReactElement {
  const list = files[ws.id] ?? [];
  const tiles = [...list, ...Array.from({ length: 6 }, (_, i) => ({ id: `ph${i}`, name: ["hero-2.webp", "team.jpg", "logo.svg", "og-image.png", "icon-512.png", "pricing-bg.webp"][i], size: `${120 + i * 37} KB`, kind: "image" as const }))];
  return (
    <WorkspaceFrame
      icon={<ImageIcon />}
      title="Media"
      onOpenNav={onOpenNav}
      width="wide"
      actions={
        <Button size="xs" onClick={notYet}>
          <UploadCloudIcon />
          Upload
        </Button>
      }
    >
      <Card padded={false}>
        <IndexHeader tabs={["All", "Images", "Documents", "Unused"]} right={<IconButton label="Search"><SearchIcon /></IconButton>} />
        <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((f) => (
            <li key={f.id} className="group flex cursor-pointer flex-col gap-1.5">
              <div className="flex aspect-[4/3] items-center justify-center rounded-lg border bg-muted text-muted-foreground transition-colors group-hover:bg-accent">
                {f.kind === "image" ? <ImageIcon className="size-6" /> : f.kind === "csv" ? <FileSpreadsheetIcon className="size-6" /> : <FileTextIcon className="size-6" />}
              </div>
              <div className="truncate text-[13px] font-medium">{f.name}</div>
              <div className="text-[11px] text-muted-foreground">{f.size}</div>
            </li>
          ))}
        </ul>
      </Card>
      <div className="h-10" />
    </WorkspaceFrame>
  );
}

// ---- Design ----

export function DesignPage({ ws, onOpenNav }: PageProps): React.ReactElement {
  const [accent, setAccent] = React.useState(ws.theme.accent);
  const Swatch = ({ label, value, onChange }: { label: string; value: string; onChange?: (v: string) => void }) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium">{label}</span>
      <span className="flex items-center gap-2">
        <span className="size-7 shrink-0 rounded-md border" style={{ background: value }} />
        <Input value={value} onChange={(e) => onChange?.(e.target.value)} readOnly={!onChange} className="font-mono" />
      </span>
    </label>
  );
  return (
    <WorkspaceFrame
      icon={<PaletteIcon />}
      title="Design"
      onOpenNav={onOpenNav}
      actions={
        <Button size="xs" onClick={() => toastManager.add({ title: "Theme published", type: "success", timeout: 1500 })}>
          Publish
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-5">
          <Card title="Colors" description="Every app reads these from /_ws/theme.css.">
            <div className="flex flex-col gap-4">
              <Swatch label="Accent" value={accent} onChange={setAccent} />
              <Swatch label="Background" value={ws.theme.bg} />
              <Swatch label="Text" value={ws.theme.fg} />
            </div>
          </Card>
          <Card title="Type">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium">Display font</span>
              <Input defaultValue={ws.theme.font} />
            </label>
          </Card>
        </div>
        <Card title="Preview" description="What the site looks like with these settings." padded={false}>
          <div className="m-4 overflow-hidden rounded-lg border" style={{ background: ws.theme.bg, color: ws.theme.fg }}>
            <div className="flex items-center gap-3 border-b px-4 py-2.5 text-xs" style={{ borderColor: `${ws.theme.fg}14` }}>
              <span className="size-4 rounded-sm" style={{ background: accent }} />
              <span className="font-heading font-semibold">{ws.name}</span>
              <span className="flex-1" />
              <span className="opacity-60">Work</span>
              <span className="opacity-60">Pricing</span>
              <span className="opacity-60">Blog</span>
            </div>
            <div className="px-6 py-10">
              <div className="font-heading text-3xl font-bold leading-tight">Make something people come back to.</div>
              <p className="mt-2 max-w-md text-sm opacity-70">Sites, funnels and forms for {ws.name}, all on one theme in {ws.theme.font}.</p>
              <div className="mt-5 flex gap-2">
                <span className="rounded-md px-3 py-1.5 text-sm font-medium text-white" style={{ background: accent }}>
                  Get started
                </span>
                <span className="rounded-md border px-3 py-1.5 text-sm font-medium" style={{ borderColor: `${ws.theme.fg}33` }}>
                  See pricing
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
      <div className="h-10" />
    </WorkspaceFrame>
  );
}
