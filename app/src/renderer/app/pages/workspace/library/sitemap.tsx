import { ArrowRightIcon, DatabaseIcon, ExternalLinkIcon, FolderIcon, GlobeIcon, LayoutDashboardIcon, ListOrderedIcon, MapIcon, PackageIcon, PlugIcon, ServerIcon } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, WorkspaceFrame } from "~/components/workspace/frame";
import { FilterTabs, openExternal, useLibraryTarget } from "~/components/workspace/library/shared";
import { AppGlyph } from "~/components/workspace/app-icon";
import { useSession } from "~/lib/session";
import { useOpenNav } from "~/shell/context";

// The sitemap: what the workspace serves and what runs it. Pages lists each app with its public
// mount, its public pages, its admin pages and whether it has an API, from the Worker's own ROUTES
// (ws.apps). Workers maps the workspace Worker to its database, bucket and queue and to each
// app's Worker, each with a link into the Cloudflare dashboard. With no app installed yet, Pages
// shows an example set so the shape is clear; it is marked as such.

type AppEntry = { app: string; name: string; icon?: string; public?: string; admin: boolean; api: boolean; nav?: { label: string; path: string }[]; pages?: string[] };

// What an installed app looks like here, for a workspace with none yet. Marked Example on the page.
const EXAMPLE_APPS: AppEntry[] = [
  { app: "site", name: "Website", public: "/", admin: true, api: false, nav: [{ label: "Pages", path: "/" }, { label: "Navigation", path: "/navigation" }, { label: "Settings", path: "/settings" }], pages: ["/", "/about", "/pricing", "/contact"] },
  { app: "booking", name: "Booking", public: "/book", admin: true, api: true, nav: [{ label: "Calendar", path: "/" }, { label: "Services", path: "/services" }, { label: "Settings", path: "/settings" }], pages: ["/book", "/book/:service", "/book/confirm"] },
  { app: "newsletter", name: "Newsletter", public: "/newsletter", admin: true, api: true, nav: [{ label: "Issues", path: "/" }, { label: "Subscribers", path: "/subscribers" }], pages: ["/newsletter", "/newsletter/:issue", "/newsletter/subscribe"] },
  { app: "store", name: "Store", public: "/shop", admin: true, api: true, nav: [{ label: "Products", path: "/" }, { label: "Orders", path: "/orders" }, { label: "Discounts", path: "/discounts" }], pages: ["/shop", "/shop/:product", "/shop/cart", "/shop/checkout"] },
];

const TABS = [
  { key: "pages", label: "Pages" },
  { key: "workers", label: "Workers" },
] as const;

function Route({ path, kind, href }: { path: string; kind: "public" | "admin" | "api"; href?: string }): React.ReactElement {
  const Icon = kind === "public" ? GlobeIcon : kind === "admin" ? LayoutDashboardIcon : PlugIcon;
  return (
    <li className="flex h-8 items-center gap-2.5 text-sm">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      {href ? (
        <button type="button" onClick={() => openExternal(href)} className="cursor-pointer truncate font-mono text-xs hover:underline">
          {path}
        </button>
      ) : (
        <span className="truncate font-mono text-xs">{path}</span>
      )}
      <span className="ms-auto text-xs text-muted-foreground">{kind === "public" ? "Public" : kind === "admin" ? "Admin" : "API"}</span>
    </li>
  );
}

function AppCard({ app, wsUrl, wsId, example }: { app: AppEntry; wsUrl: string; wsId: string; example: boolean }): React.ReactElement {
  const navigate = useNavigate();
  const site = wsUrl.replace(/\/$/, "");
  const pages = app.pages ?? (app.public ? [app.public] : []);
  return (
    <Card
      title={
        <span className="flex items-center gap-2 [&_svg]:size-4 [&_svg]:text-muted-foreground">
          <AppGlyph app={app} />
          {app.name}
        </span>
      }
      description={app.public ? `Public at ${site}${app.public === "/" ? "" : app.public}` : "Admin only"}
      actions={
        <Button size="xs" variant="ghost" className="gap-2 [&_svg]:mx-0" onClick={() => navigate(`/w/${wsId}/apps/${app.app}`)} disabled={example}>
          Open
          <ArrowRightIcon />
        </Button>
      }
    >
      <ul className="-mx-1 flex flex-col">
        {pages.map((p) => (
          <Route key={`p${p}`} path={p} kind="public" href={example || p.includes(":") ? undefined : `${site}${p}`} />
        ))}
        {app.admin && (app.nav?.length ? app.nav : [{ label: "Admin", path: "/" }]).map((n) => <Route key={`a${n.path}`} path={`/admin/${app.app}${n.path === "/" ? "" : n.path}`} kind="admin" />)}
        {app.api && <Route path={`/api/${app.app}/*`} kind="api" />}
      </ul>
    </Card>
  );
}

