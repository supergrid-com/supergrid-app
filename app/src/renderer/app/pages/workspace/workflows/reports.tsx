import { ChartColumnIcon, ChartLineIcon, ChevronDownIcon, HashIcon, PencilIcon, PlusIcon, RefreshCwIcon, SaveIcon, TableIcon, Trash2Icon, XIcon } from "lucide-react";
import * as React from "react";
import { QueryBuilder, type Field as QbField, type RuleGroupType } from "react-querybuilder";
import { useNavigate } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "~/components/ui/menu";
import { SegmentedControl, SegmentedControlItem } from "~/components/ui/segmented-control";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "~/components/ui/sheet";
import { Textarea } from "~/components/ui/textarea";
import { toastManager } from "~/components/ui/toast";
import { Card, Crumbs, DataTable, WorkspaceFrame } from "~/components/workspace/frame";
import { ConfirmDialog, Field, ListState, relative } from "~/components/workspace/library/shared";
import { type DbTable, tableLabel, useD1Target, useSchema } from "~/lib/db";
import { type BlockKind, type BlockResult, kindLabels, type Metric, metricLabels, newBlock, removeReport, type Report, type ReportBlock, runBlock, saveReport, useReports } from "~/lib/reports";
import { Bars, formatNumber, Line } from "~/components/charts";
import { cn } from "~/lib/utils";
import { clean } from "~/lib/workspaces";
import { useOpenNav, useShell } from "~/shell/context";
import { NewReportButton } from "./shared";

// Reports: a simple dashboard builder. A report is a page of blocks; each block is a query over
// one table (built with react-querybuilder, run as a parameterized WHERE through the D1 API) shown
// as a number, a table, a bar chart or a line chart. Blocks are edited in a sheet beside the page.

const kindIcons: Record<BlockKind, React.ReactElement> = { number: <HashIcon />, table: <TableIcon />, bar: <ChartColumnIcon />, line: <ChartLineIcon /> };
const KINDS = Object.keys(kindLabels) as BlockKind[];

// ---- the index ----

