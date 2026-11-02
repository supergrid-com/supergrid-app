import type { SecretMeta } from "@supergrid/app-kit/rpc";
import { KeyRoundIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import * as React from "react";
import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { toastManager } from "~/components/ui/toast";
import { QueryState } from "~/components/workspace/query-states";
import type { Workspace } from "~/lib/mock";
import { cn } from "~/lib/utils";
import { APP_ID } from "~/lib/ws-api";
import { useWsMutation, useWsQuery } from "~/lib/ws-query";

// A workspace's secrets: named values apps read with `getSecret`, and HTTP hooks and workflow steps use as
// `{{secrets.NAME}}`. Values are write-only. The list shows a hint; a value can be replaced but never read
// back. One list, shown on the Secrets page and in the Secrets section of settings.

export const SECRET_NAME = /^[A-Z][A-Z0-9_]{0,63}$/;
export const HOW_TO_USE = "Apps read them with getSecret; webhooks and HTTP steps write {{secrets.NAME}}. Values are write-only.";

const dateOf = (iso: string): string => iso.slice(0, 10);
/** What someone types becomes a name: upper case, anything else an underscore. */
const asName = (raw: string): string => raw.toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 64);

/** `{}` opens the dialog on a new secret, `{ name }` on replacing that one's value, null keeps it closed. */
type Target = { name?: string } | null;

export function SecretsList({ ws, className }: { ws: Workspace; className?: string }): React.ReactElement {
  const q = useWsQuery(ws.id, "listSecrets", []);
  const remove = useWsMutation(ws.id, "removeSecret", { invalidates: ["listSecrets"], title: "The secret was not removed" });
  const [editing, setEditing] = React.useState<Target>(null);
  const [removing, setRemoving] = React.useState<SecretMeta | null>(null);
  return (
    <div className={cn("flex flex-col", className)}>
      <QueryState q={q} empty={<div className="px-4 py-8 text-center text-[13px] text-muted-foreground">No secrets yet.</div>}>
        {(list) => (
          <ul className="divide-y">
            {list.map((s) => (
              <li key={s.name} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                <KeyRoundIcon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-mono text-xs font-medium">{s.name}</span>
                    {s.app_id && s.app_id !== APP_ID && (
                      <Badge variant="outline" size="sm">
                        {s.app_id}
                      </Badge>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {s.description ? `${s.description} · ` : ""}updated {dateOf(s.updated_at)}
                  </div>
                </div>
                <span className="font-mono text-xs text-muted-foreground max-sm:hidden">{s.hint}</span>
                <Button size="xs" variant="ghost" onClick={() => setEditing({ name: s.name })}>
                  <RefreshCwIcon />
                  Replace
                </Button>
                <Button size="icon-xs" variant="ghost" aria-label={`Delete ${s.name}`} className="text-muted-foreground hover:text-destructive" onClick={() => setRemoving(s)}>
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      <div className="border-t px-4 py-2.5">
        <Button size="xs" variant="outline" onClick={() => setEditing({})}>
          <PlusIcon />
          Add secret
        </Button>
      </div>

      <SecretDialog ws={ws} target={editing} onClose={() => setEditing(null)} />

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {removing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Anything that reads it, an app or a webhook, will stop working until a secret with this name is added again. The value cannot be recovered.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <AlertDialogClose
              render={<Button variant="destructive" />}
              onClick={() => {
                const name = removing?.name;
                if (!name) return;
                void remove.run(name).then((ok) => {
                  if (ok !== null) toastManager.add({ title: `${name} deleted`, type: "success", timeout: 1500 });
                });
              }}
            >
              Delete secret
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}

function SecretDialog({ ws, target, onClose }: { ws: Workspace; target: Target; onClose: () => void }): React.ReactElement {
  const open = target !== null;
  const replacing = target?.name;
  const [name, setName] = React.useState("");
  const [value, setValue] = React.useState("");
  const [description, setDescription] = React.useState("");
  React.useEffect(() => {
    if (!open) return;
    setName(replacing ?? "");
    setValue("");
    setDescription("");
  }, [open, replacing]);
  const save = useWsMutation(ws.id, "setSecret", { invalidates: ["listSecrets"], title: "The secret was not saved" });
  const nameOk = SECRET_NAME.test(name);
  const ready = nameOk && value.length > 0 && !save.pending;

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!ready) return;
    // a replace keeps the description it has
    const out = await save.run(APP_ID, replacing ? { name, value } : { name, value, description: description.trim() || null });
    if (!out) return;
    toastManager.add({ title: replacing ? `${name} replaced` : `${name} added`, type: "success", timeout: 1500 });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPopup>
        <form onSubmit={(e) => void submit(e)} className="flex min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>{replacing ? `Replace ${replacing}` : "Add a secret"}</DialogTitle>
            <DialogDescription>{replacing ? "The new value takes effect on the next read. The old one is gone." : HOW_TO_USE}</DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium">Name</span>
              <Input value={name} onChange={(e) => setName(asName(e.target.value))} placeholder="STRIPE_SECRET_KEY" className="font-mono" disabled={!!replacing} autoFocus={!replacing} autoComplete="off" spellCheck={false} aria-invalid={name.length > 0 && !nameOk ? true : undefined} />
              <span className="text-xs text-muted-foreground">Upper case letters, digits and underscores, starting with a letter.</span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium">Value</span>
              <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} className="font-mono text-xs" autoFocus={!!replacing} autoComplete="off" autoCapitalize="off" spellCheck={false} />
              <span className="text-xs text-muted-foreground">Kept sealed in the workspace. Shown again only as its last four characters.</span>
            </label>
            {!replacing && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium">What it is for</span>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional. Live key for the checkout funnel." maxLength={200} />
              </label>
            )}
          </DialogPanel>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!ready}>
              {replacing ? "Replace value" : "Add secret"}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
