import type { Hook, HookAction, HookConfig, HookInput, HookRunRow, When } from "@supergrid/app-kit/rpc";
import { PencilIcon, PlusIcon, Trash2Icon, ZapIcon } from "lucide-react";
import * as React from "react";
import { ConfirmDialog } from "~/components/workspace/confirm-dialog";
import { FieldRow } from "~/components/workspace/contacts/fields-form";
import { absolute, relative } from "~/components/workspace/contacts/util";
import { EventCombobox } from "~/components/workspace/event-picker";
import { Card, DataTable, type DataColumn, IconButton, WorkspaceFrame } from "~/components/workspace/frame";
import { QueryState } from "~/components/workspace/query-states";
import { describeWhen, WhenList } from "~/components/workspace/when-editor";
import { duration, RunDetailsDialog, StatusBadge } from "~/components/workspace/workflows/run-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { SegmentedControl, SegmentedControlItem } from "~/components/ui/segmented-control";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Sheet, SheetClose, SheetDescription, SheetFooter, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "~/components/ui/sheet";
import { Switch } from "~/components/ui/switch";
import { toastManager } from "~/components/ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import type { Workspace } from "~/lib/mock";
import { useWorkspacePage } from "~/lib/workspace-page";
import { APP_ID, call } from "~/lib/ws-api";
import { invalidate, setData, useWsMutation, useWsQuery } from "~/lib/ws-query";

// Hooks: every "when this event happens, do that" in one table, whatever the action. Workflow
// hooks are managed by their workflow (the switch flips the workflow); app hooks come from a
// manifest and are read-only here.

type PageProps = { ws: Workspace; onOpenNav: () => void };
const METHODS = ["POST", "PUT", "PATCH", "GET", "DELETE"];

