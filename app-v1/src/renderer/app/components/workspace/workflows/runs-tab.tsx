import type { HookRunRow } from "@supergrid/app-kit/rpc";
import { HistoryIcon } from "lucide-react";
import * as React from "react";
import { absolute, relative } from "~/components/workspace/contacts/util";
import { Card, DataTable, type DataColumn } from "~/components/workspace/frame";
import { QueryState } from "~/components/workspace/query-states";
import { duration, RunDetail, StatusBadge } from "~/components/workspace/workflows/run-dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import type { Workspace } from "~/lib/mock";
import { useWsQuery } from "~/lib/ws-query";

// A workflow's runs, newest first; a row opens to its steps.

export function RunsTab({ ws, workflowId, labels }: { ws: Workspace; workflowId: string; labels?: Map<string, string> }): React.ReactElement {
  const [open, setOpen] = React.useState<string | null>(null);
  const runs = useWsQuery(ws.id, "listRuns", [{ workflowId, limit: 50 }], { tags: ["runs"] });
  const columns = React.useMemo<DataColumn<HookRunRow>[]>(
    () => [
      { key: "status", label: "Status", width: "6rem", render: (r) => <StatusBadge status={r.status} /> },
      { key: "event", label: "Event", render: (r) => <span className="font-mono text-xs">{r.event_name}</span> },
      { key: "contact", label: "Contact", className: "max-sm:hidden", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.contact_id ?? "—"}</span> },
      { key: "version", label: "Version", width: "5rem", align: "end", className: "max-md:hidden", render: (r) => <span className="text-xs text-muted-foreground">{r.workflow_version != null ? `v${r.workflow_version}` : "—"}</span> },
      { key: "started", label: "Started", width: "7rem", render: (r) => <span className="whitespace-nowrap text-xs text-muted-foreground" title={absolute(r.started_at)}>{relative(r.started_at)}</span> },
      { key: "duration", label: "Duration", width: "5.5rem", align: "end", render: (r) => <span className="text-xs tabular-nums text-muted-foreground">{duration(r.started_at, r.finished_at)}</span> },
    ],
    [],
  );
  return (
    <Card padded={false}>
      <QueryState
        q={runs}
        empty={
          <Empty className="py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HistoryIcon />
              </EmptyMedia>
              <EmptyTitle>No runs yet</EmptyTitle>
              <EmptyDescription>Runs show up here when the trigger fires or you run a test.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      >
        {(rows) => <DataTable<HookRunRow> columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setOpen(open === r.id ? null : r.id)} expanded={open} renderExpanded={(r) => <RunDetail ws={ws} runId={r.id} labels={labels} />} />}
      </QueryState>
    </Card>
  );
}
