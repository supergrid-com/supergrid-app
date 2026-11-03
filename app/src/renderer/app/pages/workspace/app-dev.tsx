import { ChevronRightIcon, CodeIcon, ExternalLinkIcon, FileIcon, FolderIcon, FolderOpenIcon, GitBranchIcon, LoaderCircleIcon, PlayIcon, RefreshCwIcon, RocketIcon, SquareIcon, TriangleAlertIcon } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router";
import type { AppDeployProgress, DevLogLine, DevServerStatus, FileEntry, GitStatus, InstalledApp, LocalApp } from "../../../../shared/bridge";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { toastManager } from "~/components/ui/toast";
import { AppIcon } from "~/components/workspace/app-icon";
import { Card, IconButton, WorkspaceFrame } from "~/components/workspace/frame";
import { ConfirmDialog, FilterTabs, formatBytes, openExternal, relative } from "~/components/workspace/library/shared";
import { refreshLocalApps, refreshServedManifest, usePackages, useServedManifest } from "~/lib/apps";
import { sg } from "~/lib/bridge";
import { clean, refreshWorkspaces, type WorkspaceSummary } from "~/lib/workspaces";
import { useSession } from "~/lib/session";
import { cn } from "~/lib/utils";
import { useOpenNav } from "~/shell/context";

// An app's Dev panel: what its manifest declares and what its running code serves, its files, its dev server, its
// git history, and installing or deploying it into the workspace. Everything here runs on this Mac through the main
// process (src/main/apps.ts); the app's folder is the workspace's folder under the app's data folder.