const hostOf = (url: string | undefined): string => {
  if (!url) return "…";
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

function summary(h: Hook, workflows: Map<string, string>): React.ReactNode {
  switch (h.action) {
    case "workflow":
      return (
        <>
          Run workflow <span className="font-medium">{workflows.get(h.config.workflowId ?? "") ?? h.config.workflowId ?? "?"}</span>
        </>
      );
    case "http":
      return (
        <>
          <span className="font-mono text-xs">{h.config.method ?? "POST"}</span> <span className="font-mono text-xs text-muted-foreground">{hostOf(h.config.url)}</span>
        </>
      );
    default:
      return (
        <>
          <span className="font-medium">{h.config.app ?? h.app_id ?? "app"}</span> handler
        </>
      );
  }
}

// ---- the sheet ----

type HeaderRow = { k: string; v: string };
const rowsOf = (headers: Record<string, string> | undefined): HeaderRow[] => Object.entries(headers ?? {}).map(([k, v]) => ({ k, v }));
const headersOf = (rows: HeaderRow[]): Record<string, string> | undefined => {
  const out: Record<string, string> = {};
  for (const r of rows) if (r.k.trim()) out[r.k.trim()] = r.v;
  return Object.keys(out).length ? out : undefined;
};

function HookSheet({ ws, open, onOpenChange, hook }: { ws: Workspace; open: boolean; onOpenChange: (open: boolean) => void; hook?: Hook }): React.ReactElement {
  const catalog = useWsQuery(ws.id, "hookCatalog", [], { tags: ["hooks", "workflows", "events"], enabled: open });
  const [name, setName] = React.useState("");
  const [event, setEvent] = React.useState("");
  const [action, setAction] = React.useState<HookAction>("workflow");
  const [workflowId, setWorkflowId] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [method, setMethod] = React.useState("POST");
  const [headers, setHeaders] = React.useState<HeaderRow[]>([]);
  const [secret, setSecret] = React.useState("");
  const [when, setWhen] = React.useState<When[]>([]);
  const [enabled, setEnabled] = React.useState(true);
  React.useEffect(() => {
    if (!open) return;
    setName(hook?.name ?? "");
    setEvent(hook?.event ?? "");
    setAction(hook?.action === "http" ? "http" : "workflow");
    setWorkflowId(hook?.config.workflowId ?? "");
    setUrl(hook?.config.url ?? "");
    setMethod(hook?.config.method ?? "POST");
    setHeaders(rowsOf(hook?.config.headers));
    setSecret(hook?.config.secret ?? "");
    setWhen(hook?.when ?? []);
    setEnabled(hook?.enabled ?? true);
  }, [open, hook]);
  const save = useWsMutation(ws.id, "saveHook", { invalidates: ["hooks", "listHooks", "hookCatalog"], title: "Hook did not save" });
  const workflows = catalog.data?.workflows ?? [];
  const valid = !!event.trim() && (action === "workflow" ? !!workflowId : /^https?:\/\//.test(url.trim())) && when.every((w) => w.field.trim());
  const submit = async () => {
    const config: HookConfig = action === "workflow" ? { workflowId } : { url: url.trim(), method, headers: headersOf(headers), secret: secret.trim() || undefined };
    const input: HookInput = { id: hook?.id, name: name.trim() || null, event: event.trim(), action, config, when: when.length ? when : null, enabled };
    const out = await save.run(APP_ID, input);
    if (out) {
      onOpenChange(false);
      toastManager.add({ title: hook ? "Hook saved" : "Hook registered", type: "success", timeout: 1500 });
    }
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPopup className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{hook ? "Edit hook" : "Register hook"}</SheetTitle>
          <SheetDescription>When the event happens and every condition holds, the action runs once per event.</SheetDescription>
        </SheetHeader>
        <SheetPanel>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) void submit();
            }}
          >
            <FieldRow label="Name" hint="Optional; shows in the runs log.">
              <Input size="sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Notify billing" />
            </FieldRow>
            <FieldRow label="Event">
              <EventCombobox names={catalog.data?.events ?? []} value={event} onChange={setEvent} autoFocus={!hook} />
            </FieldRow>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium">Action</span>
              <SegmentedControl size="sm" className="w-full *:flex-1">
                {(["workflow", "http"] as const).map((a) => (
                  <SegmentedControlItem key={a} role="radio" aria-checked={action === a} data-checked={action === a ? "" : undefined} onClick={() => setAction(a)}>
                    {a === "workflow" ? "Workflow" : "Webhook"}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
            </div>
            {action === "workflow" ? (
              <FieldRow label="Workflow" hint="A workflow with its own trigger already has a hook; pick one that runs by hand.">
                <Select items={workflows.map((w) => ({ value: w.id, label: w.name }))} value={workflowId} onValueChange={(v) => setWorkflowId(v ?? "")}>
                  <SelectTrigger size="sm">
                    <SelectValue placeholder={workflows.length ? "Pick a workflow" : "No workflows yet"} />
                  </SelectTrigger>
                  <SelectPopup>
                    {workflows.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </FieldRow>
            ) : (
              <>
                <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2">
                  <FieldRow label="Method">
                    <Select items={METHODS.map((m) => ({ value: m, label: m }))} value={method} onValueChange={(v) => setMethod(v ?? "POST")}>
                      <SelectTrigger size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </FieldRow>
                  <FieldRow label="URL">
                    <Input size="sm" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/hooks/supergrid" className="font-mono text-xs" />
                  </FieldRow>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium">Headers</span>
                  {headers.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Input size="sm" placeholder="x-token" value={r.k} onChange={(e) => setHeaders(headers.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))} className="w-2/5 font-mono text-xs" />
                      <Input size="sm" placeholder="value" value={r.v} onChange={(e) => setHeaders(headers.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))} className="min-w-0 flex-1 font-mono text-xs" />
                      <Button size="icon-xs" variant="ghost" aria-label="Remove header" className="text-muted-foreground" onClick={() => setHeaders(headers.filter((_, j) => j !== i))}>
                        <Trash2Icon />
                      </Button>
                    </div>
                  ))}
                  <div>
                    <Button size="xs" variant="ghost" className="text-muted-foreground" onClick={() => setHeaders([...headers, { k: "", v: "" }])}>
                      <PlusIcon />
                      Add header
                    </Button>
                  </div>
                </div>
                <FieldRow label="Signing secret" hint="Sent as x-sg-signature: an HMAC-SHA256 of the body.">
                  <Input size="sm" type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="whsec_…" className="font-mono text-xs" />
                </FieldRow>
              </>
            )}
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium">Only when</span>
              <WhenList value={when} onChange={setWhen} />
            </div>
            <label className="flex items-center justify-between gap-3 text-[13px]">
              <span className="font-medium">Enabled</span>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </label>
          </form>
        </SheetPanel>
        <SheetFooter>
          <SheetClose render={<Button variant="ghost" />}>Cancel</SheetClose>
          <Button disabled={!valid} loading={save.pending} onClick={() => void submit()}>
            {hook ? "Save" : "Register"}
          </Button>
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  );
}

