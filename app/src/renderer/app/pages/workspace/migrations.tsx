import { CheckIcon, ListOrderedIcon, PackageIcon, RefreshCwIcon } from "lucide-react";
import * as React from "react";
import { formatDateTime } from "~/components/data-grid/cells";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Card, Crumbs, WorkspaceFrame } from "~/components/workspace/frame";
import { type LedgerRow, readLedger, useD1Target, useSchema } from "~/lib/db";
import { useOpenNav, useShell } from "~/shell/context";

// What has been applied to the database, from the workspace's own ledger (migrations_ledger):
// the workspace release's core migrations under "core", then each app's under its id, in the
// order they ran. Migrations are forward only and run when the workspace or an app first runs a
// new version; nothing here applies one by hand, so the page is a record, not a control.

export function Migrations(): React.ReactElement {
  const { ws } = useShell();
  const onOpenNav = useOpenNav();
  const target = useD1Target();
  const { tables } = useSchema(target);
  const [rows, setRows] = React.useState<LedgerRow[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const load = React.useCallback(() => {
    if (!target) return;
    setLoading(true);
    readLedger(target)
      .then((r) => {
        setRows(r);
        setError(null);
      })
      .catch((e) => setError(String((e as Error).message ?? e)))
      .finally(() => setLoading(false));
  }, [target]);
  React.useEffect(load, [load]);

  const title = <Crumbs items={["Database", "Migrations"]} />;
  const icon = <ListOrderedIcon />;
  if (!target) {
    return (
      <WorkspaceFrame icon={icon} title={title} onOpenNav={onOpenNav}>
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">{icon}</EmptyMedia>
            <EmptyTitle>No Cloud Database</EmptyTitle>
            <EmptyDescription>The local dev workspace keeps its ledger on disk.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </WorkspaceFrame>
    );
  }

  // grouped by who applied them: core first, then apps in the order they were installed
  const groups = React.useMemo(() => {
    const by = new Map<string, LedgerRow[]>();
    for (const r of rows ?? []) by.set(r.app_id, [...(by.get(r.app_id) ?? []), r]);
    return [...by.entries()].sort((a, b) => (a[0] === "core" ? -1 : b[0] === "core" ? 1 : 0));
  }, [rows]);
  const appName = (id: string) => ws.apps.find((a) => a.app === id)?.name ?? id;
  const tablesOf = (id: string) => (tables ?? []).filter((t) => (id === "core" ? t.group === "core" || t.group === "system" : t.app === id)).length;

  return (
    <WorkspaceFrame icon={icon} title={title} onOpenNav={onOpenNav}>
      <div className="-mb-2 flex items-center justify-end">
        <Button size="xs" variant="ghost" onClick={load} disabled={loading} className="text-foreground/70 hover:text-foreground">
          <RefreshCwIcon className={loading ? "animate-spin" : undefined} />
          Reload
        </Button>
      </div>
      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/6 px-3 py-2 text-[13px] text-destructive-foreground">{error}</p>}
      {rows && rows.length === 0 && !error && (
        <Empty className="py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">{icon}</EmptyMedia>
            <EmptyTitle>Nothing Applied Yet</EmptyTitle>
            <EmptyDescription>The workspace writes its ledger the first time it runs. Open its site once and reload.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {groups.map(([app, list]) => (
        <Card
          key={app}
          title={
            <span className="flex items-center gap-2">
              {app === "core" ? ws.name : appName(app)}
              <Badge size="sm" variant="outline" className="font-mono font-normal">
                {app}
              </Badge>
            </span>
          }
          description={`${list.length} ${list.length === 1 ? "migration" : "migrations"}, ${tablesOf(app)} ${tablesOf(app) === 1 ? "table" : "tables"}${app === "core" ? `, workspace ${ws.version ?? "unknown"}` : ""}`}
          actions={app !== "core" ? <PackageIcon className="size-4 text-muted-foreground" /> : undefined}
          padded={false}
        >
          <ol className="flex flex-col border-t">
            {list.map((m, i) => (
              <li key={m.name} className="flex items-center gap-3 px-4 py-2.5 text-[13px] not-last:border-b">
                <span className="w-6 shrink-0 text-end text-[11px] tabular-nums text-muted-foreground/60">{i + 1}</span>
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success/12 text-success-foreground">
                  <CheckIcon className="size-3" strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{m.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatDateTime(m.applied_at)}</span>
              </li>
            ))}
          </ol>
        </Card>
      ))}
      {rows && rows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Migrations run on their own: the workspace's when a new release starts, an app's when it is installed or updated. Each runs once, in order, and is never undone. To change a custom table, use the table itself or the Query page.
        </p>
      )}
    </WorkspaceFrame>
  );
}
