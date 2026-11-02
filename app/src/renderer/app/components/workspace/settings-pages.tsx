import { CheckIcon, CloudIcon, DownloadIcon, ExternalLinkIcon, LaptopIcon, PlusIcon, RefreshCwIcon, RocketIcon, SettingsIcon, Trash2Icon } from "lucide-react";
import * as React from "react";
import { AppIcon } from "~/components/app-icon";
import { Card, Crumbs, WorkspaceFrame } from "~/components/workspace/frame";
import { NavEditor } from "~/components/workspace/nav-editor";
import { settingsMeta } from "~/components/workspace/settings-nav";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { toastManager } from "~/components/ui/toast";
import type { SettingsSection } from "~/lib/workspace-page";
import { appName, catalog, connections, customRoles, invitations, members, secrets, tablesFor, teamName, type Install, type Workspace } from "~/lib/mock";
import { cn } from "~/lib/utils";

// The settings pages, after Shopify's: a big title, then titled groups of cards.

function Group({ title, description, children }: { title: string; description?: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {description && <p className="text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }): React.ReactElement {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function ListRow({ icon, title, sub, right }: { icon?: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode }): React.ReactElement {
  return (
    <li className="flex items-center gap-3 px-4 py-3 text-[13px]">
      {icon}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{title}</div>
        {sub && <div className="truncate text-xs text-muted-foreground">{sub}</div>}
      </div>
      {right}
    </li>
  );
}

function Toggle({ label, hint, defaultChecked }: { label: string; hint: string; defaultChecked?: boolean }): React.ReactElement {
  return (
    <li className="flex items-center gap-3 px-4 py-3 text-[13px]">
      <div className="min-w-0 flex-1">
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </li>
  );
}

function StatusBadge({ status }: { status: Install["status"] }): React.ReactElement {
  switch (status) {
    case "ok":
      return <Badge variant="success" size="sm">Up to date</Badge>;
    case "update":
      return <Badge variant="warning" size="sm">Update available</Badge>;
    case "deploying":
      return <Badge variant="info" size="sm">Deploying…</Badge>;
    case "failed":
      return <Badge variant="error" size="sm">Deploy failed</Badge>;
  }
}

const notYet = () => toastManager.add({ title: "Not in the POC", type: "info" });

function General({ ws }: { ws: Workspace }): React.ReactElement {
  const team = teamName(ws.teamId);
  return (
    <>
      <Group title="Workspace" description="How this workspace shows up across the platform.">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input defaultValue={ws.name} />
            </Field>
            <Field label="Client" hint="The team this workspace belongs to, if any.">
              <Input defaultValue={team ?? ""} placeholder="None" />
            </Field>
          </div>
        </Card>
      </Group>
      <Group title="Hosting" description="Where the workspace runs.">
        <Card padded={false}>
          <ul className="divide-y">
            <ListRow
              icon={<span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">{ws.provider === "cloudflare" ? <CloudIcon className="size-4" /> : <LaptopIcon className="size-4" />}</span>}
              title={ws.provider === "cloudflare" ? "Cloudflare" : "Local"}
              sub={ws.url.replace(/^https?:\/\//, "")}
              right={
                <Button size="xs" variant="outline" render={<a href={ws.url} target="_blank" rel="noreferrer" />}>
                  <ExternalLinkIcon />
                  Open
                </Button>
              }
            />
            <ListRow icon={<span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><RocketIcon className="size-4" /></span>} title="Last deploy" sub={ws.lastDeploy} right={<Button size="xs" variant="outline" onClick={notYet}>Redeploy</Button>} />
          </ul>
        </Card>
      </Group>
      <Group title="Navigation" description="Order, group and style the main nav. It updates on the left as you edit; changes last until the page reloads for now.">
        <Card>
          <NavEditor ws={ws} />
        </Card>
      </Group>
      <Group title="Defaults" description="Used by every app unless it says otherwise.">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Time zone">
              <Input defaultValue="(GMT-07:00) Arizona" />
            </Field>
            <Field label="Language">
              <Input defaultValue="English" />
            </Field>
          </div>
        </Card>
      </Group>
    </>
  );
}

function Plan({ ws }: { ws: Workspace }): React.ReactElement {
  const meter = (label: string, used: number, max: number, unit: string) => (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {used.toLocaleString()} / {max.toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (used / max) * 100)}%` }} />
      </div>
    </div>
  );
  return (
    <>
      <Group title="Current plan">
        <Card padded={false}>
          <ul className="divide-y">
            <ListRow title="Pro" sub="Unlimited apps, 3 team members, daily backups." right={<Button size="xs" variant="outline" onClick={notYet}>Change plan</Button>} />
            <ListRow title="Next invoice" sub="December 1, 2026" right={<span className="font-heading text-base font-bold">$29</span>} />
          </ul>
        </Card>
      </Group>
      <Group title="Usage this month">
        <Card>
          <div className="flex flex-col gap-4">
            {meter("Requests", 184_200, 1_000_000, "")}
            {meter("Storage", 412, 5_000, "MB")}
            {meter("Contacts", ws.contacts, 10_000, "")}
          </div>
        </Card>
      </Group>
    </>
  );
}

function Access({ ws }: { ws: Workspace }): React.ReactElement {
  return (
    <>
      <Group title="Members" description={`People who can open ${ws.name}.`}>
        <Card padded={false}>
          <ul className="divide-y">
            {members.map((m) => (
              <ListRow
                key={m.id}
                icon={
                  <Avatar className="[--avatar-size:--spacing(8)]">
                    <AvatarFallback className="text-[11px]">{m.initials}</AvatarFallback>
                  </Avatar>
                }
                title={m.name}
                sub={m.email}
                right={<Badge variant="outline" size="sm">{m.role}</Badge>}
              />
            ))}
          </ul>
          <div className="border-t px-4 py-2.5">
            <Button size="xs" variant="outline" onClick={notYet}>
              <PlusIcon />
              Invite
            </Button>
          </div>
        </Card>
      </Group>
      <Group title="Pending invitations">
        <Card padded={false}>
          <ul className="divide-y">
            {invitations.map((i) => (
              <ListRow key={i.id} title={i.email} sub={`${i.role} · sent ${i.sentAt} · expires in ${i.expiresIn}`} right={<Button size="xs" variant="ghost" onClick={notYet}>Cancel</Button>} />
            ))}
          </ul>
        </Card>
      </Group>
      <Group title="Custom roles" description="Roles beyond owner, admin, editor and viewer.">
        <Card padded={false}>
          <ul className="divide-y">
            {customRoles.map((r) => (
              <ListRow key={r.role} title={r.role} sub={r.description} right={<Button size="xs" variant="ghost" onClick={notYet}>Edit</Button>} />
            ))}
          </ul>
        </Card>
      </Group>
    </>
  );
}

function Apps({ ws }: { ws: Workspace }): React.ReactElement {
  const updates = ws.installs.filter((i) => i.status === "update").length;
  return (
    <>
      <Group title="Installed apps" description="Each one is a Worker with its own repo. Updates come from the upstream app and deploy on push.">
        <Card padded={false}>
          <ul className="divide-y">
            {ws.installs.map((i) => {
              const meta = catalog.find((a) => a.id === i.app);
              return (
                <ListRow
                  key={i.app}
                  icon={<AppIcon app={i.app} size="lg" className="rounded-lg" />}
                  title={
                    <span className="flex items-center gap-2">
                      {appName(i.app)}
                      <span className="font-mono text-xs text-muted-foreground">
                        {i.version}
                        {i.status === "update" && ` → ${i.latest}`}
                      </span>
                    </span>
                  }
                  sub={`mount ${meta?.mount ?? "/"} · ${i.worker} · ${i.repo}`}
                  right={
                    <span className="flex items-center gap-2">
                      <StatusBadge status={i.status} />
                      <Button size="xs" variant="ghost" aria-label="App settings" onClick={notYet}>
                        <SettingsIcon />
                      </Button>
                    </span>
                  }
                />
              );
            })}
          </ul>
          <div className="flex items-center gap-2 border-t px-4 py-2.5">
            <Button size="xs" variant="outline" onClick={notYet}>
              <PlusIcon />
              Install an app
            </Button>
            <Button size="xs" disabled={updates === 0} onClick={() => toastManager.add({ title: `Deploying ${updates} updates`, type: "loading", timeout: 2500 })}>
              <RocketIcon />
              Deploy updates{updates > 0 && ` (${updates})`}
            </Button>
          </div>
        </Card>
      </Group>
    </>
  );
}

function Data({ ws }: { ws: Workspace }): React.ReactElement {
  const tables = tablesFor(ws);
  return (
    <>
      <Group title="Tables" description="Core tables plus one per installed app.">
        <Card padded={false}>
          <ul className="divide-y">
            {tables.map((t) => (
              <ListRow
                key={t.id}
                icon={t.owner === "core" ? <span className="size-5 rounded-md border bg-muted" /> : <AppIcon app={t.owner} size="sm" />}
                title={<span className="font-mono text-xs">{t.name}</span>}
                sub={`${t.rows.length} rows · ${t.columns.length} columns`}
                right={
                  <Button size="xs" variant="ghost" onClick={notYet}>
                    <DownloadIcon />
                    Export
                  </Button>
                }
              />
            ))}
          </ul>
        </Card>
      </Group>
      <Group title="Backups">
        <Card padded={false}>
          <ul className="divide-y">
            <Toggle label="Daily backups" hint="Kept for 30 days." defaultChecked />
            <ListRow title="Last backup" sub="Today, 03:12" right={<Button size="xs" variant="outline" onClick={notYet}>Restore…</Button>} />
          </ul>
        </Card>
      </Group>
    </>
  );
}

function Theme({ ws }: { ws: Workspace }): React.ReactElement {
  const [accent, setAccent] = React.useState(ws.theme.accent);
  return (
    <>
      <Group title="Colors" description="Every app reads these from /_ws/theme.css.">
        <Card>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Accent">
              <span className="flex items-center gap-2">
                <span className="size-7 shrink-0 rounded-md border" style={{ background: accent }} />
                <Input value={accent} onChange={(e) => setAccent(e.target.value)} className="font-mono" />
              </span>
            </Field>
            <Field label="Background">
              <span className="flex items-center gap-2">
                <span className="size-7 shrink-0 rounded-md border" style={{ background: ws.theme.bg }} />
                <Input defaultValue={ws.theme.bg} className="font-mono" />
              </span>
            </Field>
            <Field label="Text">
              <span className="flex items-center gap-2">
                <span className="size-7 shrink-0 rounded-md border" style={{ background: ws.theme.fg }} />
                <Input defaultValue={ws.theme.fg} className="font-mono" />
              </span>
            </Field>
          </div>
        </Card>
      </Group>
      <Group title="Type">
        <Card>
          <Field label="Display font">
            <Input defaultValue={ws.theme.font} />
          </Field>
          <div className="mt-4 rounded-lg border p-4" style={{ background: ws.theme.bg, color: ws.theme.fg }}>
            <div className="font-heading text-2xl font-bold">The quick brown fox</div>
            <div className="mt-1 text-sm opacity-70">jumps over the lazy dog, in {ws.theme.font}.</div>
            <span className="mt-3 inline-block rounded-md px-3 py-1.5 text-sm font-medium text-white" style={{ background: accent }}>
              Primary button
            </span>
          </div>
        </Card>
      </Group>
    </>
  );
}

function Domains({ ws }: { ws: Workspace }): React.ReactElement {
  const host = ws.url.replace(/^https?:\/\//, "");
  return (
    <>
      <Group title="Domains" description="Where the workspace is served. The first one is primary.">
        <Card padded={false}>
          <ul className="divide-y">
            <ListRow title={host} sub="Primary · SSL active" right={<Badge variant="success" size="sm"><CheckIcon />Connected</Badge>} />
            <ListRow title={`${ws.id}.supergrid.app`} sub="Platform subdomain · redirects to primary" right={<Badge variant="outline" size="sm">Redirect</Badge>} />
          </ul>
          <div className="border-t px-4 py-2.5">
            <Button size="xs" variant="outline" onClick={notYet}>
              <PlusIcon />
              Connect domain
            </Button>
          </div>
        </Card>
      </Group>
    </>
  );
}

function Integrations({ ws }: { ws: Workspace }): React.ReactElement {
  const connected = ws.id === "acme" ? connections.filter((c) => c.status === "connected") : [];
  return (
    <Group title="Connected" description="Services this workspace can talk to.">
      <Card padded={false}>
        {connected.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">Nothing connected yet.</div>
        ) : (
          <ul className="divide-y">
            {connected.map((c) => (
              <ListRow key={c.id} icon={<span className="size-8 rounded-lg" style={{ background: c.color }} />} title={c.name} sub={c.description} right={<Button size="xs" variant="ghost" onClick={notYet}>Disconnect</Button>} />
            ))}
          </ul>
        )}
      </Card>
    </Group>
  );
}

function Notifications(): React.ReactElement {
  return (
    <>
      <Group title="Email me when">
        <Card padded={false}>
          <ul className="divide-y">
            <Toggle label="A deploy fails" hint="Any app in this workspace." defaultChecked />
            <Toggle label="An app update is available" hint="Once a day at most." defaultChecked />
            <Toggle label="A new contact arrives" hint="From forms, funnels or imports." />
            <Toggle label="Weekly digest" hint="Visits, contacts and deploys, every Monday." defaultChecked />
          </ul>
        </Card>
      </Group>
      <Group title="Where">
        <Card>
          <Field label="Email" hint="Separate several with commas.">
            <Input defaultValue="dylan@supergrid.dev" />
          </Field>
        </Card>
      </Group>
    </>
  );
}

function Secrets({ ws }: { ws: Workspace }): React.ReactElement {
  const list = secrets[ws.id] ?? [];
  return (
    <Group title="Environment secrets" description="Available to every app as bindings. Values are write-only.">
      <Card padded={false}>
        {list.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">No secrets yet.</div>
        ) : (
          <ul className="divide-y">
            {list.map((s) => (
              <ListRow key={s.id} title={<span className="font-mono text-xs">{s.name}</span>} sub={`${s.hint} · updated ${s.updatedAt}`} right={<Button size="xs" variant="ghost" onClick={notYet}>Rotate</Button>} />
            ))}
          </ul>
        )}
        <div className="border-t px-4 py-2.5">
          <Button size="xs" variant="outline" onClick={notYet}>
            <PlusIcon />
            Add secret
          </Button>
        </div>
      </Card>
    </Group>
  );
}

function Advanced({ ws }: { ws: Workspace }): React.ReactElement {
  return (
    <>
      <Group title="Identifiers">
        <Card padded={false}>
          <ul className="divide-y">
            <ListRow title="Workspace id" right={<code className="text-xs text-muted-foreground">{ws.id}</code>} />
            <ListRow title="Organization" right={<code className="text-xs text-muted-foreground">{ws.orgId}</code>} />
            {ws.installs.map((i) => (
              <ListRow key={i.app} title={`${appName(i.app)} worker`} right={<code className="text-xs text-muted-foreground">{i.worker}</code>} />
            ))}
          </ul>
        </Card>
      </Group>
      <Group title="Maintenance">
        <Card padded={false}>
          <ul className="divide-y">
            <ListRow title="Redeploy everything" sub="Rebuilds every app from its repo." right={<Button size="xs" variant="outline" onClick={notYet}><RefreshCwIcon />Redeploy</Button>} />
            <ListRow title="Export workspace" sub="Settings, tables and files as one archive." right={<Button size="xs" variant="outline" onClick={notYet}><DownloadIcon />Export</Button>} />
          </ul>
        </Card>
      </Group>
      <Group title="Danger zone">
        <Card className="border-destructive/30" padded={false}>
          <ul>
            <ListRow title={`Delete ${ws.name}`} sub="Removes the apps, data and domains. This cannot be undone." right={<Button size="xs" variant="destructive" onClick={notYet}><Trash2Icon />Delete workspace</Button>} />
          </ul>
        </Card>
      </Group>
    </>
  );
}

export function SettingsPage({ ws, section, onOpenNav }: { ws: Workspace; section: SettingsSection; onOpenNav: () => void }): React.ReactElement {
  const meta = settingsMeta[section];
  let body: React.ReactNode;
  switch (section) {
    case "plan":
      body = <Plan ws={ws} />;
      break;
    case "access":
      body = <Access ws={ws} />;
      break;
    case "apps":
      body = <Apps ws={ws} />;
      break;
    case "data":
      body = <Data ws={ws} />;
      break;
    case "theme":
      body = <Theme ws={ws} />;
      break;
    case "domains":
      body = <Domains ws={ws} />;
      break;
    case "integrations":
      body = <Integrations ws={ws} />;
      break;
    case "notifications":
      body = <Notifications />;
      break;
    case "secrets":
      body = <Secrets ws={ws} />;
      break;
    case "advanced":
      body = <Advanced ws={ws} />;
      break;
    default:
      body = <General ws={ws} />;
  }
  return (
    <WorkspaceFrame
      icon={<meta.icon />}
      title={<Crumbs items={["Settings", meta.label]} />}
      onOpenNav={onOpenNav}
      width="narrow"
      actions={
        <Button size="xs" onClick={() => toastManager.add({ title: "Saved", type: "success", timeout: 1500 })}>
          Save
        </Button>
      }
    >
      <div className={cn("flex flex-col gap-1 pt-3")}>
        <h2 className="font-heading text-2xl font-bold">{meta.label}</h2>
        <p className="text-[13px] text-muted-foreground">{meta.blurb}</p>
      </div>
      <div className="flex flex-col gap-8">{body}</div>
      <div className="h-10" />
    </WorkspaceFrame>
  );
}
