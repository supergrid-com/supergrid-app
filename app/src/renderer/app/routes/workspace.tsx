import type * as React from "react";
import { Link, useParams } from "react-router";
import { PageFrame } from "~/components/page-frame";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "~/components/ui/empty";
import { WorkspaceShell } from "~/components/workspace/workspace";
import { useWorkspace } from "~/lib/data";

// A workspace: the sidebar admin.
export default function WorkspaceRoute(): React.ReactElement {
  const { id } = useParams();
  const { workspace: ws, loading } = useWorkspace(id);
  if (ws) return <WorkspaceShell ws={ws} />;
  if (loading) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  return (
    <PageFrame crumbs={[{ label: "Workspaces", to: "/" }]}>
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Unknown workspace</EmptyTitle>
          <EmptyDescription>
            There is no workspace called <span className="font-mono">{id}</span>.
          </EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" render={<Link to="/" />}>
          Back to workspaces
        </Button>
      </Empty>
    </PageFrame>
  );
}