// ---- recent runs ----

function RecentRuns({ ws, hooks }: { ws: Workspace; hooks: Hook[] }): React.ReactElement {
  const [open, setOpen] = React.useState<string | null>(null);
  const runs = useWsQuery(ws.id, "listRuns", [{ limit: 20 }], { tags: ["runs"] });
  const byId = React.useMemo(() => new Map(hooks.map((h) => [h.id, h])), [hooks]);
  const columns = React.useMemo<DataColumn<HookRunRow>[]>(
    () => [
      { key: "status", label: "Status", width: "6rem", render: (r) => <StatusBadge status={r.status} /> },
      { key: "hook", label: "Hook", render: (r) => <span className="font-medium">{byId.get(r.hook_id)?.name || r.hook_id}</span> },
      { key: "event", label: "Event", render: (r) => <span className="font-mono text-xs">{r.event_name}</span> },
      { key: "started", label: "Started", width: "7rem", render: (r) => <span className="whitespace-nowrap text-xs text-muted-foreground" title={absolute(r.started_at)}>{relative(r.started_at)}</span> },
      { key: "duration", label: "Duration", width: "5.5rem", align: "end", className: "max-sm:hidden", render: (r) => <span className="text-xs tabular-nums text-muted-foreground">{duration(r.started_at, r.finished_at)}</span> },
    ],
    [byId],
  );
  return (
    <Card title="Recent runs" description="The last 20 across every hook." padded={false}>
      <QueryState q={runs} empty={<div className="px-4 pb-4 text-xs text-muted-foreground">Nothing has fired yet.</div>}>
        {(rows) => <DataTable<HookRunRow> columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setOpen(r.id)} />}
      </QueryState>
      <RunDetailsDialog ws={ws} runId={open} onOpenChange={(o) => !o && setOpen(null)} />
    </Card>
  );
}

// ---- the page ----

