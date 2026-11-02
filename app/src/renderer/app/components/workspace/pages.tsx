import {
  ArrowUpDownIcon,
  CheckIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FilterIcon,
  HistoryIcon,
  HomeIcon,
  ImageIcon,
  KeyRoundIcon,
  ListIcon,
  MessageCircleIcon,
  PanelRightIcon,
  PlugIcon,
  PlusIcon,
  RocketIcon,
  SearchIcon,
  SettingsIcon,
  TableIcon,
  UploadCloudIcon,
  UsersIcon,
  WorkflowIcon,
} from "lucide-react";
import * as React from "react";
import { Link } from "react-router";
import { AppIcon } from "~/components/app-icon";
import { Card, Crumbs, WorkspaceFrame, IndexHeader } from "~/components/workspace/frame";
import { appStats } from "~/components/workspace/app-stats";
import { ChatPanel } from "~/components/workspace/chat-panel";
import { DataGrid } from "~/components/workspace/data-grid";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { toastManager } from "~/components/ui/toast";
import { useWorkspacePage } from "~/lib/workspace-page";
import { activity, appName, catalog, chats, chatsFor, connections, files, secrets, tables, tablesFor, teamName, workflows, type AppId, type Workspace } from "~/lib/mock";
import { cn } from "~/lib/utils";

type PageProps = { ws: Workspace; onOpenNav: () => void };

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

// ---- Home ----

