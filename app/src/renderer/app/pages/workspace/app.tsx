import { ExternalLinkIcon, PackageIcon } from "lucide-react";
import type * as React from "react";
import { useParams } from "react-router";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { WorkspaceFrame } from "~/components/workspace/frame";
import { useOpenNav, useShell } from "~/shell/context";

// An installed app inside the workspace. Its menu (from its manifest) is in the second panel; its
// own admin screens will render here, served by its Worker, which isn't wired up yet.
export function AppScreen(): React.ReactElement {
  const { ws } = useShell();
  const onOpenNav = useOpenNav();
  const params = useParams();
  const app = ws.apps.find((a) => a.app === params.app);
  const sub = params["*"] ? `/${params["*"]}` : "/";
  const page = app?.nav?.find((n) => n.path === sub);
  const title = !app ? "App" : page && page.path !== "/" ? `${app.name} · ${page.label}` : app.name;
  return (
    <WorkspaceFrame
      icon={<PackageIcon />}
      title={title}
      onOpenNav={onOpenNav}
      actions={
        app?.public ? (
          <Button size="xs" variant="ghost" render={<a href={`${ws.url}${app.public}`} target="_blank" rel="noreferrer" />}>
            <ExternalLinkIcon />
            Open in site
          </Button>
        ) : undefined
      }
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
      </Empty>
    </WorkspaceFrame>
  );
}