export function HooksPage({ ws, onOpenNav }: PageProps): React.ReactElement {
  const { go } = useWorkspacePage();
  const hooks = useWsQuery(ws.id, "listHooks", [], { tags: ["hooks"] });
  const catalog = useWsQuery(ws.id, "hookCatalog", [], { tags: ["hooks", "workflows", "events"] });
  const [editing, setEditing] = React.useState<Hook | null | undefined>(undefined);
  const [removing, setRemoving] = React.useState<Hook | null>(null);
  const workflowNames = React.useMemo(() => new Map((catalog.data?.workflows ?? []).map((w) => [w.id, w.name])), [catalog.data]);
  const flip = React.useCallback((id: string, on: boolean) => setData(ws.id, "listHooks", null, (old) => old.map((h) => (h.id === id ? { ...h, enabled: on } : h))), [ws.id]);
  const toggle = useWsMutation(ws.id, "saveHook", {
    invalidates: ["hooks", "listHooks"],
    title: "Could not change the hook",
    optimistic: (_app, input) => {
      flip(input.id!, !!input.enabled);
      return () => flip(input.id!, !input.enabled);
    },
  });
  // a `wf:` hook mirrors its workflow's flag, so the workflow is what gets saved
  const toggleWorkflow = async (h: Hook, on: boolean) => {
    const id = h.config.workflowId ?? h.id.replace(/^wf:/, "");
    flip(h.id, on);
    try {
      const wf = await call(ws.id, "getWorkflow", id);
      if (!wf) throw new Error(`No workflow ${id}`);
      await call(ws.id, "saveWorkflow", { id: wf.id, name: wf.name, definition: wf.definition, enabled: on });
      invalidate(ws.id, "hooks", "listHooks", "workflows", "listWorkflows");
    } catch (e) {
      flip(h.id, !on);
      toastManager.add({ title: "Could not change the workflow", description: String((e as Error)?.message ?? e), type: "error" });
    }
  };
  const remove = useWsMutation(ws.id, "removeHook", { invalidates: ["hooks", "listHooks", "hookCatalog"], title: "Hook was not removed" });

  const columns = React.useMemo<DataColumn<Hook>[]>(
    () => [
      {
        key: "event",
        label: "Event",
        render: (h) => (
          <span className="flex min-w-0 flex-col">
            <span className="font-mono text-xs">{h.event}</span>
            {h.name && <span className="truncate text-[11px] text-muted-foreground">{h.name}</span>}
          </span>
        ),
      },
      { key: "action", label: "Action", render: (h) => <span className="text-[13px]">{summary(h, workflowNames)}</span> },
      { key: "app", label: "App", width: "6rem", className: "max-sm:hidden", render: (h) => (h.app_id && h.app_id !== APP_ID ? <Badge variant="outline" size="sm">{h.app_id}</Badge> : null) },
      {
        key: "when",
        label: "Conditions",
        width: "7rem",
        className: "max-md:hidden",
        render: (h) =>
          h.when?.length ? (
            <Tooltip>
              <TooltipTrigger render={<span className="cursor-default text-xs text-muted-foreground underline decoration-dotted underline-offset-2" />}>
                {h.when.length} condition{h.when.length === 1 ? "" : "s"}
              </TooltipTrigger>
              <TooltipPopup className="max-w-xs font-mono text-[11px]">{describeWhen(h.when)}</TooltipPopup>
            </Tooltip>
          ) : (
            <span className="text-xs text-muted-foreground/60">always</span>
          ),
      },
      {
        key: "enabled",
        label: "Enabled",
        width: "5rem",
        align: "end",
        render: (h) => {
          if (h.readonly || h.action === "app") return <span className="flex justify-end text-[11px] text-muted-foreground">defined by {h.app_id ?? h.config.app ?? "an app"}</span>;
          const sw = <Switch checked={h.enabled} aria-label={`${h.name ?? h.event} enabled`} onCheckedChange={(on) => void (h.action === "workflow" && h.id.startsWith("wf:") ? toggleWorkflow(h, on) : toggle.run(APP_ID, { id: h.id, name: h.name, event: h.event, action: h.action, config: h.config, when: h.when, enabled: on }))} />;
          return (
            <span className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              {h.id.startsWith("wf:") ? (
                <Tooltip>
                  <TooltipTrigger render={<span />}>{sw}</TooltipTrigger>
                  <TooltipPopup>Managed by its workflow; this flips the workflow too.</TooltipPopup>
                </Tooltip>
              ) : (
                sw
              )}
            </span>
          );
        },
      },
      {
        key: "actions",
        label: "",
        width: "4.5rem",
        align: "end",
        render: (h) =>
          h.readonly || h.action === "app" ? null : (
            <span className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
              {h.id.startsWith("wf:") ? (
                <IconButton label="Open workflow" onClick={() => go({ kind: "workflows", id: h.config.workflowId ?? h.id.slice(3) })}>
                  <PencilIcon />
                </IconButton>
              ) : (
                <>
                  <IconButton label="Edit hook" onClick={() => setEditing(h)}>
                    <PencilIcon />
                  </IconButton>
                  <IconButton label="Delete hook" onClick={() => setRemoving(h)} className="hover:text-destructive-foreground">
                    <Trash2Icon />
                  </IconButton>
                </>
              )}
            </span>
          ),
      },
    ],
    [workflowNames, toggle, go],
  );

  return (
    <WorkspaceFrame
      icon={<ZapIcon />}
      title="Hooks"
      onOpenNav={onOpenNav}
      actions={
        <Button size="xs" onClick={() => setEditing(null)}>
          <PlusIcon />
          Register hook
        </Button>
      }
    >
      <Card padded={false}>
        <QueryState
          q={hooks}
          empty={
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ZapIcon />
                </EmptyMedia>
                <EmptyTitle>No hooks yet</EmptyTitle>
                <EmptyDescription>Point an event at a workflow or a webhook. Workflows with a trigger show up here on their own.</EmptyDescription>
              </EmptyHeader>
              <Button size="xs" onClick={() => setEditing(null)}>
                <PlusIcon />
                Register hook
              </Button>
            </Empty>
          }
        >
          {(rows) => <DataTable<Hook> columns={columns} rows={rows} rowKey={(h) => h.id} />}
        </QueryState>
      </Card>
      <RecentRuns ws={ws} hooks={hooks.data ?? []} />
      <div className="h-6" />
      <HookSheet ws={ws} open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)} hook={editing ?? undefined} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Delete ${removing?.name || removing?.event || "this hook"}?`}
        description="It stops firing at once. Past runs stay in the log."
        pending={remove.pending}
        onConfirm={() => {
          if (!removing) return;
          void remove.run(removing.id).then((out) => {
            if (out !== null) setRemoving(null);
          });
        }}
      />
    </WorkspaceFrame>
  );
}
