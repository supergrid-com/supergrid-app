import { CircleCheckIcon, CircleXIcon, Loader2Icon, PlusIcon, TimerIcon } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { toastManager } from "~/components/ui/toast";
import { IconButton } from "~/components/workspace/frame";
import { useD1Target } from "~/lib/db";
import { newBlock, newId, saveReport, type Report } from "~/lib/reports";
import type { RunStatus } from "@supergrid/app-kit/rpc";
import { emptyDefinition, saveWorkflow } from "~/lib/workflows";
import { clean } from "~/lib/workspaces";
import { useShell } from "~/shell/context";

// What the Workflows pages share: the two + buttons the sub panel carries (a new workflow, a new
// report), the dialog they open, and the run status badge.

/** A dialog that asks for one name and makes the thing. */
export function NewNameDialog({ open, onOpenChange, title, description, placeholder, submitLabel, onCreate }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string; placeholder: string; submitLabel: string; onCreate: (name: string) => Promise<void> }): React.ReactElement {
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    try {
      await onCreate(n);
      setName("");
      onOpenChange(false);
    } catch (err) {
      toastManager.add({ title: `${title} Failed`, description: clean(err), type: "error" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md">
        {/* contents: the header, panel and footer stay the popup's own flex children, which the panel's scroll area sizes against */}
        <form onSubmit={(e) => void submit(e)} className="contents">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} aria-label="Name" />
          </DialogPanel>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()} loading={busy}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}

/** Makes a workflow with the name and opens its editor. `children` is the trigger; absent, a + icon. */
export function NewWorkflowButton({ children }: { children?: (open: () => void) => React.ReactNode }): React.ReactElement {
  const { ws } = useShell();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const create = async (name: string) => {
    const wf = await saveWorkflow(ws.id, { name, definition: emptyDefinition(), enabled: true });
    navigate(`/w/${ws.id}/workflows/${wf.id}`);
  };
  return (
    <>
      {children ? (
        children(() => setOpen(true))
      ) : (
        <IconButton label="New Workflow" onClick={() => setOpen(true)}>
          <PlusIcon />
        </IconButton>
      )}
      <NewNameDialog open={open} onOpenChange={setOpen} title="New Workflow" description="It starts empty: pick the event that triggers it and add the requests it sends." placeholder="Workflow name, like Mailchimp Sync" submitLabel="Create Workflow" onCreate={create} />
    </>
  );
}

/** Makes a report with one number block and opens it. */
export function NewReportButton({ children }: { children?: (open: () => void) => React.ReactNode }): React.ReactElement {
  const { ws } = useShell();
  const target = useD1Target();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const create = async (name: string) => {
    if (!target) throw new Error("Reports need a cloud workspace.");
    const report: Report = { id: newId(), name, blocks: [{ ...newBlock("contacts"), title: "Contacts" }], created_at: "", updated_at: "" };
    const saved = await saveReport(target, report);
    navigate(`/w/${ws.id}/workflows/reports/${saved.id}`);
  };
  return (
    <>
      {children ? (
        children(() => setOpen(true))
      ) : (
        <IconButton label="New Report" onClick={() => setOpen(true)}>
          <PlusIcon />
        </IconButton>
      )}
      <NewNameDialog open={open} onOpenChange={setOpen} title="New Report" description="A page of blocks, each a saved query shown as a number, a table or a chart." placeholder="Report name, like Weekly Signups" submitLabel="Create Report" onCreate={create} />
    </>
  );
}

const statusMeta: Record<RunStatus, { label: string; variant: "success" | "error" | "info" | "secondary"; icon: React.ReactElement }> = {
  completed: { label: "Completed", variant: "success", icon: <CircleCheckIcon /> },
  failed: { label: "Failed", variant: "error", icon: <CircleXIcon /> },
  running: { label: "Running", variant: "info", icon: <Loader2Icon className="animate-spin" /> },
  queued: { label: "Queued", variant: "secondary", icon: <TimerIcon /> },
};

export function RunStatusBadge({ status }: { status: RunStatus | string }): React.ReactElement {
  const m = statusMeta[status as RunStatus] ?? { label: status, variant: "secondary" as const, icon: <TimerIcon /> };
  return (
    <Badge variant={m.variant} className="gap-1 px-1.5">
      {m.icon}
      {m.label}
    </Badge>
  );
}

/** A tag on a page whose data is made up until the real source is wired. */
export function MockBadge(): React.ReactElement {
  return (
    <Badge variant="warning" size="sm">
      Mock
    </Badge>
  );
}

/** "1.2s", "340ms", or "" while a run has not finished. */
export function duration(started: string, finished: string | null): string {
  if (!finished) return "";
  const ms = Date.parse(finished) - Date.parse(started);
  if (!Number.isFinite(ms) || ms < 0) return "";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60_000)} min`;
}
