import { PlusIcon, WorkflowIcon } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Card, DataTable, StatTile, WorkspaceFrame } from "~/components/workspace/frame";
import { ListState, relative } from "~/components/workspace/library/shared";
import { eventLabel, useWorkflows, type Workflow } from "~/lib/workflows";
import { useOpenNav, useShell } from "~/shell/context";
import { NewWorkflowButton } from "./shared";

// Every workflow in the workspace: what triggers it, how many steps it has, how often it has run.
// Opening one shows its editor; the + in the title bar (and the sub panel) makes a new one.

export function WorkflowsIndex(): React.ReactElement {
  const { ws } = useShell();
  const onOpenNav = useOpenNav();
  const navigate = useNavigate();
  const workflows = useWorkflows(ws.id);
  const list = workflows.data ?? [];
  const enabled = list.filter((w) => w.enabled).length;
  const runs = list.reduce((n, w) => n + w.runs, 0);
  const action = (
    <NewWorkflowButton>
      {(open) => (
        <Button size="xs" onClick={open}>
          <PlusIcon />
          New Workflow
        </Button>
      )}
    </NewWorkflowButton>
  );
  return (
    <WorkspaceFrame icon={<WorkflowIcon />} title="Workflows" actions={action} onOpenNav={onOpenNav}>
      <ListState
        data={workflows.data}
        error={workflows.error}
        loading={workflows.loading}
        onRetry={() => void workflows.refresh()}
        isEmpty={(d) => d.length === 0}
        empty={
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <WorkflowIcon />
              </EmptyMedia>
              <EmptyTitle>No Workflows Yet</EmptyTitle>
              <EmptyDescription>A workflow runs when an event happens: a contact is created, a form is sent, a tag is added. Start with one that sends an HTTP request.</EmptyDescription>
            </EmptyHeader>
            {action}
          </Empty>
        }
      >
        {(rows) => (
          <>
            <Card padded={false}>
              <div className="grid grid-cols-2 divide-x sm:grid-cols-4">
                <StatTile label="Workflows" value={rows.length.toLocaleString()} />
                <StatTile label="Enabled" value={enabled.toLocaleString()} />
                <StatTile label="With a Trigger" value={rows.filter((w) => w.definition.trigger).length.toLocaleString()} />
                <StatTile label="Runs" value={runs.toLocaleString()} />
              </div>
            </Card>
            <Card padded={false}>
              <DataTable<Workflow>
                rows={rows}
                rowKey={(w) => w.id}
                onRowClick={(w) => navigate(`/w/${ws.id}/workflows/${w.id}`)}
                columns={[
                  { key: "name", label: "Name", render: (w) => <span className="font-medium">{w.name}</span> },
                  { key: "trigger", label: "Trigger", render: (w) => (w.definition.trigger ? <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{w.definition.trigger.event}</code> : <span className="text-muted-foreground">By hand</span>) },
                  { key: "steps", label: "Steps", width: "6rem", align: "end", render: (w) => <span className="tabular-nums">{w.definition.steps.length}</span> },
                  { key: "runs", label: "Runs", width: "6rem", align: "end", render: (w) => <span className="tabular-nums">{w.runs.toLocaleString()}</span> },
                  { key: "last", label: "Last Run", width: "9rem", className: "max-sm:hidden", render: (w) => <span className="text-muted-foreground">{w.last_run ? relative(w.last_run) : "Never"}</span> },
                  { key: "status", label: "Status", width: "7rem", render: (w) => (w.enabled ? <Badge variant="success">Enabled</Badge> : <Badge variant="secondary">Paused</Badge>) },
                ]}
              />
            </Card>
            <p className="text-xs text-muted-foreground">
              {rows.length === 1 ? "One workflow" : `${rows.length} workflows`}, each a trigger and a list of steps. A trigger is an event, like <code className="font-mono">{eventLabel("contact.created").toLowerCase().replace(" · ", ".")}</code>; the workspace runs every enabled workflow whose trigger matches.
            </p>
          </>
        )}
      </ListState>
    </WorkspaceFrame>
  );
}
