import { DownloadIcon } from "lucide-react";
import { AppIcon } from "~/components/app-icon";
import { PageFrame } from "~/components/page-frame";
import { PageHeader } from "~/components/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuTrigger } from "~/components/ui/menu";
import { toastManager } from "~/components/ui/toast";
import { catalog, workspaces } from "~/lib/mock";

export default function AppStore() {
  return (
    <PageFrame crumbs={[{ label: "Home", to: "/" }, { label: "App store" }]}>
      <PageHeader title="App store" description="Every app is its own Worker and repo. Installing one into a workspace creates its repo, deploys it and registers the mount." />
      <div className="grid gap-4 sm:grid-cols-2">
        {catalog.map((a) => {
          const installedIn = workspaces.filter((w) => w.installs.some((i) => i.app === a.id));
          return (
            <div key={a.id} className="flex gap-4 rounded-2xl border bg-background p-5 shadow-xs/5">
              <AppIcon app={a.id} size="xl" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-semibold">{a.name}</span>
                  <Badge variant="secondary" size="sm" className="font-mono">
                    {a.version}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{a.tagline}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  mounts at <span className="font-mono">{a.mount}</span> · in {installedIn.length} workspace{installedIn.length === 1 ? "" : "s"}
                </p>
                <div className="mt-3">
                  <Menu>
                    <MenuTrigger render={<Button size="sm" variant="outline" />}>
                      <DownloadIcon />
                      Install into…
                    </MenuTrigger>
                    <MenuPopup align="start">
                      <MenuGroup>
                        <MenuGroupLabel>Workspaces</MenuGroupLabel>
                        {workspaces.map((w) => {
                          const has = w.installs.some((i) => i.app === a.id);
                          return (
                            <MenuItem key={w.id} disabled={has} onClick={() => toastManager.add({ title: `Installing ${a.name} into ${w.name}`, type: "loading", timeout: 2500 })}>
                              {w.name}
                              {has && <span className="ms-auto text-xs text-muted-foreground">installed</span>}
                            </MenuItem>
                          );
                        })}
                      </MenuGroup>
                    </MenuPopup>
                  </Menu>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PageFrame>
  );
}
