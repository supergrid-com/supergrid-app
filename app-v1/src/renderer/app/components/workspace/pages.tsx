import { ChevronRightIcon, ExternalLinkIcon, HomeIcon, KeyRoundIcon } from "lucide-react";
import type * as React from "react";
import { AppIcon } from "~/components/app-icon";
import { Card, WorkspaceFrame } from "~/components/workspace/frame";
import { HOW_TO_USE, SecretsList } from "~/components/workspace/secrets";
import { appName, catalog, type Workspace } from "~/lib/mock";

type PageProps = { ws: Workspace; onOpenNav: () => void };

// ---- Home ----

// What the workspace itself can tell us: its name, where it runs, its version and the apps it
// has installed. Stats, activity and recent chats return once the workspace records them.
export function HomePage({ ws, onOpenNav }: PageProps): React.ReactElement {
  return (
    <WorkspaceFrame icon={<HomeIcon />} title="Home" onOpenNav={onOpenNav}>
      <div className="flex flex-col gap-0.5 pt-2">
        <h2 className="font-heading text-xl font-bold">{ws.name}</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <a href={ws.url} target="_blank" rel="noreferrer" className="hover:text-foreground">
            {ws.url.replace(/^https?:\/\//, "")}
          </a>
          <span>·</span>
          <span>Workspace {ws.lastDeploy}</span>
        </div>
      </div>

      <Card title="Apps" padded={false}>
        {ws.installs.length === 0 ? (
          <div className="px-4 pb-6 pt-2 text-center text-[13px] text-muted-foreground">No apps installed yet.</div>
        ) : (
          <ul className="divide-y">
            {ws.installs.map((i) => {
              const meta = catalog.find((a) => a.id === i.app);
              const href = ws.url + (meta?.mount && meta.mount !== "/" ? meta.mount : "");
              return (
                <li key={i.app}>
                  <a href={href} target="_blank" rel="noreferrer" className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-[13px] hover:bg-accent/40">
                    <AppIcon app={i.app} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{appName(i.app)}</div>
                      <div className="truncate text-xs text-muted-foreground">{meta?.tagline}</div>
                    </div>
                    {i.version && <span className="text-xs text-muted-foreground">{i.version}</span>}
                    <ExternalLinkIcon className="size-3.5 text-muted-foreground/60" />
                    <ChevronRightIcon className="size-4 text-muted-foreground/60" />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <div className="h-10" />
    </WorkspaceFrame>
  );
}

// ---- Secrets ----

export function SecretsPage({ ws, onOpenNav }: PageProps): React.ReactElement {
  return (
    <WorkspaceFrame icon={<KeyRoundIcon />} title="Secrets" onOpenNav={onOpenNav}>
      <Card title="Workspace secrets" description={HOW_TO_USE} padded={false}>
        <SecretsList ws={ws} className="border-t" />
      </Card>
    </WorkspaceFrame>
  );
}
