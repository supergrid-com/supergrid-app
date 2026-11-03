import { ExternalLinkIcon, PackageIcon } from "lucide-react";
import type * as React from "react";
import { useParams } from "react-router";
import { Button } from "~/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { WorkspaceFrame } from "~/components/workspace/frame";
import { mockApps } from "~/lib/apps-mock";
import { useOpenNav, useShell } from "~/shell/context";

// An installed app inside the workspace. Its menu (from its manifest) is in the second panel; its
// own admin screens will render here, served by its Worker, which isn't wired up yet.
export function AppScreen(): React.ReactElement {
  const { ws } = useShell();
  const onOpenNav = useOpenNav();
  const params = useParams();
  const app = ws.apps.find((a) => a.app === params.app);
  const mock = app ? undefined : mockApps.find((m) => m.id === params.app);
  if (mock)
    return (
      <WorkspaceFrame icon={<mock.icon />} title={mock.name} onOpenNav={onOpenNav}>
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <mock.icon />
            </EmptyMedia>
            <EmptyTitle>{mock.name}</EmptyTitle>
            <EmptyDescription>A stand-in app for designing the rail. Its admin screens will open here once apps can be installed.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </WorkspaceFrame>
    );
  const sub = params["*"] ? `/${params["*"]}` : "/";
  const page = app?.nav?.find((n) => n.path === sub);
  const title = !app ? "App" : page && page.path !== "/" ? `${app.name} · ${page.label}` : app.name;
  return (
    <WorkspaceFrame
      icon={<PackageIcon />}
      title={title}
      onOpenNav={onOpenNav}
    >
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageIcon />
          </EmptyMedia>
          <EmptyTitle>{!app ? "Not installed" : app.admin ? "Its admin screens open here" : "This app has no admin screens"}</EmptyTitle>
          <EmptyDescription>
            {!app
              ? `${ws.name} has no app called ${params.app}.`
              : app.admin
                ? `${app.name} serves its own admin from its Worker. Showing it inside SuperGrid isn't built yet.`
                : `${app.name} only adds public pages and an API to the workspace.`}
          </EmptyDescription>
        </EmptyHeader>
        {app?.public && (
          <EmptyContent>
            <Button size="sm" variant="outline" render={<a href={`${ws.url}${app.public}`} target="_blank" rel="noreferrer" />}>
              <ExternalLinkIcon />
              Open in site
            </Button>
          </EmptyContent>
        )}
      </Empty>
    </WorkspaceFrame>
  );
}
