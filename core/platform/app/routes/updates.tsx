// What is running against what the release feed offers, part by part. Each part updates on its own.
import { ArrowUpCircleIcon, CheckCircle2Icon, CircleAlertIcon, RefreshCwIcon } from "lucide-react";
import * as React from "react";
import { Link, useFetcher, useLoaderData, useRevalidator } from "react-router";
import { PageFrame } from "~/components/page-frame";
import { PageHeader, Section } from "~/components/page-header";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { toastManager } from "~/components/ui/toast";
import { cachedReleases, checkReleases, isConnected, isNewer } from "../../src/cloud";
import { platformContext, requireActor } from "../../src/context";
import { listAllInstalls, listUpdateLog, listWorkspaces } from "../../src/db";
import { blockedBy } from "../../src/flows";
import { errorMessage } from "../ui";
import type { action as runAction } from "./run";
import type { Route } from "./+types/updates";

export async function loader({ context }: Route.LoaderArgs) {
  const p = requireActor(context.get(platformContext));
  if (!p.actor.operator) throw new Response("Operators only", { status: 403 });
  let latest = await cachedReleases(p.env);
  let feedError: string | null = null;
  if (!latest) latest = await checkReleases(p.env).catch((e) => { feedError = errorMessage(e); return null; });
  const [workspaces, installs, log] = await Promise.all([listWorkspaces(p.env), listAllInstalls(p.env), listUpdateLog(p.env, 12)]);
  const wsLatest = latest?.workspace ?? null;
  const managed = workspaces.filter((w) => w.worker);
  return {
    connected: await isConnected(p.env), feedError, checkedAt: latest?.checkedAt ?? null,
    platform: {
      current: p.env.SG_VERSION, latest: latest?.platform?.version ?? null, notes: latest?.platform?.notes ?? "",
      available: !!latest?.platform && isNewer(latest.platform.version, p.env.SG_VERSION),
      blocked: blockedBy(latest?.platform?.requires?.workspace, managed),
    },
    workspaceLatest: wsLatest?.version ?? null,
    workspaces: managed.map((w) => ({ id: w.id, name: w.name, version: w.version, worker: w.worker, available: !!wsLatest && isNewer(wsLatest.version, w.version) })),
    apps: installs.flatMap((i) => {
      const ws = workspaces.find((w) => w.id === i.workspace_id);
      if (!ws) return [];
      const rel = latest?.apps[i.app_id];
      return [{ key: `${i.workspace_id}/${i.app_id}`, workspace: ws.id, workspaceName: ws.name, app: i.app_id, name: i.name, version: i.version, repo: i.repo, status: i.status, latest: rel?.version ?? null, available: !!rel && isNewer(rel.version, i.version), blocked: blockedBy(rel?.requires?.workspace, [ws]) }];
    }),
    log,
  };
}

function Row({ title, sub, version, latest, children }: { title: React.ReactNode; sub?: React.ReactNode; version: string | null; latest?: string | null; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        {sub && <div className="truncate text-xs text-muted-foreground">{sub}</div>}
      </div>
      <span className="font-mono text-xs text-muted-foreground">{version ?? "unknown"}{latest ? ` → ${latest}` : ""}</span>
      {children}
    </div>
  );
}

const UpToDate = () => <span className="flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle2Icon className="size-3.5 text-success" />Up to date</span>;

