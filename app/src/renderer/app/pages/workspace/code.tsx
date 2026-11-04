import { ChevronRightIcon, ExternalLinkIcon, FileIcon, FolderIcon, FolderOpenIcon, GitBranchIcon, LoaderCircleIcon, PlayIcon, RefreshCwIcon, RocketIcon, SquareIcon } from "lucide-react";
import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import type { DeployProgress, DeployVersion, DevLogLine, DevServerStatus, FileEntry, GitStatus } from "../../../../shared/bridge";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { SegmentedControl, SegmentedControlItem } from "~/components/ui/segmented-control";
import { toastManager } from "~/components/ui/toast";
import { Card, IconButton, WorkspaceFrame } from "~/components/workspace/frame";
import { formatBytes, openExternal, relative } from "~/components/workspace/library/shared";
import { refreshLocalApps, useLocalApps } from "~/lib/apps";
import { sg } from "~/lib/bridge";
import { useMode } from "~/lib/mode";
import { useSession } from "~/lib/session";
import { cn } from "~/lib/utils";
import { clean, refreshWorkspaces, type WorkspaceSummary } from "~/lib/workspaces";
import { useOpenNav, useShell } from "~/shell/context";
import { codeSection } from "~/shell/sections";

// The Code section (WORKSPACE-REPO.md §9): the workspace's repo on this Mac, one git repo and one pnpm workspace with
// every app a folder under apps/. Files browses it (filtered to an app with ?app=<id>), Git reads it, Server is the one
// dev server that serves the whole workspace in Dev mode, and Deploys builds the repo and uploads it as the workspace
// Worker. Everything runs through the main process (src/main/apps.ts).

export function Code(): React.ReactElement {
  const { ws } = useShell();
  const params = useParams();
  const page = (params["*"] ?? "").split("/")[0] || "files";
  const item = codeSection.items!.find((i) => i.path === page) ?? codeSection.items![0]!;
  const Icon = item.icon;
  const onOpenNav = useOpenNav();
  return (
    <WorkspaceFrame
      icon={<Icon />}
      title={`Code · ${item.label}`}
      width={page === "files" ? "wide" : "default"}
      onOpenNav={onOpenNav}
      actions={<IconButton label="Reveal in Finder" onClick={() => void sg?.apps.reveal(ws.id)}><FolderOpenIcon /></IconButton>}
    >
      {page === "files" && <Files ws={ws} />}
      {page === "git" && <Git ws={ws} />}
      {page === "server" && <Server ws={ws} />}
      {page === "deploys" && <Deploys ws={ws} />}
    </WorkspaceFrame>
  );
}

// ---- Files: the repo's tree, starting in an app's folder when one is picked ----