function Node({ icon: Icon, name, kind, href, hint }: { icon: React.ComponentType<{ className?: string }>; name: string; kind: string; href?: string; hint?: string }): React.ReactElement {
  return (
    <button type="button" onClick={href ? () => openExternal(href) : undefined} className={`flex w-full items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left shadow-xs/5 ${href ? "cursor-pointer transition-colors hover:bg-accent/50" : ""}`}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-sm">{name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {kind}
          {hint ? ` · ${hint}` : ""}
        </span>
      </span>
      {href && <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />}
    </button>
  );
}

export function SitemapPage({ tab }: { tab?: string }): React.ReactElement {
  const { accountId, ws, bucket } = useLibraryTarget();
  const { org } = useSession();
  const onOpenNav = useOpenNav();
  const navigate = useNavigate();
  const active = tab === "workers" ? "workers" : "pages";
  const prefix = org?.cloudflare?.prefix ?? "sg";
  const example = ws.apps.length === 0;
  const apps: AppEntry[] = example ? EXAMPLE_APPS : ws.apps;
  const dash = `https://dash.cloudflare.com/${accountId}`;
  const workerUrl = (name: string) => `${dash}/workers/services/view/${name}`;
  return (
    <WorkspaceFrame icon={<MapIcon />} title="Sitemap" onOpenNav={onOpenNav}>
      <div className="flex items-center gap-3">
        <FilterTabs tabs={TABS as unknown as { key: "pages" | "workers"; label: string }[]} value={active} onChange={(k) => navigate(`/w/${ws.id}/library/sitemap${k === "pages" ? "" : `/${k}`}`)} />
        <span className="flex-1" />
        <Button size="xs" variant="ghost" className="gap-2 [&_svg]:mx-0" onClick={() => openExternal(ws.url)}>
          {ws.url.replace(/^https?:\/\//, "")}
          <ExternalLinkIcon />
        </Button>
      </div>
      {active === "pages" ? (
        <>
          {example && (
            <div className="flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
              <Badge variant="info" size="sm">
                Example
              </Badge>
              No app is installed in this workspace yet. This is what the map looks like once a few are: each app, where it mounts on the site, its public pages, its admin pages and its API.
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {apps.map((a) => (
              <AppCard key={a.app} app={a} wsUrl={ws.url} wsId={ws.id} example={example} />
            ))}
          </div>
          <Card title="The Workspace Itself">
            <ul className="-mx-1 flex flex-col">
              <Route path="/_ws/theme.css" kind="public" href={`${ws.url.replace(/\/$/, "")}/_ws/theme.css`} />
              <Route path="/_ws/files/*" kind="public" />
              <Route path="/_ws/rpc" kind="api" />
              <Route path="/sitemap.xml" kind="public" href={`${ws.url.replace(/\/$/, "")}/sitemap.xml`} />
            </ul>
          </Card>
        </>
      ) : (
        <>
          <Card title="Workspace Worker">
            <div className="flex flex-col gap-4">
              <Node icon={ServerIcon} name={ws.worker} kind="Worker" hint={`release ${ws.version ?? "unknown"}`} href={workerUrl(ws.worker)} />
              <div className="grid gap-3 ps-6 sm:grid-cols-3">
                <Node icon={DatabaseIcon} name={ws.worker} kind="D1 database" href={`${dash}/workers/d1`} />
                <Node icon={FolderIcon} name={bucket} kind="R2 bucket" href={`${dash}/r2/default/buckets/${bucket}`} />
                <Node icon={ListOrderedIcon} name={`${ws.worker}-events`} kind="Queue" href={`${dash}/workers/queues`} />
              </div>
            </div>
          </Card>
          <Card title="App Workers" description={example ? "Each app runs as its own Worker next to the workspace, named after it. None is installed yet; these are what they would be called." : "One Worker per installed app, which the workspace routes to."}>
            <div className="grid gap-3 sm:grid-cols-2">
              {apps.map((a) => {
                const name = `${prefix}-app-${ws.id}-${a.app}`;
                return <Node key={a.app} icon={PackageIcon} name={name} kind={`Worker · ${a.name}`} href={example ? undefined : workerUrl(name)} />;
              })}
            </div>
          </Card>
        </>
      )}
    </WorkspaceFrame>
  );
}