export default function Updates() {
  const d = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof runAction>();
  const revalidator = useRevalidator();
  const [busy, setBusy] = React.useState<string | null>(null);
  const queue = React.useRef<Record<string, string>[]>([]);

  const next = React.useCallback(() => {
    const job = queue.current.shift();
    if (!job) { setBusy(null); return; }
    setBusy(job.key!);
    const { key: _key, ...fields } = job;
    fetcher.submit(fields, { method: "post", action: "/run" });
  }, [fetcher]);

  React.useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data || !busy) return;
    const r = fetcher.data as { ok: boolean; error?: string; outcome?: string };
    if (!r.ok) { queue.current = []; toastManager.add({ title: "Stopped", description: r.error, type: "error" }); setBusy(null); revalidator.revalidate(); return; }
    if (r.outcome === "conflict") toastManager.add({ title: "Needs attention", description: "Your changes conflict with this update. Nothing was deployed.", type: "warning" });
    if (r.outcome === "merged") toastManager.add({ title: "Merged", description: "Your changes and the update are merged in the repo. It needs a build to go live.", type: "info" });
    if (queue.current.length) next(); else { setBusy(null); revalidator.revalidate(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  const start = (jobs: Record<string, string>[]) => { queue.current = [...jobs]; next(); };
  const behind = d.workspaces.filter((w) => w.available);
  const disabled = !!busy || !d.connected;

  return (
    <PageFrame crumbs={[{ label: "Platform settings", to: "/settings" }, { label: "Updates" }]}>
      <PageHeader
        title="Updates"
        description="The platform, workspaces and apps each have their own version. Nothing updates until you say so."
        actions={<Button variant="outline" size="sm" disabled={!!busy} loading={busy === "check"} onClick={() => start([{ key: "check", intent: "check" }])}><RefreshCwIcon />Check now</Button>}
        meta={d.checkedAt ? <span className="text-xs text-muted-foreground">Last checked {new Date(d.checkedAt).toLocaleString()}</span> : undefined}
      />
      {d.feedError && <Alert variant="error"><CircleAlertIcon /><AlertDescription>{d.feedError}</AlertDescription></Alert>}
      {!d.connected && <Alert variant="warning"><CircleAlertIcon /><AlertDescription><span>Connect <Link to="/connect" className="underline underline-offset-4">your Cloudflare account</Link> to run updates.</span></AlertDescription></Alert>}

      <Section title="Platform">
        <div className="overflow-hidden rounded-2xl border bg-background">
          <Row title="SuperGrid platform" sub={d.platform.blocked ?? (d.platform.available ? d.platform.notes : undefined)} version={d.platform.current} latest={d.platform.available ? d.platform.latest : null}>
            {d.platform.available
              ? <Button size="sm" disabled={disabled || !!d.platform.blocked} loading={busy === "platform"} onClick={() => start([{ key: "platform", intent: "platform" }])}><ArrowUpCircleIcon />Update</Button>
              : <UpToDate />}
          </Row>
        </div>
      </Section>

      <Section
        title="Workspaces"
        description={d.workspaceLatest ? `Latest release: ${d.workspaceLatest}. They update one at a time and stop at the first failure.` : undefined}
        actions={behind.length > 1 ? <Button size="sm" variant="outline" disabled={disabled} onClick={() => start(behind.map((w) => ({ key: `ws:${w.id}`, intent: "workspace", workspace: w.id })))}>Update all ({behind.length})</Button> : undefined}
      >
        <div className="divide-y overflow-hidden rounded-2xl border bg-background">
          {d.workspaces.map((w) => (
            <Row key={w.id} title={w.name} sub={<span className="font-mono">{w.worker}</span>} version={w.version} latest={w.available ? d.workspaceLatest : null}>
              {w.available ? <Button size="sm" disabled={disabled} loading={busy === `ws:${w.id}`} onClick={() => start([{ key: `ws:${w.id}`, intent: "workspace", workspace: w.id }])}>Update</Button> : <UpToDate />}
            </Row>
          ))}
          {!d.workspaces.length && <p className="px-4 py-3 text-sm text-muted-foreground">No workspaces yet.</p>}
        </div>
      </Section>

      <Section title="Apps">
        <div className="divide-y overflow-hidden rounded-2xl border bg-background">
          {d.apps.map((a) => (
            <Row key={a.key} title={a.name} sub={a.blocked ?? (a.status === "conflict" ? `Merge the upstream branch into main in ${a.repo}. Nothing was deployed.` : a.status === "needs_build" ? `Your changes are merged in ${a.repo}. Connect Workers Builds or deploy it to go live.` : `${a.workspaceName}${a.repo ? ` · ${a.repo}` : ""}`)} version={a.version} latest={a.available ? a.latest : null}>
              {a.status === "conflict" && <Badge variant="warning" size="sm">Needs attention</Badge>}
              {a.status === "needs_build" && <Badge variant="info" size="sm">Needs a build</Badge>}
              {a.available ? <Button size="sm" disabled={disabled || !!a.blocked} loading={busy === `app:${a.key}`} onClick={() => start([{ key: `app:${a.key}`, intent: "update-app", workspace: a.workspace, app: a.app }])}>Update</Button> : <UpToDate />}
            </Row>
          ))}
          {!d.apps.length && <p className="px-4 py-3 text-sm text-muted-foreground">No apps installed. Find some in the <Link to="/apps" className="underline underline-offset-4">App store</Link>.</p>}
        </div>
      </Section>

      {d.log.length > 0 && (
        <Section title="History">
          <div className="divide-y overflow-hidden rounded-2xl border bg-background">
            {d.log.map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-2 text-xs">
                <span className="w-36 shrink-0 text-muted-foreground">{new Date(`${l.created_at}Z`).toLocaleString()}</span>
                <span className="min-w-0 flex-1 truncate">{l.part} · {l.target}{l.status === "failed" && l.detail ? ` · ${l.detail}` : ""}</span>
                <span className="font-mono text-muted-foreground">{l.from_version ?? "?"} → {l.to_version}</span>
                <Badge variant={l.status === "failed" ? "error" : l.status === "conflict" ? "warning" : "outline"} size="sm">{l.status}</Badge>
              </div>
            ))}
          </div>
        </Section>
      )}
    </PageFrame>
  );
}
