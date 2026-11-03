import { ExternalLinkIcon, LoaderCircleIcon } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "~/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { toastManager } from "~/components/ui/toast";
import { AppIcon, safeSvg } from "~/components/workspace/app-icon";
import { openExternal } from "~/components/workspace/library/shared";
import { appSlug, refreshLocalApps } from "~/lib/apps";
import { sg } from "~/lib/bridge";
import { clean } from "~/lib/workspaces";

// New App: a folder from the template in the workspace's folder on this Mac, with its name, id, mount, icon and color.
// Creating it installs its dependencies, which takes a moment; then its Dev panel opens.

const ICONS_URL = "https://icon-sets.iconify.design/lucide/";

export function NewAppDialog({ wsId, open, onOpenChange }: { wsId: string; open: boolean; onOpenChange: (o: boolean) => void }): React.ReactElement {
  const navigate = useNavigate();
  const [name, setName] = React.useState("");
  const [id, setId] = React.useState("");
  const [idTouched, setIdTouched] = React.useState(false);
  const [mount, setMount] = React.useState("");
  const [mountTouched, setMountTouched] = React.useState(false);
  const [adminOnly, setAdminOnly] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [icon, setIcon] = React.useState("");
  const [color, setColor] = React.useState("#e8604a");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const slug = idTouched ? id : appSlug(name);
  const path = mountTouched ? mount : slug ? `/${slug}` : "";
  const iconOk = !icon.trim() || safeSvg(icon);
  const reset = () => { setName(""); setId(""); setIdTouched(false); setMount(""); setMountTouched(false); setAdminOnly(false); setDescription(""); setIcon(""); setError(null); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sg || busy) return;
    setBusy(true);
    setError(null);
    try {
      const made = await sg.apps.create(wsId, { id: slug, name: name.trim(), mount: adminOnly ? null : path || undefined, description: description.trim() || undefined, color: /^#[0-9a-f]{6}$/i.test(color) ? color : undefined, icon: icon.trim() || undefined });
      refreshLocalApps(wsId);
      toastManager.add({ title: `${made.manifest.name} Created`, description: "Its folder is ready; run it or install it from the Dev panel.", type: "success" });
      onOpenChange(false);
      reset();
      navigate(`/w/${wsId}/apps/${made.manifest.id}/_dev`);
    } catch (err) {
      setError(clean(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogPopup className="sm:max-w-lg">
        <form onSubmit={(e) => void submit(e)}>
          <DialogHeader>
            <DialogTitle>New App</DialogTitle>
            <DialogDescription>A folder from the template on this Mac: a public page, an admin screen, one table and its operations. Install it into the workspace when it is ready.</DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <AppIcon app={{ name: name || "App", icon: iconOk ? icon : null, color }} size="xl" />
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bookings" required autoFocus />
                </Field>
                <Field>
                  <FieldLabel>ID</FieldLabel>
                  <Input value={slug} onChange={(e) => { setIdTouched(true); setId(appSlug(e.target.value)); }} placeholder="bookings" className="font-mono" required />
                  <FieldDescription>Names the Worker, the tables (app_{slug || "id"}_*) and the admin path (/admin/{slug || "id"}). Fixed once installed.</FieldDescription>
                </Field>
              </div>
            </div>
            <Field>
              <FieldLabel>Description</FieldLabel>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What it does, in a line" />
            </Field>
            <div className="grid grid-cols-[1fr_auto] items-start gap-4">
              <Field>
                <FieldLabel>Public Path</FieldLabel>
                <Input value={adminOnly ? "" : path} disabled={adminOnly} onChange={(e) => { setMountTouched(true); setMount(e.target.value); }} placeholder="/bookings" className="font-mono" />
                <FieldDescription>Where its pages live on the site. Changeable later in the sitemap.</FieldDescription>
              </Field>
              <Field className="pt-1">
                <FieldLabel>Admin Only</FieldLabel>
                <Switch checked={adminOnly} onCheckedChange={setAdminOnly} />
              </Field>
            </div>
            <div className="grid grid-cols-[1fr_7rem] gap-4">
              <Field>
                <FieldLabel className="flex items-center gap-2">
                  Icon
                  <button type="button" onClick={() => openExternal(ICONS_URL)} className="inline-flex cursor-pointer items-center gap-1 text-xs font-normal text-muted-foreground hover:text-foreground">
                    Find one on Iconify
                    <ExternalLinkIcon className="size-3" />
                  </button>
                </FieldLabel>
                <Textarea value={icon} onChange={(e) => setIcon(e.target.value)} placeholder='Paste the SVG: <svg xmlns="http://www.w3.org/2000/svg" …>' rows={2} className="font-mono text-xs" />
                {!iconOk && <FieldDescription className="text-destructive-foreground">That is not a plain SVG (one &lt;svg&gt;, no scripts).</FieldDescription>}
              </Field>
              <Field>
                <FieldLabel>Color</FieldLabel>
                <div className="flex items-center gap-2">
                  <input type="color" value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#e8604a"} onChange={(e) => setColor(e.target.value)} className="size-8 cursor-pointer rounded-md border bg-transparent p-0.5" aria-label="Color" />
                  <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" />
                </div>
              </Field>
            </div>
            {error && <p className="text-sm text-destructive-foreground">{error}</p>}
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={busy} />}>Cancel</DialogClose>
            <Button type="submit" disabled={busy || !name.trim() || !slug || !iconOk}>
              {busy && <LoaderCircleIcon className="animate-spin" />}
              {busy ? "Creating…" : "Create App"}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