export function ReportsIndex(): React.ReactElement {
  const { ws } = useShell();
  const onOpenNav = useOpenNav();
  const navigate = useNavigate();
  const target = useD1Target();
  const reports = useReports(target);
  const action = (
    <NewReportButton>
      {(open) => (
        <Button size="xs" onClick={open}>
          <PlusIcon />
          New Report
        </Button>
      )}
    </NewReportButton>
  );
  return (
    <WorkspaceFrame icon={<ChartColumnIcon />} title={<Crumbs items={["Workflows", "Reports"]} />} actions={action} onOpenNav={onOpenNav}>
      {!target ? (
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ChartColumnIcon />
            </EmptyMedia>
            <EmptyTitle>No Cloud Database</EmptyTitle>
            <EmptyDescription>Reports read the workspace's D1. The local dev workspace keeps its database on disk.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ListState
          data={reports.data}
          error={reports.error}
          loading={reports.loading}
          onRetry={() => void reports.refresh()}
          isEmpty={(d) => d.length === 0}
          empty={
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ChartColumnIcon />
                </EmptyMedia>
                <EmptyTitle>No Reports Yet</EmptyTitle>
                <EmptyDescription>A report is a page of blocks: a count of contacts, a table of the newest events, a chart of signups by day. Each block is a query you build and save.</EmptyDescription>
              </EmptyHeader>
              {action}
            </Empty>
          }
        >
          {(rows) => (
            <Card padded={false}>
              <DataTable<Report>
                rows={rows}
                rowKey={(r) => r.id}
                onRowClick={(r) => navigate(`/w/${ws.id}/workflows/reports/${r.id}`)}
                columns={[
                  { key: "name", label: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
                  { key: "about", label: "Description", className: "max-sm:hidden", render: (r) => <span className="block max-w-96 truncate text-muted-foreground">{r.description ?? ""}</span> },
                  { key: "blocks", label: "Blocks", width: "6rem", align: "end", render: (r) => <span className="tabular-nums">{r.blocks.length}</span> },
                  { key: "updated", label: "Updated", width: "9rem", render: (r) => <span className="text-muted-foreground">{relative(r.updated_at)}</span> },
                ]}
              />
            </Card>
          )}
        </ListState>
      )}
    </WorkspaceFrame>
  );
}

// ---- one report ----

const sameReport = (a: Report, b: Report) => JSON.stringify({ ...a, updated_at: 0 }) === JSON.stringify({ ...b, updated_at: 0 });

export function ReportPage({ id }: { id: string }): React.ReactElement {
  const { ws } = useShell();
  const onOpenNav = useOpenNav();
  const navigate = useNavigate();
  const target = useD1Target();
  const reports = useReports(target);
  const { tables } = useSchema(target);
  const saved = reports.data?.find((r) => r.id === id) ?? null;
  const [draft, setDraft] = React.useState<Report | null>(null);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [version, setVersion] = React.useState(0);
  const dirty = !!draft && !!saved && !sameReport(draft, saved);
  const dirtyRef = React.useRef(false);
  dirtyRef.current = dirty;
  React.useEffect(() => {
    if (saved) setDraft((d) => (d && dirtyRef.current ? d : saved));
  }, [saved?.id, saved?.updated_at]);
  const patch = (fn: (r: Report) => Report) => setDraft((r) => (r ? fn(r) : r));
  const patchBlock = (bid: string, fn: (b: ReportBlock) => ReportBlock) => patch((r) => ({ ...r, blocks: r.blocks.map((b) => (b.id === bid ? fn(b) : b)) }));
  const usable = (tables ?? []).filter((t) => !t.virtual);
  const add = (kind: BlockKind) => {
    const table = usable.find((t) => t.name === "contacts")?.name ?? usable[0]?.name ?? "contacts";
    const b = newBlock(table, kind);
    patch((r) => ({ ...r, blocks: [...r.blocks, b] }));
    setEditing(b.id);
  };
  const save = async () => {
    if (!draft || !target) return;
    setSaving(true);
    try {
      await saveReport(target, draft);
      toastManager.add({ title: "Report Saved", type: "success", timeout: 1500 });
    } catch (e) {
      toastManager.add({ title: "Report Did Not Save", description: clean(e), type: "error" });
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!target) return;
    try {
      await removeReport(target, id);
      navigate(`/w/${ws.id}/workflows/reports`);
    } catch (e) {
      toastManager.add({ title: "Report Was Not Deleted", description: clean(e), type: "error" });
    }
  };
  const editingBlock = draft?.blocks.find((b) => b.id === editing) ?? null;
  const actions = (
    <>
      <Menu>
        <MenuTrigger render={<Button size="xs" variant="outline" />}>
          <PlusIcon />
          Add Block
          <ChevronDownIcon />
        </MenuTrigger>
        <MenuPopup align="end" className="min-w-44">
          {KINDS.map((k) => (
            <MenuItem key={k} onClick={() => add(k)}>
              {kindIcons[k]}
              {kindLabels[k]}
            </MenuItem>
          ))}
        </MenuPopup>
      </Menu>
      <Button size="xs" disabled={!dirty} loading={saving} onClick={() => void save()}>
        <SaveIcon />
        Save
      </Button>
    </>
  );

  return (
    <WorkspaceFrame icon={<ChartColumnIcon />} title={<Crumbs items={["Reports", saved?.name ?? draft?.name ?? "…"]} />} actions={actions} width="wide" onOpenNav={onOpenNav}>
      <ListState
        data={reports.data ? (saved ? draft : undefined) : null}
        error={reports.error}
        loading={reports.loading}
        onRetry={() => void reports.refresh()}
        isEmpty={(d) => !d}
        empty={
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ChartColumnIcon />
              </EmptyMedia>
              <EmptyTitle>No Such Report</EmptyTitle>
              <EmptyDescription>There is no report {id} in this workspace.</EmptyDescription>
            </EmptyHeader>
            <Button size="sm" variant="outline" onClick={() => navigate(`/w/${ws.id}/workflows/reports`)}>
              All Reports
            </Button>
          </Empty>
        }
      >
        {(r) =>
          r && (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Input value={r.name} onChange={(e) => patch((x) => ({ ...x, name: e.target.value }))} aria-label="Report Name" className="max-w-md font-heading text-base font-semibold" />
                  <Input size="sm" value={r.description ?? ""} onChange={(e) => patch((x) => ({ ...x, description: e.target.value }))} placeholder="What this report is for" aria-label="Description" className="max-w-md" />
                </div>
                <Button size="xs" variant="ghost" onClick={() => setVersion((v) => v + 1)} className="text-foreground/70 hover:text-foreground">
                  <RefreshCwIcon />
                  Run Again
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setConfirm(true)} className="text-foreground/70 hover:text-destructive-foreground">
                  <Trash2Icon />
                  Delete
                </Button>
              </div>
              {r.blocks.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">No blocks yet. Add a number, a table or a chart.</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {r.blocks.map((b) => (
                    <BlockCard key={b.id} block={b} table={usable.find((t) => t.name === b.table)} version={version} onEdit={() => setEditing(b.id)} />
                  ))}
                </div>
              )}
              <BlockSheet block={editingBlock} tables={usable} onChange={(fn) => editingBlock && patchBlock(editingBlock.id, fn)} onRemove={() => { if (editingBlock) patch((x) => ({ ...x, blocks: x.blocks.filter((b) => b.id !== editingBlock.id) })); setEditing(null); }} onClose={() => setEditing(null)} />
              <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Delete ${r.name}?`} description="The report and its blocks go away. The data they read stays." onConfirm={() => void remove()} />
            </>
          )
        }
      </ListState>
    </WorkspaceFrame>
  );
}

// ---- a block on the page ----

function useBlockResult(block: ReportBlock, table: DbTable | undefined, version: number): { result: BlockResult | null; error: string | null; loading: boolean } {
  const target = useD1Target();
  const [state, setState] = React.useState<{ result: BlockResult | null; error: string | null; loading: boolean }>({ result: null, error: null, loading: true });
  const key = JSON.stringify(block);
  React.useEffect(() => {
    if (!target) return;
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    const t = setTimeout(() => {
      runBlock(target, block, table).then(
        (result) => live && setState({ result, error: null, loading: false }),
        (e) => live && setState((s) => ({ ...s, error: String((e as Error).message ?? e), loading: false })),
      );
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, key, table?.name, version]);
  return state;
}

function BlockCard({ block, table, version, onEdit }: { block: ReportBlock; table: DbTable | undefined; version: number; onEdit: () => void }): React.ReactElement {
  const { result, error, loading } = useBlockResult(block, table, version);
  const summary = `${block.kind === "table" ? "rows" : metricLabels[block.metric].toLowerCase()}${block.metric !== "count" && block.field ? ` of ${block.field}` : ""} · ${table ? tableLabel(table) : block.table}${block.query.rules.length ? ` · ${block.query.rules.length} ${block.query.rules.length === 1 ? "rule" : "rules"}` : ""}`;
  return (
    <Card
      className={cn(block.span === 2 && "md:col-span-2", loading && "opacity-80 transition-opacity")}
      title={
        <span className="flex items-center gap-2">
          <span className="flex size-4 items-center justify-center text-muted-foreground [&_svg]:size-4">{kindIcons[block.kind]}</span>
          {block.title || kindLabels[block.kind]}
        </span>
      }
      description={summary}
      actions={
        <Button size="icon-xs" variant="ghost" aria-label="Edit Block" onClick={onEdit} className="text-muted-foreground">
          <PencilIcon />
        </Button>
      }
    >
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/6 px-3 py-2 text-[13px] text-destructive-foreground">{error}</div>
      ) : !result ? (
        <div className="h-16 animate-pulse rounded-lg bg-muted/50" />
      ) : block.kind === "number" ? (
        <div className="flex items-baseline gap-2">
          <span className="font-heading text-3xl font-semibold tabular-nums">{result.value == null ? "–" : formatNumber(result.value)}</span>
          <span className="text-xs text-muted-foreground">{result.ms.toFixed(0)}ms</span>
        </div>
      ) : block.kind === "table" ? (
        <ResultTable rows={result.rows ?? []} columns={result.columns ?? []} />
      ) : block.kind === "bar" ? (
        <Bars points={result.points ?? []} />
      ) : (
        <Line points={result.points ?? []} />
      )}
    </Card>
  );
}

function ResultTable({ rows, columns }: { rows: Record<string, unknown>[]; columns: string[] }): React.ReactElement {
  const cols = columns.slice(0, 6);
  if (!rows.length) return <div className="py-4 text-center text-sm text-muted-foreground">No rows</div>;
  return (
    <div className="-mx-4 -mb-4 overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-y bg-muted/30 text-xs text-muted-foreground">
            {cols.map((c) => (
              <th key={c} className="px-3 py-1.5 text-left font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              {cols.map((c) => (
                <td key={c} className="max-w-56 truncate px-3 py-1.5 font-mono text-xs" title={String(r[c] ?? "")}>
                  {r[c] == null ? <span className="text-muted-foreground">null</span> : typeof r[c] === "object" ? JSON.stringify(r[c]) : String(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- the block editor ----

const OPS = [
  { name: "=", label: "is" },
  { name: "!=", label: "is not" },
  { name: "contains", label: "contains" },
  { name: "beginsWith", label: "starts with" },
  { name: "endsWith", label: "ends with" },
  { name: ">", label: "greater than" },
  { name: ">=", label: "at least" },
  { name: "<", label: "less than" },
  { name: "<=", label: "at most" },
  { name: "in", label: "is one of" },
  { name: "null", label: "is empty" },
  { name: "notNull", label: "is not empty" },
];
const control = "h-7 min-w-0 rounded-md border border-input bg-background px-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/24";
const action = "h-7 cursor-pointer rounded-md border border-input bg-background px-2 text-xs hover:bg-accent";
const classnames = { queryBuilder: "sg-qb", ruleGroup: "ruleGroup", header: "ruleGroup-header", body: "ruleGroup-body", rule: "rule", combinators: control, fields: control, operators: control, value: cn(control, "flex-1"), addRule: action, addGroup: action, removeRule: cn(action, "w-7 px-0 text-muted-foreground"), removeGroup: cn(action, "w-7 px-0 text-muted-foreground") };

function BlockSheet({ block, tables, onChange, onRemove, onClose }: { block: ReportBlock | null; tables: DbTable[]; onChange: (fn: (b: ReportBlock) => ReportBlock) => void; onRemove: () => void; onClose: () => void }): React.ReactElement {
  const table = tables.find((t) => t.name === block?.table);
  const columns = table?.columns ?? [];
  const numeric = columns.filter((c) => c.field.type === "number");
  const dates = columns.filter((c) => c.field.type === "datetime");
  const fields: QbField[] = columns.map((c) => ({ name: c.name, label: c.name, inputType: c.field.type === "number" ? "number" : "text" }));
  const set = (patch: Partial<ReportBlock>) => onChange((b) => ({ ...b, ...patch }));
  return (
    <Sheet open={!!block} onOpenChange={(o) => !o && onClose()}>
      <SheetPopup side="right" showCloseButton={false} className="max-w-lg">
        <div className="flex h-11 shrink-0 items-center gap-1 border-b px-2">
          <Button size="icon-xs" variant="ghost" aria-label="Close" onClick={onClose}>
            <XIcon />
          </Button>
          <span className="ms-1 text-xs text-muted-foreground">Block</span>
          <div className="flex-1" />
          <Button size="xs" variant="ghost" onClick={onRemove} className="text-muted-foreground hover:text-destructive-foreground">
            <Trash2Icon />
            Remove
          </Button>
        </div>
        {block && (
          <>
            <SheetHeader className="pb-2">
              <SheetTitle className="truncate text-lg">{block.title || kindLabels[block.kind]}</SheetTitle>
              <SheetDescription>Changes show on the page as you make them. Save the report to keep them.</SheetDescription>
            </SheetHeader>
            <SheetPanel className="flex flex-col gap-4 pt-2">
              <Field label="Title">
                <Input value={block.title} onChange={(e) => set({ title: e.target.value })} />
              </Field>
              <Field label="Show As">
                <SegmentedControl size="sm" className="w-full">
                  {KINDS.map((k) => (
                    <SegmentedControlItem key={k} data-active={block.kind === k || undefined} aria-pressed={block.kind === k} onClick={() => set({ kind: k, span: k === "number" ? block.span : 2 })} className={cn("flex-1 gap-1.5", block.kind === k && "bg-background text-foreground shadow-xs")}>
                      {kindIcons[k]}
                      {kindLabels[k]}
                    </SegmentedControlItem>
                  ))}
                </SegmentedControl>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Table">
                  <Select value={block.table} onValueChange={(v) => set({ table: String(v), query: { combinator: "and", rules: [] }, field: undefined, groupBy: undefined })} items={tables.map((t) => ({ value: t.name, label: tableLabel(t) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup>
                      {tables.map((t) => (
                        <SelectItem key={t.name} value={t.name}>
                          {tableLabel(t)}
                          <span className="ms-auto ps-3 font-mono text-[11px] text-muted-foreground">{t.name}</span>
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </Field>
                <Field label="Width">
                  <Select value={String(block.span ?? 1)} onValueChange={(v) => set({ span: v === "2" ? 2 : 1 })} items={[{ value: "1", label: "Half" }, { value: "2", label: "Full" }]}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup>
                      <SelectItem value="1">Half</SelectItem>
                      <SelectItem value="2">Full</SelectItem>
                    </SelectPopup>
                  </Select>
                </Field>
                {block.kind !== "table" && (
                  <Field label="Measure">
                    <Select value={block.metric} onValueChange={(v) => set({ metric: v as Metric, field: v === "count" ? undefined : (block.field ?? numeric[0]?.name) })} items={(Object.keys(metricLabels) as Metric[]).map((m) => ({ value: m, label: metricLabels[m] }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {(Object.keys(metricLabels) as Metric[]).map((m) => (
                          <SelectItem key={m} value={m} disabled={m !== "count" && numeric.length === 0}>
                            {metricLabels[m]}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </Field>
                )}
                {block.kind !== "table" && block.metric !== "count" && (
                  <Field label="Of Column">
                    <ColumnSelect value={block.field ?? ""} onChange={(v) => set({ field: v })} columns={numeric.map((c) => c.name)} />
                  </Field>
                )}
                {block.kind === "bar" && (
                  <Field label="Bars By">
                    <ColumnSelect value={block.groupBy ?? ""} onChange={(v) => set({ groupBy: v })} columns={columns.map((c) => c.name)} />
                  </Field>
                )}
                {block.kind === "line" && (
                  <Field label="By Day Of" hint={dates.length ? undefined : "No date column on this table"}>
                    <ColumnSelect value={block.groupBy ?? ""} onChange={(v) => set({ groupBy: v })} columns={(dates.length ? dates : columns).map((c) => c.name)} />
                  </Field>
                )}
                {(block.kind === "table" || block.kind === "bar") && (
                  <Field label={block.kind === "table" ? "Rows" : "Bars"}>
                    <Input type="number" min={1} max={block.kind === "table" ? 500 : 24} value={block.limit ?? 10} onChange={(e) => set({ limit: Math.max(1, Number(e.target.value) || 1) })} />
                  </Field>
                )}
              </div>
              <Field label="Only Rows Where" hint={fields.length ? "Every rule must hold; a group can switch to any." : "Pick a table first."}>
                {fields.length > 0 && (
                  <QueryBuilder fields={fields} query={block.query} onQueryChange={(q: RuleGroupType) => set({ query: q })} getOperators={() => OPS} controlClassnames={classnames} translations={{ addRule: { label: "Add Rule" }, addGroup: { label: "Add Group" }, removeRule: { label: "×" }, removeGroup: { label: "×" } }} />
                )}
              </Field>
              <Field label="Notes" hint="Shown nowhere yet; a place to say what the block is for.">
                <Textarea rows={2} value={(block as ReportBlock & { notes?: string }).notes ?? ""} onChange={(e) => onChange((b) => ({ ...b, notes: e.target.value }) as ReportBlock)} />
              </Field>
            </SheetPanel>
            <SheetFooter>
              <Badge variant="outline" className="me-auto font-normal">
                {table ? `${table.columns.length} columns` : "no table"}
              </Badge>
              <Button size="sm" onClick={onClose}>
                Done
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetPopup>
    </Sheet>
  );
}

function ColumnSelect({ value, onChange, columns }: { value: string; onChange: (v: string) => void; columns: string[] }): React.ReactElement {
  const items = columns.map((c) => ({ value: c, label: c }));
  return (
    <Select value={value} onValueChange={(v) => onChange(String(v))} items={items}>
      <SelectTrigger>
        <SelectValue placeholder="Pick a column" />
      </SelectTrigger>
      <SelectPopup>
        {columns.map((c) => (
          <SelectItem key={c} value={c}>
            <span className="font-mono text-xs">{c}</span>
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}
