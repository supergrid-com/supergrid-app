import { FolderIcon, LayoutGridIcon, ListIcon, PlusIcon, SearchIcon } from "lucide-react";
import * as React from "react";
import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { PageFrame } from "~/components/page-frame";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/components/ui/input-group";
import { usePlatform } from "~/lib/platform";
import { cn } from "~/lib/utils";
import { can, orgGrant, visibleWorkspaces } from "../../src/access";
import { platformContext, requireActor } from "../../src/context";
import { isConnected } from "../../src/cloud";
import { listWorkspaces } from "../../src/db";
import { createWorkspaceFlow } from "../../src/flows";
import { errorMessage } from "../ui";
import type { Route } from "./+types/home";

type Item = { id: string; name: string; url: string; worker: string | null; role: string };

export async function loader({ context }: Route.LoaderArgs) {
  const p = requireActor(context.get(platformContext));
  const visible = await visibleWorkspaces(p.env, p.actor, await listWorkspaces(p.env));
  const byOrg = new Map<string, { name: string; items: Item[] }>();
  for (const { ws, grant } of visible) {
    const key = ws.organization_id ?? "";
    const name = p.memberships.find((m) => m.organizationId === key)?.name ?? (key ? key : "Unassigned");
    const g = byOrg.get(key) ?? { name, items: [] };
    g.items.push({ id: ws.id, name: ws.name, url: ws.url, worker: ws.worker, role: grant.role });
    byOrg.set(key, g);
  }
  const org = p.activeOrg ? await orgGrant(p.env, p.actor, p.activeOrg.organizationId) : null;
  return {
    groups: [...byOrg.entries()].map(([id, g]) => ({ id, name: g.name, items: g.items })),
    canCreate: can(org, "workspace:create"),
    activeOrg: p.activeOrg?.name ?? null,
    hasOrg: p.memberships.length > 0 || p.actor.operator,
    connected: await isConnected(p.env),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const p = requireActor(context.get(platformContext));
  if (!p.activeOrg) return { error: "Create or join an organization first." };
  const grant = await orgGrant(p.env, p.actor, p.activeOrg.organizationId);
  if (!can(grant, "workspace:create")) return { error: "Your role cannot create workspaces." };
  const f = await request.formData();
  const name = String(f.get("name") ?? "").trim();
  if (!name) return { error: "A name is required." };
  try {
    return redirect(`/w/${await createWorkspaceFlow(p.env, { name, organizationId: p.activeOrg.organizationId })}`);
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

function Tile({ className }: { className?: string }): React.ReactElement {
  return (
    <div className={cn("flex size-14 items-center justify-center rounded-xl border bg-background shadow-xs/5", className)}>
      <FolderIcon className="size-6 text-muted-foreground" />
    </div>
  );
}

function WorkspaceCard({ ws }: { ws: Item }): React.ReactElement {
  return (
    <Link to={`/w/${ws.id}`} className="group flex flex-col gap-3 rounded-2xl border bg-background p-4 shadow-xs/5 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex items-start justify-between">
        <Tile />
        <Badge variant="outline" size="sm">{ws.role}</Badge>
      </div>
      <div className="min-w-0">
        <div className="truncate font-heading font-semibold">{ws.name}</div>
        <div className="truncate text-xs text-muted-foreground">{ws.worker ?? ws.url.replace(/^https?:\/\//, "")}</div>
      </div>
    </Link>
  );
}

// Creating a workspace takes a moment: its database, its Worker and its URL all come up in this one request.
function NewWorkspaceDialog({ orgName, error }: { orgName: string; error?: string }): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const nav = useNavigation();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon />
        New
      </DialogTrigger>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>New workspace</DialogTitle>
          <DialogDescription>A workspace is one site: its own database, domain and apps, in {orgName}. It gets a short id that names everything in your Cloudflare account, so names can repeat across clients.</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <Form method="post" id="new-workspace" className="flex flex-col gap-4">
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input name="name" placeholder="Bluebird Bakery" required />
              <FieldDescription>You can have two workspaces with the same name.</FieldDescription>
            </Field>
            {error && (
              <Alert variant="error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </Form>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button type="submit" form="new-workspace" loading={nav.state === "submitting"}>
            Create workspace
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

export default function Home() {
  const { groups, canCreate, activeOrg, hasOrg, connected } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const { mode, user } = usePlatform();
  const [query, setQuery] = React.useState("");
  const [layout, setLayout] = React.useState<"grid" | "list">("grid");
  const title = mode === "creator" ? "Sites" : "Workspaces";
  const q = query.trim().toLowerCase();
  const shown = groups.map((g) => ({ ...g, items: g.items.filter((w) => !q || `${w.name} ${w.url}`.toLowerCase().includes(q)) })).filter((g) => g.items.length);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <PageFrame crumbs={[{ label: title }]} width="wide">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-heading text-xl font-bold">{title}</h1>
        <div className="flex-1" />
        <InputGroup className="w-56 bg-background">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
        </InputGroup>
        <div className="flex rounded-lg border bg-background p-0.5">
          <Button variant="ghost" size="icon-xs" aria-label="Grid" className={cn(layout === "grid" && "bg-accent")} onClick={() => setLayout("grid")}>
            <LayoutGridIcon />
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label="List" className={cn(layout === "list" && "bg-accent")} onClick={() => setLayout("list")}>
            <ListIcon />
          </Button>
        </div>
        {canCreate && activeOrg && connected && <NewWorkspaceDialog orgName={activeOrg} error={result?.error} />}
      </div>

      {!connected && (
        <Alert variant="warning">
          <AlertDescription>
            <span>{user.operator ? <>Connect <Link to="/connect" className="underline underline-offset-4">your Cloudflare account</Link> to create workspaces.</> : "An operator needs to connect Cloudflare before workspaces can be created."}</span>
          </AlertDescription>
        </Alert>
      )}

      {!hasOrg && (
        <Alert variant="info">
          <AlertDescription>
            You are not in an organization yet. {mode === "reseller" ? <Link to="/org/new" className="underline underline-offset-4">Create one</Link> : "Ask an owner for an invitation."}
          </AlertDescription>
        </Alert>
      )}

      {total === 0 && hasOrg && (
        <Empty className="rounded-2xl border border-dashed bg-background/50">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderIcon />
            </EmptyMedia>
            <EmptyTitle>No {title.toLowerCase()} yet</EmptyTitle>
            <EmptyDescription>
              {canCreate ? "Create your first one with New." : "Ask an owner to create one."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {total > 0 && shown.length === 0 && (
        <Empty className="rounded-2xl border border-dashed bg-background/50">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchIcon />
            </EmptyMedia>
            <EmptyTitle>Nothing matches</EmptyTitle>
            <EmptyDescription>Try another name.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {shown.map((g) => (
        <section key={g.id} className="flex flex-col gap-3">
          {(groups.length > 1 || mode !== "creator") && <h2 className="text-sm text-muted-foreground">{g.name}</h2>}
          {layout === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {g.items.map((w) => (
                <WorkspaceCard key={w.id} ws={w} />
              ))}
            </div>
          ) : (
            <div className="divide-y overflow-hidden rounded-2xl border bg-background">
              {g.items.map((w) => (
                <Link key={w.id} to={`/w/${w.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40">
                  <Tile className="size-9 rounded-lg [&_svg]:size-4" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{w.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{w.worker ?? "local"} · you: {w.role}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{w.url.replace(/^https?:\/\//, "")}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      ))}
    </PageFrame>
  );
}