const TABS = [
  { key: "", label: "Overview" },
  { key: "files", label: "Files" },
  { key: "server", label: "Server" },
  { key: "git", label: "Git" },
  { key: "deploy", label: "Deploy" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export function AppDev({ ws, appId, installed, folder, tab }: { ws: WorkspaceSummary; appId: string; installed: InstalledApp | null; folder: LocalApp | null; tab: string }): React.ReactElement {
  const onOpenNav = useOpenNav();
  const navigate = useNavigate();
  const active = (TABS.find((t) => t.key === tab)?.key ?? "") as Tab;
  const name = folder?.manifest.name ?? installed?.name ?? appId;
  const icon = { name, icon: folder?.manifest.icon?.trimStart().startsWith("<svg") ? folder.manifest.icon : installed?.icon, color: folder?.manifest.color ?? installed?.color };
  const go = (t: Tab) => navigate(`/w/${ws.id}/apps/${appId}/_dev${t ? `/${t}` : ""}`);
  return (
    <WorkspaceFrame
      icon={<CodeIcon />}
      title={`${name} · Dev`}
      width="wide"
      onOpenNav={onOpenNav}
      actions={
        <>
          {folder && <IconButton label="Reveal in Finder" onClick={() => void sg?.apps.reveal(ws.id, appId)}><FolderOpenIcon /></IconButton>}
          {installed?.admin && <IconButton label="Open the App" onClick={() => navigate(`/w/${ws.id}/apps/${appId}`)}><ExternalLinkIcon /></IconButton>}
        </>
      }
    >
      <div className="flex items-center gap-4">
        <AppIcon app={icon} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-semibold">{name}</h2>
            <span className="font-mono text-xs text-muted-foreground">{appId}</span>
            {folder && <Badge size="sm" variant="outline">v{folder.manifest.version}</Badge>}
            {installed ? <Badge size="sm" variant="success">Installed{installed.version ? ` ${installed.version}` : ""}</Badge> : <Badge size="sm" variant="secondary">Not Installed</Badge>}
            {folder && installed?.version && installed.version !== folder.manifest.version && <Badge size="sm" variant="warning">Folder is {folder.manifest.version}</Badge>}
          </div>
          <p className="truncate text-sm text-muted-foreground">{folder?.manifest.description ?? (folder ? folder.dir : "No folder for this app on this Mac; it was installed elsewhere.")}</p>
        </div>
      </div>
      <FilterTabs tabs={TABS as unknown as { key: Tab; label: string }[]} value={active} onChange={go} />
      {active === "" && <Overview ws={ws} appId={appId} installed={installed} folder={folder} />}
      {active === "files" && (folder ? <Files ws={ws} appId={appId} /> : <NoFolder />)}
      {active === "server" && (folder ? <Server ws={ws} appId={appId} /> : <NoFolder />)}
      {active === "git" && (folder ? <Git ws={ws} appId={appId} /> : <NoFolder />)}
      {active === "deploy" && <Deploy ws={ws} appId={appId} installed={installed} folder={folder} />}
    </WorkspaceFrame>
  );
}

function NoFolder(): React.ReactElement {
  return (
    <Empty className="py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon"><FolderIcon /></EmptyMedia>
        <EmptyTitle>No Folder on This Mac</EmptyTitle>
        <EmptyDescription>This app was installed from elsewhere. Clone its repo into the workspace's apps folder to work on it here.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function Problems({ problems }: { problems: string[] }): React.ReactElement | null {
  if (!problems.length) return null;
  return (
    <Card title="Manifest Problems" description="Fix these in supergrid.app.json; the app will not install until the manifest is valid." className="border-warning/40">
      <ul className="flex flex-col gap-1 text-sm">
        {problems.map((p) => (
          <li key={p} className="flex items-start gap-2"><TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0 text-warning-foreground" />{p}</li>
        ))}
      </ul>
    </Card>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-baseline gap-4 py-1.5 text-sm">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </div>
  );
}

function Overview({ ws, appId, installed, folder }: { ws: WorkspaceSummary; appId: string; installed: InstalledApp | null; folder: LocalApp | null }): React.ReactElement {
  const served = useServedManifest(installed ? ws.id : null, installed ? appId : null);
  const packages = usePackages(ws.id);
  const m = folder?.manifest;
  const site = ws.url.replace(/\/$/, "");
  const mount = installed?.public ?? m?.public?.mount ?? null;
  const navItems = (m?.admin?.nav ?? installed?.nav ?? []).flatMap((n) => [n, ...(n.children ?? []).map((c) => ({ ...c, label: `${n.label} › ${c.label}` }))]);
  const entities = served.data?.entities ?? (m?.data ? Object.entries(m.data).map(([key, e]) => ({ key, label: e.label, table: e.table ?? `app_${appId.replace(/-/g, "_")}_${key}`, columns: Object.entries(e.fields).map(([k, f]) => ({ key: k, type: f.type, label: f.label ?? k, required: !!f.required })) })) : []);
  const exportsHere = packages.data?.exports.filter((e) => e.app === appId) ?? [];
  const usesHere = packages.data?.uses.filter((u) => u.app === appId) ?? [];
  const consumers = packages.data?.uses.filter((u) => u.from === appId) ?? [];
  return (
    <>
      {folder && <Problems problems={folder.problems} />}
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Where It Lives">
          <Fact label="Public">{mount ? <button type="button" className="cursor-pointer font-mono text-[13px] hover:underline" onClick={() => openExternal(`${site}${mount === "/" ? "" : mount}`)}>{mount}</button> : <span className="text-muted-foreground">Admin only</span>}</Fact>
          <Fact label="Admin"><span className="font-mono text-[13px]">/admin/{appId}</span></Fact>
          <Fact label="API"><span className="font-mono text-[13px]">{(m?.api ?? installed?.api) ? `/api/${appId}/*` : "none"}</span></Fact>
          <Fact label="Operations"><span className="font-mono text-[13px]">{(m?.operations ?? installed?.operations) ? `/api/${appId}/ops · /api/${appId}/mcp` : "none"}</span></Fact>
          <Fact label="Worker"><span className="font-mono text-[13px]">{installed ? `${ws.worker.replace(/-ws-/, "-app-")}-${appId}` : "not deployed"}</span></Fact>
          {folder && <Fact label="Folder"><span className="font-mono text-[12px] break-all">{folder.dir}</span></Fact>}
        </Card>
        <Card title="Admin Menu" description="From admin.nav in the manifest; the shell draws it beside the rail.">
          {navItems.length ? (
            <ul className="flex flex-col">
              {navItems.map((n) => (
                <li key={`${n.path}${n.label}`} className="flex h-8 items-center gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">{n.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">/admin/{appId}{n.path === "/" ? "" : n.path}</span>
                  {n.place === "settings" && <Badge size="sm" variant="outline">settings</Badge>}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No admin screens.</p>}
        </Card>
      </div>
      <Card title="Data" description={served.data ? "As the running app serves it (/_app/<id>/manifest.json)." : "As the manifest declares it; the running app will confirm the columns once installed."} padded={false}>
        {entities.length ? (
          <div className="divide-y">
            {entities.map((e) => (
              <div key={e.key} className="px-4 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{e.label}</span>
                  <button type="button" className="cursor-pointer font-mono text-xs text-muted-foreground hover:underline" onClick={() => (window.location.hash = `#/w/${ws.id}/database/${e.table}`)}>{e.table}</button>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {e.columns.map((c) => (
                    <span key={c.key} className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px]">
                      {c.key}<span className="text-muted-foreground">{c.type}{c.required ? "!" : ""}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="px-4 py-6 text-center text-sm text-muted-foreground">No entities declared. Add them under <code>data</code> in the manifest.</p>}
      </Card>
      {installed && (
        <Card title="Operations" description={served.error ? served.error : "What the agent, REST and MCP clients can call."} padded={false} actions={<IconButton label="Read Again" onClick={() => refreshServedManifest(ws.id, appId)}><RefreshCwIcon /></IconButton>}>
          {served.data?.operations.length ? (
            <ul className="divide-y">
              {served.data.operations.map((o) => (
                <li key={o.name} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                  <span className="w-44 shrink-0 font-mono text-[13px]">{o.name}</span>
                  <span className="min-w-0 flex-1 text-muted-foreground">{o.description}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{Array.isArray(o.access) ? o.access.join(", ") : o.access}</span>
                  {o.confirm && <Badge size="sm" variant="warning">confirm</Badge>}
                </li>
              ))}
            </ul>
          ) : <p className="px-4 py-6 text-center text-sm text-muted-foreground">{served.loading && !served.data ? "Reading…" : "No operations."}</p>}
        </Card>
      )}
      <Card title="Shared Packages" description="What this app exports for other apps, and what it uses (manifest packages).">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Exports</div>
            {exportsHere.length ? exportsHere.map((e) => <div key={e.name} className="text-sm"><span className="font-mono text-[13px]">{e.name}</span> <span className="text-muted-foreground">{e.version} · {e.path}</span></div>) : <p className="text-sm text-muted-foreground">None</p>}
            {consumers.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Used by {consumers.map((c) => c.app).join(", ")}{consumers.some((c) => c.stale) ? " (some behind)" : ""}</p>}
          </div>
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Uses</div>
            {usesHere.length ? usesHere.map((u) => <div key={u.name} className="flex items-center gap-2 text-sm"><span className="font-mono text-[13px]">{u.name}</span><span className="text-muted-foreground">{u.from ? `from ${u.from}` : "not an installed app"}</span>{u.stale && <Badge size="sm" variant="warning">behind</Badge>}</div>) : <p className="text-sm text-muted-foreground">None</p>}
          </div>
        </div>
      </Card>
    </>
  );
}

function Files({ ws, appId }: { ws: WorkspaceSummary; appId: string }): React.ReactElement {
  const [dir, setDir] = React.useState("");
  const [entries, setEntries] = React.useState<FileEntry[] | null>(null);
  const [file, setFile] = React.useState<{ path: string; text: string; size: number; truncated: boolean } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    let live = true;
    setEntries(null);
    void sg?.apps.files(ws.id, appId, dir).then((e) => { if (live) setEntries(e); }, (e) => { if (live) setError(clean(e)); });
    return () => { live = false; };
  }, [ws.id, appId, dir]);
  const open = (e: FileEntry) => {
    if (e.kind === "dir") { setDir(e.path); setFile(null); return; }
    void sg?.apps.read(ws.id, appId, e.path).then((r) => setFile({ path: e.path, ...r }), (err) => setError(clean(err)));
  };
  const crumbs = dir ? dir.split("/") : [];
  return (
    <div className="grid min-h-[28rem] gap-4 md:grid-cols-[18rem_1fr]">
      <Card padded={false} title={
        <span className="flex items-center gap-1 font-mono text-xs font-normal">
          <button type="button" className="cursor-pointer hover:underline" onClick={() => setDir("")}>{appId}</button>
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              <ChevronRightIcon className="size-3 text-muted-foreground" />
              <button type="button" className="cursor-pointer hover:underline" onClick={() => setDir(crumbs.slice(0, i + 1).join("/"))}>{c}</button>
            </React.Fragment>
          ))}
        </span>
      }>
        {error && <p className="px-4 py-3 text-sm text-destructive-foreground">{error}</p>}
        <ul className="flex flex-col py-1">
          {entries?.map((e) => (
            <li key={e.path}>
              <button type="button" onClick={() => open(e)} className={cn("flex h-8 w-full cursor-pointer items-center gap-2 px-4 text-left text-[13px] hover:bg-accent", file?.path === e.path && "bg-accent")}>
                {e.kind === "dir" ? <FolderIcon className="size-3.5 text-muted-foreground" /> : <FileIcon className="size-3.5 text-muted-foreground" />}
                <span className="min-w-0 flex-1 truncate">{e.name}</span>
                {e.size !== undefined && <span className="text-[11px] text-muted-foreground">{formatBytes(e.size)}</span>}
              </button>
            </li>
          ))}
          {entries && entries.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">Empty</li>}
        </ul>
      </Card>
      <Card padded={false} title={file ? <span className="font-mono text-xs font-normal">{file.path}{file.truncated ? " (first 200 KB)" : ""}</span> : "Pick a file"}>
        {file ? <pre className="max-h-[70vh] overflow-auto px-4 py-3 font-mono text-[12px] leading-5 whitespace-pre">{file.text}</pre> : <p className="px-4 py-8 text-center text-sm text-muted-foreground">The folder on the left is the app's repo. GUIDE.md says what is where.</p>}
      </Card>
    </div>
  );
}

function Server({ ws, appId }: { ws: WorkspaceSummary; appId: string }): React.ReactElement {
  const [status, setStatus] = React.useState<DevServerStatus>({ running: false });
  const [log, setLog] = React.useState<DevLogLine[]>([]);
  const [busy, setBusy] = React.useState(false);
  const end = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    void sg?.apps.devStatus(ws.id, appId).then(setStatus);
    void sg?.apps.devLog(ws.id, appId).then(setLog);
    return sg?.apps.onDevLog((l) => { if (l.wsId === ws.id && l.app === appId) setLog((prev) => [...prev.slice(-499), l]); if (l.stream === "sys" && /exited/.test(l.line)) setStatus({ running: false }); });
  }, [ws.id, appId]);
  React.useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [log.length]);
  const start = async () => { setBusy(true); try { setStatus(await sg!.apps.devStart(ws.id, appId)); } catch (e) { toastManager.add({ title: "Could Not Start", description: clean(e), type: "error" }); } finally { setBusy(false); } };
  const stop = async () => { setBusy(true); try { setStatus(await sg!.apps.devStop(ws.id, appId)); } finally { setBusy(false); } };
  return (
    <>
      <Card title="Dev Server" description="react-router dev, composed with the local workspace Worker so the app runs against a workspace on this Mac.">
        <div className="flex flex-wrap items-center gap-2">
          {status.running ? (
            <>
              <Badge variant="success" size="sm">Running on {status.port}</Badge>
              <Button size="sm" variant="outline" onClick={() => openExternal(`${status.url}/admin/${appId}`)}><ExternalLinkIcon />Open Admin</Button>
              <Button size="sm" variant="outline" onClick={() => openExternal(`${status.url}/_app/${appId}/manifest.json`)}><ExternalLinkIcon />Served Manifest</Button>
              <span className="flex-1" />
              <Button size="sm" variant="destructive-outline" disabled={busy} onClick={() => void stop()}><SquareIcon />Stop</Button>
            </>
          ) : (
            <>
              <Badge variant="secondary" size="sm">Stopped</Badge>
              <span className="flex-1" />
              <Button size="sm" disabled={busy} onClick={() => void start()}>{busy ? <LoaderCircleIcon className="animate-spin" /> : <PlayIcon />}Start</Button>
            </>
          )}
        </div>
      </Card>
      <Card title="Log" padded={false}>
        <div className="max-h-[50vh] min-h-40 overflow-auto px-4 py-3 font-mono text-[12px] leading-5">
          {log.length === 0 && <span className="text-muted-foreground">Nothing yet.</span>}
          {log.map((l, i) => (
            <div key={i} className={cn("whitespace-pre-wrap", l.stream === "err" && "text-destructive-foreground", l.stream === "sys" && "text-muted-foreground")}>{l.line}</div>
          ))}
          <div ref={end} />
        </div>
      </Card>
    </>
  );
}

function Git({ ws, appId }: { ws: WorkspaceSummary; appId: string }): React.ReactElement {
  const [git, setGit] = React.useState<GitStatus | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const load = React.useCallback(() => { void sg?.apps.git(ws.id, appId).then(setGit, (e) => setError(clean(e))); }, [ws.id, appId]);
  React.useEffect(load, [load]);
  if (error) return <p className="text-sm text-destructive-foreground">{error}</p>;
  if (!git) return <div className="py-8 text-center text-muted-foreground"><LoaderCircleIcon className="inline size-5 animate-spin" /></div>;
  if (!git.branch) return (
    <Empty className="py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon"><GitBranchIcon /></EmptyMedia>
        <EmptyTitle>Not a Git Repo</EmptyTitle>
        <EmptyDescription>The folder has no .git, or git is not installed on this Mac. Apps made here start with one commit.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
  return (
    <>
      <Card title="Repo" actions={<IconButton label="Read Again" onClick={load}><RefreshCwIcon /></IconButton>}>
        <Fact label="Branch"><span className="font-mono text-[13px]">{git.branch}</span></Fact>
        <Fact label="Changes">{git.changed ? <Badge size="sm" variant="warning">{git.changed} uncommitted</Badge> : <span className="text-muted-foreground">Clean</span>}</Fact>
        <Fact label="Remote">{git.remote ? <span className="font-mono text-[12px] break-all">{git.remote}{git.ahead || git.behind ? ` · ${git.ahead} ahead, ${git.behind} behind` : ""}</span> : <span className="text-muted-foreground">None. Pushing to the workspace's Artifacts repo comes with the deploy flow.</span>}</Fact>
      </Card>
      <Card title="History" padded={false}>
        <ul className="divide-y">
          {git.commits.map((c) => (
            <li key={c.hash} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{c.short}</span>
              <span className="min-w-0 flex-1 truncate">{c.message}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{c.author} · {relative(c.date)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

const STEPS: { key: AppDeployProgress["step"]; label: string }[] = [
  { key: "build", label: "Build the app (pnpm build)" },
  { key: "upload", label: "Upload the Worker" },
  { key: "route", label: "Point the workspace at it" },
  { key: "done", label: "Done" },
];

function Deploy({ ws, appId, installed, folder }: { ws: WorkspaceSummary; appId: string; installed: InstalledApp | null; folder: LocalApp | null }): React.ReactElement {
  const { org } = useSession();
  const navigate = useNavigate();
  const [progress, setProgress] = React.useState<AppDeployProgress | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  React.useEffect(() => sg?.apps.onDeploy((p) => { if (p.wsId === ws.id && p.app === appId) setProgress(p); }), [ws.id, appId]);
  const refresh = async () => { if (org?.cloudflare) await refreshWorkspaces(org.cloudflare); refreshLocalApps(ws.id); refreshServedManifest(ws.id, appId); };
  const install = async () => {
    setBusy(true);
    setProgress({ wsId: ws.id, app: appId, step: "build" });
    try {
      const app = await sg!.apps.install(ws.id, appId);
      toastManager.add({ title: `${app.name} ${installed ? "Deployed" : "Installed"}`, description: app.public ? `Public at ${app.public}` : "Admin only", type: "success" });
      await refresh();
    } catch (e) {
      toastManager.add({ title: installed ? "Deploy Failed" : "Install Failed", description: clean(e), type: "error" });
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await sg!.apps.uninstall(ws.id, appId);
      toastManager.add({ title: "App Uninstalled", description: "Its Worker is gone; its tables stay until you drop them.", type: "success" });
      await refresh();
      navigate(`/w/${ws.id}/apps/${appId}/_dev`);
    } catch (e) {
      toastManager.add({ title: "Uninstall Failed", description: clean(e), type: "error" });
    } finally {
      setBusy(false);
    }
  };
  const blocked = !folder ? "There is no folder for this app on this Mac." : folder.problems.length ? "Fix the manifest problems first." : !ws.worker ? "The local dev workspace runs apps from their folders; install into a cloud workspace." : null;
  const stepIndex = progress ? STEPS.findIndex((s) => s.key === progress.step) : -1;
  return (
    <>
      <Card title={installed ? "Deploy" : "Install"} description={installed ? "Builds the folder and replaces the app's Worker in the workspace. The workspace keeps routing to it; migrations run on the first request." : "Builds the folder, creates the app's Worker in the account and points the workspace at it under the manifest's mount."}>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" disabled={busy || !!blocked} onClick={() => void install()}>
            {busy ? <LoaderCircleIcon className="animate-spin" /> : <RocketIcon />}
            {installed ? "Build & Deploy" : "Build & Install"}
          </Button>
          {blocked && <span className="text-sm text-muted-foreground">{blocked}</span>}
        </div>
        {progress && (
          <ol className="mt-4 flex flex-col gap-1.5">
            {STEPS.map((s, i) => {
              const state = progress.error ? (i < stepIndex ? "done" : i === stepIndex ? "error" : "todo") : i < stepIndex || progress.step === "done" ? "done" : i === stepIndex ? "now" : "todo";
              return (
                <li key={s.key} className={cn("flex items-center gap-2 text-sm", state === "todo" && "text-muted-foreground")}>
                  <span className={cn("flex size-4 items-center justify-center rounded-full border text-[10px]", state === "done" && "border-success bg-success text-white", state === "now" && "border-active", state === "error" && "border-destructive bg-destructive text-white")}>{state === "done" ? "✓" : state === "now" ? <LoaderCircleIcon className="size-2.5 animate-spin" /> : state === "error" ? "!" : ""}</span>
                  {s.label}
                  {i === stepIndex && progress.detail && <span className="text-xs text-muted-foreground">{progress.detail}</span>}
                </li>
              );
            })}
            {progress.error && <li className="whitespace-pre-wrap rounded-lg bg-destructive/8 px-3 py-2 font-mono text-[12px] text-destructive-foreground">{progress.error}</li>}
          </ol>
        )}
      </Card>
      {installed && (
        <Card title="Uninstall" description="Takes the app out of the workspace's routes and deletes its Worker. The folder here and the app's tables stay.">
          <Button size="sm" variant="destructive-outline" disabled={busy} onClick={() => setConfirmRemove(true)}>Uninstall {installed.name}</Button>
          <ConfirmDialog open={confirmRemove} onOpenChange={setConfirmRemove} title={`Uninstall ${installed.name}?`} description="Its public pages and admin screens go away at once. Its tables stay in the database until you drop them." confirmLabel="Uninstall" onConfirm={() => void remove()} />
        </Card>
      )}
    </>
  );
}
