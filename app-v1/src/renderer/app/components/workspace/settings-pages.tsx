import { CloudIcon, ExternalLinkIcon, LaptopIcon, RocketIcon } from "lucide-react";
import * as React from "react";
import { EventsPage } from "~/components/workspace/events-page";
import { Card, Crumbs, WorkspaceFrame } from "~/components/workspace/frame";
import { NavEditor } from "~/components/workspace/nav-editor";
import { HOW_TO_USE, SecretsList } from "~/components/workspace/secrets";
import { settingsMeta } from "~/components/workspace/settings-nav";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { type SettingsSection, useWorkspacePage } from "~/lib/workspace-page";
import { useThemes } from "~/lib/themes";
import type { Workspace } from "~/lib/mock";
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

function General({ ws }: { ws: Workspace }): React.ReactElement {
  return (
    <>
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
            <ListRow icon={<span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><RocketIcon className="size-4" /></span>} title="Workspace version" sub={ws.lastDeploy} />
          </ul>
        </Card>
      </Group>
      <Group title="Navigation" description="Order, group and style the main nav. It updates on the left as you edit; changes last until the page reloads for now.">
        <Card>
          <NavEditor ws={ws} />
        </Card>
      </Group>
    </>
  );
}

function Theme({ ws }: { ws: Workspace }): React.ReactElement {
  const themes = useThemes(ws);
  const { go } = useWorkspacePage();
  return (
    <Group title="Themes" description="What every app and page looks like: fonts, colors, shape, assets. Apps load the default; the Design page edits them.">
      <Card padded={false}>
        <ul className="divide-y">
          {themes.records.map((r) => (
            <ListRow
              key={r.theme.id}
              icon={<span className="flex size-9 items-center justify-center rounded-lg border" style={{ background: r.theme.colors.background }}><span className="size-4 rounded-full" style={{ background: r.theme.colors.primary }} /></span>}
              title={<span className="flex items-center gap-2">{r.theme.name}{r.isDefault && <Badge variant="outline" size="sm">Default</Badge>}</span>}
              sub={`${r.theme.mode} · ${r.theme.fonts.heading.family} / ${r.theme.fonts.body.family} · ${r.theme.radius} corners`}
              right={<Button size="xs" variant="outline" onClick={() => go({ kind: "design" })}>Open in Design</Button>}
            />
          ))}
          {!themes.records.length && <ListRow title={themes.loading ? "Loading…" : "No themes yet"} />}
        </ul>
      </Card>
    </Group>
  );
}

function Secrets({ ws }: { ws: Workspace }): React.ReactElement {
  return (
    <Group title="Workspace secrets" description={HOW_TO_USE}>
      <Card padded={false}>
        <SecretsList ws={ws} />
      </Card>
    </Group>
  );
}

export function SettingsPage({ ws, section, onOpenNav }: { ws: Workspace; section: SettingsSection; onOpenNav: () => void }): React.ReactElement {
  const meta = settingsMeta[section];
  let body: React.ReactNode;
  switch (section) {
    case "events":
      body = <EventsPage ws={ws} />;
      break;
    case "theme":
      body = <Theme ws={ws} />;
      break;
    case "secrets":
      body = <Secrets ws={ws} />;
      break;
    default:
      body = <General ws={ws} />;
  }
  return (
    <WorkspaceFrame
      icon={<meta.icon />}
      title={<Crumbs items={["Settings", meta.label]} />}
      onOpenNav={onOpenNav}
      width={meta.width ?? "narrow"}
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
