// Apps from the release feed. Installing deploys the signed build and gives the workspace's owner the source in an Artifacts repo.
import { CircleAlertIcon, PackageIcon } from "lucide-react";
import * as React from "react";
import { Link, useFetcher, useLoaderData } from "react-router";
import { PageFrame } from "~/components/page-frame";
import { PageHeader } from "~/components/page-header";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Field, FieldLabel } from "~/components/ui/field";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { toastManager } from "~/components/ui/toast";
import { can, visibleWorkspaces } from "../../src/access";
import { cachedReleases, checkReleases, isConnected } from "../../src/cloud";
import { platformContext, requireActor } from "../../src/context";
import { listAllInstalls, listWorkspaces } from "../../src/db";
import { errorMessage } from "../ui";
import type { action as runAction } from "./run";
import type { Route } from "./+types/app-store";

export async function loader({ context }: Route.LoaderArgs) {
  const p = requireActor(context.get(platformContext));
  let feedError: string | null = null;
  const latest = (await cachedReleases(p.env)) ?? (await checkReleases(p.env).catch((e) => { feedError = errorMessage(e); return null; }));
  const visible = await visibleWorkspaces(p.env, p.actor, await listWorkspaces(p.env));
  const installs = await listAllInstalls(p.env);
  return {
    connected: await isConnected(p.env), feedError, apps: latest?.catalog ?? [],
    workspaces: visible.filter(({ ws, grant }) => ws.worker && can(grant, "app:install")).map(({ ws }) => ({ id: ws.id, name: ws.name })),
    installs: installs.map((i) => ({ workspace: i.workspace_id, app: i.app_id })),
  };
}

function InstallDialog({ app, workspaces, disabled }: { app: { id: string; name: string }; workspaces: { id: string; name: string }[]; disabled: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [workspace, setWorkspace] = React.useState(workspaces[0]?.id ?? "");
  const fetcher = useFetcher<typeof runAction>();
  const items = workspaces.map((w) => ({ value: w.id, label: w.name }));
  const result = fetcher.data as { ok: boolean; error?: string; warning?: string | null } | undefined;
  React.useEffect(() => {
    if (fetcher.state !== "idle" || !result) return;
    if (result.ok) { setOpen(false); toastManager.add({ title: `${app.name} installed`, description: result.warning ?? undefined, type: result.warning ? "warning" : "success" }); }
  }, [fetcher.state, result, app.name]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" disabled={disabled || !workspaces.length} />}>Install</DialogTrigger>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Install {app.name}</DialogTitle>
          <DialogDescription>It runs as its own Worker in your account, and its source goes into an Artifacts repo you own.</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel>Workspace</FieldLabel>
              <Select items={items} value={workspace} onValueChange={(v) => setWorkspace(String(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectPopup>{items.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectPopup>
              </Select>
            </Field>
            {result && !result.ok && <Alert variant="error"><AlertDescription>{result.error}</AlertDescription></Alert>}
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button disabled={!workspace} loading={fetcher.state !== "idle"} onClick={() => fetcher.submit({ intent: "install-app", workspace, app: app.id }, { method: "post", action: "/run" })}>Install</Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

export default function AppStore() {
  const { connected, feedError, apps, workspaces, installs } = useLoaderData<typeof loader>();
  return (
    <PageFrame crumbs={[{ label: "App store" }]}>
      <PageHeader title="App store" description="Apps maintained for SuperGrid. Install one into a workspace and it stays yours to edit." />
      {feedError && <Alert variant="error"><CircleAlertIcon /><AlertDescription>{feedError}</AlertDescription></Alert>}
      {!connected && <Alert variant="warning"><CircleAlertIcon /><AlertDescription><span>Connect <Link to="/connect" className="underline underline-offset-4">your Cloudflare account</Link> to install apps.</span></AlertDescription></Alert>}
      {apps.length === 0 && !feedError && (
        <Empty className="rounded-2xl border border-dashed bg-background/50">
          <EmptyHeader>
            <EmptyMedia variant="icon"><PackageIcon /></EmptyMedia>
            <EmptyTitle>No apps published yet</EmptyTitle>
            <EmptyDescription>Apps appear here when they are released to your feed.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((a) => {
          const here = installs.filter((i) => i.app === a.id).map((i) => i.workspace);
          const free = workspaces.filter((w) => !here.includes(w.id));
          return (
            <div key={a.id} className="flex flex-col gap-3 rounded-2xl border bg-background p-4 shadow-xs/5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-heading font-semibold">{a.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{a.version}</div>
                </div>
                {here.length > 0 && <Badge variant="outline" size="sm">{here.length} installed</Badge>}
              </div>
              {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
              <div className="mt-auto"><InstallDialog app={a} workspaces={free} disabled={!connected} /></div>
            </div>
          );
        })}
      </div>
    </PageFrame>
  );
}