function Files({ ws }: { ws: WorkspaceSummary }): React.ReactElement {
  const [params, setParams] = useSearchParams();
  const app = params.get("app") ?? "";
  const local = useLocalApps(ws.id);
  const root = app ? `apps/${app}` : "";
  const [dir, setDir] = React.useState(root);
  const [entries, setEntries] = React.useState<FileEntry[] | null>(null);
  const [file, setFile] = React.useState<{ path: string; text: string; size: number; truncated: boolean } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  // the filter moves the tree to the app's folder; the tree stays inside it until the filter changes
  React.useEffect(() => { setDir(root); setFile(null); }, [root]);
  React.useEffect(() => {
    let live = true;
    setEntries(null);
    setError(null);
    void sg?.apps.files(ws.id, dir).then((e) => { if (live) setEntries(e); }, (e) => { if (live) setError(clean(e)); });
    return () => { live = false; };
  }, [ws.id, dir]);
  const open = (e: FileEntry) => {
    if (e.kind === "dir") { setDir(e.path); setFile(null); return; }
    void sg?.apps.read(ws.id, e.path).then((r) => setFile({ path: e.path, ...r }), (err) => setError(clean(err)));
  };
  const pick = (id: string) => setParams((p) => { if (id) p.set("app", id); else p.delete("app"); return p; });
  const inside = dir.startsWith(root) ? dir.slice(root.length).replace(/^\//, "") : dir;
  const crumbs = inside ? inside.split("/") : [];
  const apps = local.data ?? [];
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl size="sm" aria-label="Filter by app">
          <SegmentedControlItem aria-pressed={!app} data-pressed={!app || undefined} onClick={() => pick("")}>Workspace</SegmentedControlItem>
          {apps.map((a) => (
            <SegmentedControlItem key={a.manifest.id} aria-pressed={app === a.manifest.id} data-pressed={app === a.manifest.id || undefined} onClick={() => pick(a.manifest.id)}>{a.manifest.name}</SegmentedControlItem>
          ))}
        </SegmentedControl>
        <span className="flex-1" />
        <Button size="xs" variant="ghost" onClick={() => void sg?.apps.reveal(ws.id, dir || undefined)}><FolderOpenIcon />Reveal</Button>
      </div>
      <div className="grid min-h-[28rem] gap-4 md:grid-cols-[18rem_1fr]">
        <Card padded={false} title={
          <span className="flex items-center gap-1 font-mono text-xs font-normal">
            <button type="button" className="cursor-pointer hover:underline" onClick={() => { setDir(root); setFile(null); }}>{app ? `apps/${app}` : "workspace"}</button>
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                <ChevronRightIcon className="size-3 text-muted-foreground" />
                <button type="button" className="cursor-pointer hover:underline" onClick={() => { setDir([root, ...crumbs.slice(0, i + 1)].filter(Boolean).join("/")); setFile(null); }}>{c}</button>
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
            {!entries && !error && <li className="px-4 py-3 text-sm text-muted-foreground">Reading…</li>}
          </ul>
        </Card>
        <Card padded={false} title={file ? <span className="font-mono text-xs font-normal">{file.path}{file.truncated ? " (first 200 KB)" : ""}</span> : "Pick a File"}>
          {file ? <pre className="max-h-[70vh] overflow-auto px-4 py-3 font-mono text-[12px] leading-5 whitespace-pre">{file.text}</pre> : <p className="px-4 py-8 text-center text-sm text-muted-foreground">{app ? "An app's folder: its manifest, routes, screens, migrations and operations. GUIDE.md says what is where." : "The workspace repo: apps/ holds each app, app/ the shared kit and admin layer, .sg/ what the build generates from the manifests."}</p>}
        </Card>
      </div>
    </>
  );
}

// ---- Git: the repo's branch, changes and history ----

function Fact({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-baseline gap-4 py-1.5 text-sm">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </div>
  );
}

function Git({ ws }: { ws: WorkspaceSummary }): React.ReactElement {
  const [git, setGit] = React.useState<GitStatus | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const load = React.useCallback(() => { void sg?.apps.git(ws.id).then(setGit, (e) => setError(clean(e))); }, [ws.id]);
  React.useEffect(load, [load]);
  if (error) return <p className="text-sm text-destructive-foreground">{error}</p>;
  if (!git) return <div className="py-8 text-center text-muted-foreground"><LoaderCircleIcon className="inline size-5 animate-spin" /></div>;
  if (!git.branch) return (
    <Empty className="py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon"><GitBranchIcon /></EmptyMedia>
        <EmptyTitle>Not a Git Repo</EmptyTitle>
        <EmptyDescription>The folder has no .git, or git is not installed on this Mac. Repos made here start with one commit.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
  return (
    <>
      <Card title="Repo" actions={<IconButton label="Read Again" onClick={load}><RefreshCwIcon /></IconButton>}>
        <Fact label="Branch"><span className="font-mono text-[13px]">{git.branch}</span></Fact>
        <Fact label="Changes">{git.changed ? <Badge size="sm" variant="warning">{git.changed} uncommitted</Badge> : <span className="text-muted-foreground">Clean</span>}</Fact>
        <Fact label="Remote">{git.remote ? <span className="font-mono text-[12px] break-all">{git.remote}{git.ahead || git.behind ? ` · ${git.ahead} ahead, ${git.behind} behind` : ""}</span> : <span className="text-muted-foreground">None. The repo lives on this Mac; a deploy is what the workspace runs.</span>}</Fact>
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

// ---- Server: the one dev server, in Dev mode ----

function Server({ ws }: { ws: WorkspaceSummary }): React.ReactElement {
  const mode = useMode(ws.id);
  const [status, setStatus] = React.useState<DevServerStatus>({ running: false });
  const [log, setLog] = React.useState<DevLogLine[]>([]);
  const end = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    void sg?.apps.devStatus(ws.id).then(setStatus);
    void sg?.apps.devLog(ws.id).then(setLog);
    return sg?.apps.onDevLog((l) => {
      if (l.wsId !== ws.id) return;
      setLog((prev) => [...prev.slice(-499), l]);
      if (l.stream === "sys") void sg?.apps.devStatus(ws.id).then(setStatus);
    });
  }, [ws.id, mode.mode]);
  React.useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [log.length]);
  const open = async (path: string) => {
    const [app, ...rest] = path.split("/");
    try { openExternal(await sg!.ws.adminUrl(ws.id, app!, `/${rest.join("/")}`)); } catch (e) { toastManager.add({ title: "Could Not Open", description: clean(e), type: "error" }); }
  };
  const switchTo = async (to: "live" | "dev") => { try { await mode.setMode(to); } catch (e) { toastManager.add({ title: to === "dev" ? "Dev Did Not Start" : "Could Not Stop", description: clean(e), type: "error" }); } };
  const admins = ws.dev ? ws.apps.filter((a) => a.admin) : [];
  return (
    <>
      <Card title="Dev Server" description="react-router dev in the workspace repo: every app, the workspace's own endpoints and a local database, on one port. Dev mode starts it and serves the screens from it; Live stops it.">
        <div className="flex flex-wrap items-center gap-2">
          {status.running ? (
            <>
              <Badge variant={status.ready ? "success" : "warning"} size="sm">{status.ready ? `Running on ${status.port}` : `Starting on ${status.port}`}</Badge>
              <Button size="sm" variant="outline" onClick={() => openExternal(status.url!)}><ExternalLinkIcon />{status.url!.replace(/^https?:\/\//, "")}</Button>
              <span className="flex-1" />
              <Button size="sm" variant="destructive-outline" disabled={mode.switching} onClick={() => void switchTo("live")}><SquareIcon />Stop and Go Live</Button>
            </>
          ) : (
            <>
              <Badge variant="secondary" size="sm">Stopped</Badge>
              <span className="text-sm text-muted-foreground">The workspace is served from its deployed Worker.</span>
              <span className="flex-1" />
              <Button size="sm" disabled={mode.switching} onClick={() => void switchTo("dev")}>{mode.switching ? <LoaderCircleIcon className="animate-spin" /> : <PlayIcon />}Start and Switch to Dev</Button>
            </>
          )}
        </div>
        {admins.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {admins.map((a) => (
              <Button key={a.app} size="xs" variant="outline" onClick={() => void open(a.app)}><ExternalLinkIcon />{a.name} Admin</Button>
            ))}
            {ws.dev && ws.apps.filter((a) => a.operations).map((a) => (
              <Button key={`${a.app}-m`} size="xs" variant="ghost" onClick={() => openExternal(`${ws.url}/_app/${a.app}/manifest.json`)}><ExternalLinkIcon />{a.name} Manifest</Button>
            ))}
          </div>
        )}
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

// ---- Deploys: the repo built and uploaded as the Worker, and the versions it has had ----

const STEPS: { key: DeployProgress["step"]; label: string }[] = [
  { key: "generate", label: "Generate the route tree and the registry from the manifests" },
  { key: "build", label: "Build the workspace (react-router build)" },
  { key: "upload", label: "Upload the Worker and wait for it to answer" },
  { key: "done", label: "Done" },
];

function Deploys({ ws }: { ws: WorkspaceSummary }): React.ReactElement {
  const { org } = useSession();
  const navigate = useNavigate();
  const local = useLocalApps(ws.id);
  const [progress, setProgress] = React.useState<DeployProgress | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [versions, setVersions] = React.useState<DeployVersion[] | null>(null);
  const [versionsError, setVersionsError] = React.useState<string | null>(null);
  const loadVersions = React.useCallback(() => { setVersionsError(null); void sg?.apps.deploys(ws.id).then(setVersions, (e) => setVersionsError(clean(e))); }, [ws.id]);
  React.useEffect(loadVersions, [loadVersions]);
  React.useEffect(() => sg?.apps.onDeploy((p) => { if (p.wsId === ws.id) setProgress(p); }), [ws.id]);
  const apps = (local.data ?? []).filter((a) => !a.disabled);
  const problems = apps.filter((a) => a.problems.length);
  const deploy = async () => {
    setBusy(true);
    setProgress({ wsId: ws.id, step: "generate" });
    try {
      const { version } = await sg!.apps.deploy(ws.id);
      toastManager.add({ title: `Deployed ${version}`, description: apps.length ? `${apps.map((a) => a.manifest.name).join(", ")} ${apps.length === 1 ? "is" : "are"} live.` : "The workspace is live with no apps.", type: "success" });
      if (org) await refreshWorkspaces(org);
      refreshLocalApps(ws.id);
      loadVersions();
    } catch (e) {
      toastManager.add({ title: "Deploy Failed", description: clean(e), type: "error" });
    } finally {
      setBusy(false);
    }
  };
  const blocked = problems.length ? `Fix the manifest of ${problems.map((a) => a.manifest.id).join(", ")} first.` : null;
  const stepIndex = progress ? STEPS.findIndex((s) => s.key === progress.step) : -1;
  return (
    <>
      <Card title="Deploy" description="Builds the repo and replaces the workspace Worker with it, every app included, as one version. The database, queues and bucket stay; a version that never answers is rolled back.">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" disabled={busy || !!blocked} onClick={() => void deploy()}>
            {busy ? <LoaderCircleIcon className="animate-spin" /> : <RocketIcon />}
            Build & Deploy
          </Button>
          <span className="text-sm text-muted-foreground">
            {blocked ?? (apps.length ? `${apps.map((a) => `${a.manifest.name} ${a.manifest.version}`).join(", ")}` : "No apps in the repo yet; the workspace deploys on its own.")}
          </span>
          {ws.dev && <Badge size="sm" variant="info">Dev: Live serves the deployed version</Badge>}
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
      <Card title="Versions" description="What the Worker has run, newest first, as Cloudflare keeps them." padded={false} actions={<IconButton label="Read Again" onClick={loadVersions}><RefreshCwIcon /></IconButton>}>
        {versionsError ? (
          <p className="px-4 py-3 text-sm text-destructive-foreground">{versionsError}</p>
        ) : !versions ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Reading…</p>
        ) : versions.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">No versions yet.</p>
        ) : (
          <ul className="divide-y">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">#{v.number}</span>
                <span className="min-w-0 flex-1 truncate">{v.message ?? <span className="text-muted-foreground">No message</span>}</span>
                {v.active && <Badge size="sm" variant="success">Live</Badge>}
                <span className="shrink-0 text-xs text-muted-foreground">{v.createdAt ? relative(v.createdAt) : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {!ws.dev && (
        <p className="text-sm text-muted-foreground">
          To see the repo's screens before they are deployed, switch to Dev. <button type="button" className="cursor-pointer underline underline-offset-4" onClick={() => navigate(`/w/${ws.id}/code/server`)}>The Server page</button> starts it too.
        </p>
      )}
    </>
  );
}
