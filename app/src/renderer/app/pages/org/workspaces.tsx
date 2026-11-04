import { CloudIcon, GlobeIcon, InfoIcon, LayoutGridIcon, PlusIcon, RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import * as React from "react";
import { useNavigate, useSearchParams } from "react-router";
import { CreateWorkspace } from "~/components/create-workspace";
import { SectionPage } from "~/components/section-page";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Skeleton } from "~/components/ui/skeleton";
import { sg } from "~/lib/bridge";
import { useSession } from "~/lib/session";
import { useWorkspaces, type WorkspaceSummary } from "~/lib/workspaces";

// The organization's workspaces, in its modal: the ones that live only on this Mac (the demo), then every
// `<prefix>-ws-<id>` Worker in its Cloudflare account, read through cf. A card opens that workspace; New workspace
// creates one for real.

const host = (url: string) => url.replace(/^https?:\/\//, "");
const GRID = "grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4";

function WorkspaceCard({ ws, onOpen }: { ws: WorkspaceSummary; onOpen: () => void }): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${ws.name}`}
      className="flex h-full flex-col gap-4 rounded-2xl border bg-background p-5 text-left shadow-xs/5 outline-none transition-colors hover:border-ring/40 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-active font-heading text-base font-semibold text-active-foreground">{ws.name.slice(0, 1)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-heading font-semibold">{ws.name}</span>
            {ws.demo && (
              <Badge variant="info" size="sm">
                Demo
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <GlobeIcon className="size-3 shrink-0" />
            {ws.local ? "On this Mac" : host(ws.url)}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {ws.apps.length ? (
          ws.apps.map((a) => (
            <Badge key={a.app} variant="outline" size="sm">
              {a.name}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">No Apps Yet</span>
        )}
      </div>
      <div className="mt-auto truncate text-xs text-muted-foreground">
        {ws.local ? "Runs on its dev server, not deployed" : `${ws.version ? `Workspace ${ws.version}` : "Version unknown"} · ${ws.worker}`}
      </div>
    </button>
  );
}

export function OrgWorkspaces(): React.ReactElement {
  const { org } = useSession();
  const navigate = useNavigate();
  const link = org?.cloudflare ?? null;
  const { list, error, loading, refresh } = useWorkspaces(org);
  const [params] = useSearchParams();
  const [creating, setCreating] = React.useState(params.get("create") === "1");
  const open = (id: string) => navigate(`/w/${id}`);

  if (creating && link) {
    return (
      <SectionPage title="New Workspace" width={720}>
        <CreateWorkspace link={link} onOpen={(c) => open(c.id)} onCancel={() => setCreating(false)} />
      </SectionPage>
    );
  }

  let body: React.ReactNode;
  if (!sg)
    body = (
      <Alert variant="info">
        <InfoIcon />
        <AlertTitle>Workspaces need the SuperGrid app</AlertTitle>
        <AlertDescription>They're read from your Cloudflare account through the cf CLI on your Mac, which a browser can't do.</AlertDescription>
      </Alert>
    );
  else if (!link && !list?.length)
    body = (
      <Empty className="rounded-2xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CloudIcon />
          </EmptyMedia>
          <EmptyTitle>Connect Cloudflare first</EmptyTitle>
          <EmptyDescription>Workspaces live in the organization's Cloudflare account.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  else if (error)
    body = (
      <Alert variant="error">
        <TriangleAlertIcon />
        <AlertTitle>Couldn't read the workspaces</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <AlertAction>
          <Button size="sm" variant="outline" onClick={() => void refresh()}>
            Try again
          </Button>
        </AlertAction>
      </Alert>
    );
  else if (!list)
    body = (
      <div className={GRID}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[140px] rounded-2xl" />
        ))}
      </div>
    );
  else if (!list.length)
    body = (
      <Empty className="rounded-2xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LayoutGridIcon />
          </EmptyMedia>
          <EmptyTitle>No Workspaces Yet</EmptyTitle>
          <EmptyDescription>
            {link ? `None under ${link.prefix}-ws-* in ${link.accountName}.` : "None yet."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="sm" onClick={() => setCreating(true)}>
            <PlusIcon />
            New workspace
          </Button>
        </EmptyContent>
      </Empty>
    );
  else
    body = (
      <div className={GRID}>
        {list.map((ws) => (
          <WorkspaceCard key={ws.worker} ws={ws} onOpen={() => open(ws.id)} />
        ))}
      </div>
    );

  return (
    <SectionPage
      title="Workspaces"
      actions={
        sg && link ? (
          <>
            <Button size="icon-sm" variant="ghost" aria-label="Refresh" className="text-muted-foreground" disabled={loading} onClick={() => void refresh()}>
              <RefreshCwIcon className={loading ? "animate-spin" : undefined} />
            </Button>
            <Button size="sm" onClick={() => setCreating(true)}>
              <PlusIcon />
              New workspace
            </Button>
          </>
        ) : undefined
      }
    >
      {body}
    </SectionPage>
  );
}