export function HomePage({ ws, onOpenNav }: PageProps): React.ReactElement {
  const { go } = useWorkspacePage();
  const wsChats = chatsFor(ws.id);
  const updates = ws.installs.filter((i) => i.status === "update").length;
  const team = teamName(ws.teamId);
  return (
    <WorkspaceFrame
      icon={<HomeIcon />}
      title="Home"
      onOpenNav={onOpenNav}
    >
      <div className="flex flex-col gap-0.5 pt-2">
        <h2 className="font-heading text-xl font-bold">{ws.name}</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <a href={ws.url} target="_blank" rel="noreferrer" className="hover:text-foreground">
            {ws.url.replace(/^https?:\/\//, "")}
          </a>
          <span>·</span>
          <span>Deployed {ws.lastDeploy}</span>
          {team && (
            <>
              <span>·</span>
              <span>Client: {team}</span>
            </>
          )}
        </div>
      </div>

      <Card padded={false}>
        <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
          <StatTile label="Contacts" value={ws.contacts.toLocaleString()} hint="+12 this week" />
          <StatTile label="Apps" value={ws.installs.length} hint={updates ? `${updates} update${updates > 1 ? "s" : ""} available` : "all up to date"} />
          <StatTile label="Tables" value={tablesFor(ws).length} hint={`${tablesFor(ws).reduce((n, t) => n + t.rows.length, 0)} rows`} />
          <StatTile label="Workflows" value={(workflows[ws.id] ?? []).length} hint={workflows[ws.id] ? `${workflows[ws.id].reduce((n, w) => n + w.runs, 0)} runs` : "none yet"} />
        </div>
      </Card>

      {updates > 0 && (
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <RocketIcon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 text-[13px]">
              <div className="font-medium">
                {updates} app update{updates > 1 ? "s" : ""} ready to deploy
              </div>
              <div className="text-muted-foreground">{ws.installs.filter((i) => i.status === "update").map((i) => `${appName(i.app)} ${i.version} → ${i.latest}`).join(", ")}</div>
            </div>
            <Button size="xs" onClick={() => toastManager.add({ title: `Deploying ${updates} updates`, type: "loading", timeout: 2500 })}>
              Deploy
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Apps" actions={<Button size="xs" variant="ghost" render={<Link to="/apps" />}>Add app</Button>} padded={false}>
          <ul className="divide-y">
            {ws.installs.map((i) => (
              <li key={i.app}>
                <button type="button" onClick={() => go({ kind: "app", app: i.app })} className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-[13px] hover:bg-accent/40">
                  <AppIcon app={i.app} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{appName(i.app)}</div>
                    <div className="truncate text-xs text-muted-foreground">{catalog.find((a) => a.id === i.app)?.tagline}</div>
                  </div>
                  {i.status === "update" ? (
                    <Badge variant="warning" size="sm">
                      {i.latest}
                    </Badge>
                  ) : i.status === "failed" ? (
                    <Badge variant="error" size="sm">
                      failed
                    </Badge>
                  ) : i.status === "deploying" ? (
                    <Badge variant="info" size="sm">
                      deploying
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">{i.version}</span>
                  )}
                  <ChevronRightIcon className="size-4 text-muted-foreground/60" />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Recent chats" actions={<Button size="xs" variant="ghost" onClick={() => go({ kind: "chat" })}>New chat</Button>} padded={false}>
          {wsChats.length === 0 ? (
            <div className="px-4 pb-6 pt-2 text-center text-[13px] text-muted-foreground">No chats yet. Ask the agent anything below.</div>
          ) : (
            <ul className="divide-y">
              {wsChats.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => go({ kind: "chat", id: c.id })} className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-[13px] hover:bg-accent/40">
                    <MessageCircleIcon className="size-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{c.title}</div>
                      <div className="truncate text-xs text-muted-foreground">{c.messages[c.messages.length - 1]?.text}</div>
                    </div>
                    <span className="text-xs text-muted-foreground">{c.when}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Activity" padded={false}>
        <ul className="divide-y">
          {activity.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
              <span className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {a.kind === "deploy" ? <RocketIcon className="size-3.5" /> : a.kind === "member" ? <UsersIcon className="size-3.5" /> : a.kind === "install" ? <PlusIcon className="size-3.5" /> : <SettingsIcon className="size-3.5" />}
              </span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{a.who}</span> {a.what}
              </span>
              <span className="text-xs text-muted-foreground">{a.when}</span>
            </li>
          ))}
        </ul>
      </Card>
      <div className="h-10" />
    </WorkspaceFrame>
  );
}

// ---- Chat ----

export function ChatPage({ ws, chatId, onOpenNav }: PageProps & { chatId?: string }): React.ReactElement {
  const chat = chatId ? chats.find((c) => c.id === chatId) : undefined;
  const { go } = useWorkspacePage();
  return (
    <WorkspaceFrame
      icon={<MessageCircleIcon />}
      title={chat ? chat.title : "New chat"}
      onOpenNav={onOpenNav}
      flush
      actions={
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon-xs" aria-label="Open as side panel" className="text-muted-foreground hover:text-foreground" />}
            onClick={() => go({ kind: "home" }, { side: chatId ? `chat:${chatId}` : "chat" })}
          >
            <PanelRightIcon />
          </TooltipTrigger>
          <TooltipPopup>Open as side panel</TooltipPopup>
        </Tooltip>
      }
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col px-4 pb-4 pt-2 sm:px-6">
        <ChatPanel ws={ws} chatId={chatId} />
      </div>
    </WorkspaceFrame>
  );
}

// ---- Data ----

export function DataPage({ ws, table, onOpenNav }: PageProps & { table?: string }): React.ReactElement {
  const list = tablesFor(ws);
  const current = list.find((t) => t.id === table) ?? list[0];
  return (
    <WorkspaceFrame
      icon={<TableIcon />}
      title={
        <Crumbs
          items={[
            "Data",
            <span className="flex items-center gap-1.5">
              {current.owner !== "core" && <AppIcon app={current.owner} size="xs" />}
              {current.name}
            </span>,
          ]}
        />
      }
      onOpenNav={onOpenNav}
      actions={
        <>
          <Button size="xs" variant="outline">
            Import
          </Button>
          <Button size="xs">
            <PlusIcon />
            New row
          </Button>
        </>
      }
      flush
    >
      <IndexHeader
        tabs={["All", `Subscribed`, "Recent"]}
        right={
          <>
            <IconButton label="Search and filter">
              <SearchIcon />
            </IconButton>
            <IconButton label="Sort">
              <ArrowUpDownIcon />
            </IconButton>
            <IconButton label="History">
              <HistoryIcon />
            </IconButton>
          </>
        }
      />
      <DataGrid table={current} />
      <div className="flex h-7 shrink-0 items-center gap-2 border-t px-3 text-[11px] text-muted-foreground">
        <span>
          {current.rows.length} rows · {current.columns.length} columns
        </span>
        <span>·</span>
        <span>{current.owner === "core" ? "core table" : `owned by ${current.owner}`}</span>
      </div>
      <FilterIcon className="hidden" />
    </WorkspaceFrame>
  );
}

// ---- App ----

export function AppPage({ ws, app, path, onOpenNav }: PageProps & { app: AppId; path?: string }): React.ReactElement {
  const meta = catalog.find((a) => a.id === app);
  const install = ws.installs.find((i) => i.app === app);
  if (!meta || !install) {
    return (
      <WorkspaceFrame title="Not installed" onOpenNav={onOpenNav}>
        <div className="py-10 text-center text-sm text-muted-foreground">This app is not installed in {ws.name}.</div>
      </WorkspaceFrame>
    );
  }
  const flat = meta.nav.flatMap((n) => [n, ...(n.children ?? [])]);
  const current = flat.find((n) => n.path === (path ? `/${path}` : "/")) ?? meta.nav[0];
  const parent = meta.nav.find((n) => n.children?.some((c) => c === current));
  const isOverview = current === meta.nav[0];
  const table = tables.find((t) => t.owner === app);
  const rows = table?.rows ?? [];
  const stats = appStats(app);
  const noun = current.label.replace(/s$/, "").toLowerCase();

  return (
    <WorkspaceFrame
      icon={<AppIcon app={app} size="xs" />}
      title={<Crumbs items={isOverview ? [meta.name] : [meta.name, ...(parent ? [<span className="text-muted-foreground">{parent.label}</span>] : []), current.label]} />}
      onOpenNav={onOpenNav}
      actions={
        <>
          <IconButton label={`${meta.name} settings`}>
            <SettingsIcon />
          </IconButton>
          <Button size="xs" variant="outline" render={<a href={ws.url + (meta.mount === "/" ? "" : meta.mount)} target="_blank" rel="noreferrer" />}>
            <ExternalLinkIcon />
            View
          </Button>
          <Button size="xs">
            <PlusIcon />
            New {noun}
          </Button>
        </>
      }
    >
      {isOverview && (
        <Card padded={false}>
          <div className={cn("grid grid-cols-2 divide-x divide-y sm:divide-y-0", stats.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-2")}>
            {stats.map((s) => (
              <StatTile key={s.label} label={s.label} value={s.value} hint={s.hint} />
            ))}
          </div>
        </Card>
      )}

      <Card padded={false}>
        <IndexHeader
          tabs={["All", "+"]}
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
        {rows.length === 0 || !isOverview ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <ListIcon className="size-5" />
            </span>
            <div className="text-[13px]">
              <div className="font-medium">No {current.label.toLowerCase()} yet</div>
              <div className="text-muted-foreground">
                {current.label} in {meta.name} show up here once you add one.
              </div>
            </div>
            <Button size="xs">
              <PlusIcon />
              Add {noun}
            </Button>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="h-9 w-8 border-b ps-4">
                  <span className="block size-3.5 rounded-sm border" />
                </th>
                <th className="h-9 border-b px-2 font-medium">{noun.charAt(0).toUpperCase() + noun.slice(1)}</th>
                <th className="h-9 border-b px-2 font-medium">Status</th>
                <th className="h-9 border-b px-2 font-medium max-sm:hidden">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const title = String(r.title ?? r.name ?? r.answer ?? r.id);
                const sub = String(r.slug ?? r.form ?? r.trigger ?? "");
                const status = String(r.status ?? "");
                return (
                  <tr key={i} className="hover:bg-accent/40">
                    <td className="border-b ps-4">
                      <span className="block size-3.5 rounded-sm border" />
                    </td>
                    <td className="border-b px-2 py-2">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                          {app === "pages" ? <ImageIcon className="size-4" /> : <ListIcon className="size-4" />}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{title}</div>
                          {sub && <div className="truncate text-xs text-muted-foreground">{sub}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="border-b px-2">
                      {status ? (
                        <Badge variant={status === "published" || status === "live" ? "success" : "warning"} size="sm">
                          {status}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="border-b px-2 text-xs text-muted-foreground max-sm:hidden">{String(r.updated_at ?? r.at ?? "—")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
      <div className="h-10" />
    </WorkspaceFrame>
  );
}

// ---- Workflows ----

export function WorkflowsPage({ ws, onOpenNav }: PageProps): React.ReactElement {
  const list = workflows[ws.id] ?? [];
  return (
    <WorkspaceFrame
      icon={<WorkflowIcon />}
      title="Workflows"
      onOpenNav={onOpenNav}
      actions={
        <Button size="xs">
          <PlusIcon />
          New workflow
        </Button>
      }
    >
      <Card padded={false}>
        <IndexHeader tabs={["All", "Active", "Paused"]} />
        {list.length === 0 ? (
          <div className="px-6 py-12 text-center text-[13px] text-muted-foreground">No workflows yet. Ask the agent to automate something.</div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="h-9 border-b ps-4 font-medium">Workflow</th>
                <th className="h-9 border-b px-2 font-medium">Trigger</th>
                <th className="h-9 border-b px-2 text-right font-medium">Runs</th>
                <th className="h-9 border-b px-2 pe-4 text-right font-medium">Last run</th>
              </tr>
            </thead>
            <tbody>
              {list.map((w) => (
                <tr key={w.id} className="hover:bg-accent/40">
                  <td className="border-b py-2.5 ps-4 font-medium">{w.name}</td>
                  <td className="border-b px-2 font-mono text-xs text-muted-foreground">{w.trigger}</td>
                  <td className="border-b px-2 text-right tabular-nums">{w.runs.toLocaleString()}</td>
                  <td className="border-b px-2 pe-4 text-right text-xs text-muted-foreground">{w.last}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </WorkspaceFrame>
  );
}

// ---- Files ----

export function FilesPage({ ws, onOpenNav }: PageProps): React.ReactElement {
  const list = files[ws.id] ?? [];
  return (
    <WorkspaceFrame
      icon={<FileIcon />}
      title="Files"
      onOpenNav={onOpenNav}
      actions={
        <Button size="xs">
          <UploadCloudIcon />
          Upload
        </Button>
      }
    >
      <Card padded={false}>
        <IndexHeader tabs={["All", "Images", "Documents"]} />
        {list.length === 0 ? (
          <div className="m-4 flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center text-[13px] text-muted-foreground">
            <UploadCloudIcon className="size-5" />
            Drag and drop or browse to upload
          </div>
        ) : (
          <ul className="divide-y">
            {list.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-accent/40">
                <span className="flex size-8 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                  {f.kind === "image" ? <ImageIcon className="size-4" /> : f.kind === "csv" ? <FileSpreadsheetIcon className="size-4" /> : <FileTextIcon className="size-4" />}
                </span>
                <span className="flex-1 truncate font-medium">{f.name}</span>
                <span className="text-xs text-muted-foreground">{f.size}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </WorkspaceFrame>
  );
}

// ---- Secrets ----

export function SecretsPage({ ws, onOpenNav }: PageProps): React.ReactElement {
  const list = secrets[ws.id] ?? [];
  return (
    <WorkspaceFrame
      icon={<KeyRoundIcon />}
      title="Secrets"
      onOpenNav={onOpenNav}
      actions={
        <Button size="xs">
          <PlusIcon />
          Add secret
        </Button>
      }
    >
      <Card title="Environment secrets" description="Available to every app in this workspace as bindings. Values are write-only." padded={false}>
        {list.length === 0 ? (
          <div className="px-4 pb-8 pt-2 text-center text-[13px] text-muted-foreground">No secrets yet.</div>
        ) : (
          <ul className="divide-y border-t">
            {list.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                <KeyRoundIcon className="size-4 text-muted-foreground" />
                <span className="flex-1 truncate font-mono text-xs">{s.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{s.hint}</span>
                <span className="text-xs text-muted-foreground max-sm:hidden">updated {s.updatedAt}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </WorkspaceFrame>
  );
}

// ---- Connections ----

export function IntegrationsPage({ ws, onOpenNav }: PageProps): React.ReactElement {
  const connected = ws.id === "acme" ? connections.filter((c) => c.status === "connected") : [];
  const available = connections.filter((c) => !connected.includes(c));
  const Row = ({ c, on }: { c: (typeof connections)[number]; on: boolean }) => (
    <li className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
      <span className="flex size-8 items-center justify-center rounded-md text-white" style={{ background: c.color }}>
        <PlugIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-medium">{c.name}</div>
        <div className="truncate text-xs text-muted-foreground">{c.description}</div>
      </div>
      {on ? (
        <Badge variant="success" size="sm">
          <CheckIcon />
          Connected
        </Badge>
      ) : (
        <Button size="xs" variant="outline">
          Connect
        </Button>
      )}
    </li>
  );
  return (
    <WorkspaceFrame icon={<PlugIcon />} title="Integrations" onOpenNav={onOpenNav}>
      <Card title="Connected" padded={false}>
        {connected.length === 0 ? <div className="px-4 pb-6 pt-2 text-center text-[13px] text-muted-foreground">Nothing connected yet.</div> : <ul className="divide-y border-t">{connected.map((c) => <Row key={c.id} c={c} on />)}</ul>}
      </Card>
      <Card title="Available" padded={false}>
        <ul className="divide-y border-t">
          {available.map((c) => (
            <Row key={c.id} c={c} on={false} />
          ))}
        </ul>
      </Card>
    </WorkspaceFrame>
  );
}
