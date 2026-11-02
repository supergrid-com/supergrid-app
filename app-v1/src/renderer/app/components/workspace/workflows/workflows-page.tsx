import type { Workflow } from "@supergrid/app-kit/rpc";
import { PlusIcon, WorkflowIcon } from "lucide-react";
import * as React from "react";
import { absolute, relative } from "~/components/workspace/contacts/util";
import { Card, DataTable, type DataColumn, WorkspaceFrame } from "~/components/workspace/frame";
import { QueryState } from "~/components/workspace/query-states";
import { describeWhen } from "~/components/workspace/when-editor";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Switch } from "~/components/ui/switch";
import type { Workspace } from "~/lib/mock";
import { useWorkspacePage } from "~/lib/workspace-page";
import { setData, useWsMutation, useWsQuery } from "~/lib/ws-query";

// The workflows index: one row each, with the switch that turns its trigger on and off.

type PageProps = { ws: Workspace; onOpenNav: () => void };

export function WorkflowsPage({ ws, onOpenNav }: PageProps): React.ReactElement {
  const { go } = useWorkspacePage();
  const list = useWsQuery(ws.id, "listWorkflows", [], { tags: ["workflows"] });
  const toggle = useWsMutation(ws.id, "saveWorkflow", {
    invalidates: ["workflows", "hooks", "listWorkflows", "listHooks"],
    title: "Could not change the workflow",
    optimistic: (input) => {
      const flip = (on: boolean) => setData(ws.id, "listWorkflows", null, (old) => old.map((w) => (w.id === input.id ? { ...w, enabled: on } : w)));
      flip(!!input.enabled);
      return () => flip(!input.enabled);
    },
  });
  const columns = React.useMemo<DataColumn<Workflow>[]>(
    () => [
      { key: "name", label: "Workflow", render: (w) => <span className="font-medium">{w.name}</span> },
      {
        key: "trigger",
        label: "Trigger",
        render: (w) =>
          w.definition.trigger ? (
            <span className="flex min-w-0 flex-col">
              <span className="font-mono text-xs">{w.definition.trigger.event}</span>
              {w.definition.trigger.when?.length ? <span className="truncate text-[11px] text-muted-foreground">{describeWhen(w.definition.trigger.when)}</span> : null}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">manual</span>
          ),
      },
      { key: "steps", label: "Steps", width: "4.5rem", align: "end", className: "max-sm:hidden", render: (w) => <span className="tabular-nums">{w.definition.steps.length}</span> },
      { key: "runs", label: "Runs", width: "5rem", align: "end", render: (w) => <span className="tabular-nums">{w.runs.toLocaleString()}</span> },
      { key: "last", label: "Last run", width: "7rem", className: "max-md:hidden", render: (w) => <span className="whitespace-nowrap text-xs text-muted-foreground" title={absolute(w.last_run)}>{w.last_run ? relative(w.last_run) : "never"}</span> },
      {
        key: "enabled",
        label: "Enabled",
        width: "5rem",
        align: "end",
        render: (w) => (
          <span className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Switch checked={w.enabled} aria-label={`${w.name} enabled`} onCheckedChange={(on) => void toggle.run({ id: w.id, name: w.name, definition: w.definition, enabled: on })} />
          </span>
        ),
      },
    ],
    [toggle],
  );
  return (
    <WorkspaceFrame
      icon={<WorkflowIcon />}
      title="Workflows"
      onOpenNav={onOpenNav}
      actions={
        <Button size="xs" onClick={() => go({ kind: "workflows", id: "new" })}>
          <PlusIcon />
          New workflow
        </Button>
      }
    >
      <Card padded={false}>
        <QueryState
          q={list}
          empty={
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <WorkflowIcon />
                </EmptyMedia>
                <EmptyTitle>No workflows yet</EmptyTitle>
                <EmptyDescription>A trigger and a few steps: tag a contact, call a webhook, wait a day.</EmptyDescription>
              </EmptyHeader>
              <Button size="xs" onClick={() => go({ kind: "workflows", id: "new" })}>
                <PlusIcon />
                New workflow
              </Button>
            </Empty>
          }
        >
          {(rows) => <DataTable<Workflow> columns={columns} rows={rows} rowKey={(w) => w.id} onRowClick={(w) => go({ kind: "workflows", id: w.id })} />}
        </QueryState>
      </Card>
    </WorkspaceFrame>
  );
}
