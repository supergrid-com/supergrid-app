import { defaultTheme, fontChoice, fontStack, foregroundFor, googleFontsUrl, isDark, normalizeHex, type FontSpec, type Theme, type ThemeRecord } from "@supergrid/theme";
import { ChevronDownIcon, CopyIcon, ImageIcon, PaletteIcon, PlusIcon, SaveIcon, StarIcon, Trash2Icon, XIcon } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router";
import type { D1Target, LocalFile } from "../../../../../shared/bridge";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { toastManager } from "~/components/ui/toast";
import { Card, Crumbs, WorkspaceFrame } from "~/components/workspace/frame";
import { ConfirmDialog, copyText, Field, ListState, useLibraryTarget } from "~/components/workspace/library/shared";
import { sg } from "~/lib/bridge";
import { pickFiles, runUpload } from "~/lib/library";
import { freeThemeId, removeTheme, saveTheme, setDefaultTheme, useThemes } from "~/lib/themes";
import { useOpenNav } from "~/shell/context";
import { clean } from "~/lib/workspaces";
import { cn } from "~/lib/utils";
import { fileUrl } from "./files";

// A basic theme builder: the handful of decisions that make a workspace's apps look like one
// brand. Logo and favicon (kept in the workspace's bucket), five colors, two fonts. Each theme is
// a row in the workspace's database, which serves the default at /_ws/theme.css; one is the
// default. The full theme document (@supergrid/theme) has more in it; the agent can edit the rest.

const FONTS = ["Inter", "Geist", "DM Sans", "Manrope", "Plus Jakarta Sans", "Figtree", "Space Grotesk", "Playfair Display", "Instrument Serif", "System"];
const same = (a: Theme, b: Theme) => JSON.stringify(a) === JSON.stringify(b);
const spec = (family: string): FontSpec => {
  const c = fontChoice(family);
  return { family, provider: c?.provider ?? "google" };
};

function useGoogleFonts(theme: Theme | null): void {
  const url = theme ? googleFontsUrl([theme.fonts.heading, theme.fonts.body]) : null;
  React.useEffect(() => {
    if (!url || document.querySelector(`link[href="${url}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }, [url]);
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }): React.ReactElement {
  const [text, setText] = React.useState(value);
  React.useEffect(() => setText(value), [value]);
  const commit = () => {
    const hex = normalizeHex(text);
    if (hex) onChange(hex);
    else setText(value);
  };
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <label className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-lg border shadow-xs/5" style={{ background: value }} title="Pick a color">
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" aria-label={`${label} color`} />
        </label>
        <Input size="sm" value={text} onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); }} className="w-24 font-mono" spellCheck={false} />
      </div>
    </div>
  );
}

function FontField({ label, value, onChange }: { label: string; value: string; onChange: (family: string) => void }): React.ReactElement {
  const options = FONTS.includes(value) ? FONTS : [value, ...FONTS];
  return (
    <Field label={label}>
      <Select value={value} onValueChange={(v) => v && onChange(String(v))}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {options.map((f) => (
            <SelectItem key={f} value={f}>
              <span style={{ fontFamily: fontStack(spec(f)) }}>{f}</span>
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </Field>
  );
}

/** A logo or a favicon: shown when set, replaced from a picked file that goes to the workspace's bucket. */
function ImageField({ label, hint, value, themeId, slot, onChange }: { label: string; hint: string; value: string | undefined; themeId: string; slot: "logo" | "favicon"; onChange: (url: string | null) => void }): React.ReactElement {
  const { accountId, ws, bucket } = useLibraryTarget();
  const [busy, setBusy] = React.useState(false);
  const choose = async () => {
    if (!sg) return;
    const [file] = await pickFiles("image", false);
    if (!file) return;
    setBusy(true);
    const ext = (/\.([a-z0-9]+)$/i.exec(file.name)?.[1] ?? "png").toLowerCase();
    const key = `themes/${themeId}/${slot}-${Date.now()}.${ext}`;
    const lib = sg.library;
    const put = await runUpload(file as LocalFile, (job) => lib.files.upload(accountId, job, bucket, file, { key }));
    setBusy(false);
    if (put) onChange(fileUrl(ws.url, key));
  };
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-[repeating-conic-gradient(var(--muted)_0%_25%,transparent_0%_50%)] bg-[length:12px_12px] text-muted-foreground", slot === "logo" ? "h-12 w-32" : "size-12")}>
          {value ? <img src={value} alt="" className="max-h-full max-w-full object-contain p-1" /> : <ImageIcon className="size-5" />}
        </div>
        <Button size="sm" variant="outline" loading={busy} onClick={() => void choose()}>
          {value ? "Replace" : "Choose Image"}
        </Button>
        {value && (
          <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
            <XIcon />
            Remove
          </Button>
        )}
      </div>
    </Field>
  );
}

function Preview({ theme }: { theme: Theme }): React.ReactElement {
  useGoogleFonts(theme);
  const c = theme.colors;
  const btn = (bg: string, label: string) => (
    <span key={label} className="inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium" style={{ background: bg, color: foregroundFor(bg) }}>
      {label}
    </span>
  );
  return (
    <div className="flex flex-col gap-6 rounded-xl border p-8" style={{ background: c.background, color: c.foreground, fontFamily: fontStack(theme.fonts.body) }}>
      <div className="flex items-center gap-3">
        {theme.assets.favicon && <img src={theme.assets.favicon} alt="" className="size-6 rounded" />}
        {theme.assets.logo ? <img src={theme.assets.logo} alt="" className="h-8 max-w-40 object-contain" /> : <span className="text-lg font-semibold" style={{ fontFamily: fontStack(theme.fonts.heading) }}>{theme.name}</span>}
      </div>
      <div>
        <h3 className="text-4xl font-semibold leading-tight tracking-tight" style={{ fontFamily: fontStack(theme.fonts.heading) }}>
          A headline in {theme.fonts.heading.family}
        </h3>
        <p className="mt-3 max-w-xl text-lg opacity-80">Body text in {theme.fonts.body.family}. Every app in this workspace reads these colors and fonts at runtime, so a change here shows up on the site without a rebuild.</p>
      </div>
      <div className="flex flex-wrap gap-2">{[btn(c.primary, "Accent"), btn(c.secondary, "Secondary"), btn(c.accent, "Tertiary")]}</div>
      <div className="flex gap-1.5">
        {[c.primary, c.secondary, c.accent, c.background, c.foreground].map((hex, i) => (
          <span key={i} className="h-6 flex-1 rounded-md border border-black/10" style={{ background: hex }} title={hex} />
        ))}
      </div>
    </div>
  );
}

function NewThemeDialog({ open, onOpenChange, taken, onCreate }: { open: boolean; onOpenChange: (o: boolean) => void; taken: string[]; onCreate: (theme: Theme) => void }): React.ReactElement {
  const [name, setName] = React.useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    onCreate({ ...defaultTheme, id: freeThemeId(n, taken), name: n, assets: {} });
    setName("");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New Theme</DialogTitle>
            <DialogDescription>It starts from the default colors and fonts. Save it once it looks right.</DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Theme name, like Spring" aria-label="Theme Name" />
          </DialogPanel>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create Theme
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}

export function ThemesPage({ id }: { id?: string }): React.ReactElement {
  const { accountId, ws, worker } = useLibraryTarget();
  const onOpenNav = useOpenNav();
  const navigate = useNavigate();
  const target = React.useMemo<D1Target | null>(() => (accountId ? { accountId, worker } : null), [accountId, worker]);
  const themes = useThemes(target);
  const records = themes.data ?? [];
  const [draft, setDraft] = React.useState<Theme | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const base = `/w/${ws.id}/library/themes`;

  // the open theme: the one in the address, else the default; a fresh theme lives only in the draft until saved
  const current: ThemeRecord | undefined = records.find((r) => r.theme.id === id) ?? (id && draft?.id === id ? undefined : records[0]);
  const saved = current?.theme ?? null;
  const fresh = !!draft && !records.some((r) => r.theme.id === draft.id);
  const dirty = !!draft && (fresh || (!!saved && !same(draft, saved)));
  React.useEffect(() => {
    if (!saved) return;
    setDraft((d) => (d && d.id === saved.id && !same(d, saved) && !fresh ? d : d && fresh && d.id !== saved.id ? d : saved));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved?.id, current?.updated_at]);
  const shown = draft && (fresh || draft.id === saved?.id) ? draft : saved;
  const isDefault = !!current?.isDefault && !fresh;

  const patch = (fn: (t: Theme) => Theme) => setDraft((d) => (d ? fn(d) : d));
  const setColor = (key: keyof Theme["colors"], hex: string) =>
    patch((t) => {
      const colors = { ...t.colors, [key]: hex };
      return { ...t, colors, mode: isDark(colors.background) ? "dark" : "light" };
    });

  const open = (next: string) => {
    if (next === shown?.id) return;
    if (dirty && !window.confirm("Leave the unsaved changes behind?")) return;
    setDraft(null);
    navigate(`${base}/${next}`);
  };
  const save = async () => {
    if (!draft || !target) return;
    setSaving(true);
    try {
      const theme = await saveTheme(target, draft);
      toastManager.add({ title: "Theme Saved", description: "Apps pick it up within two minutes.", type: "success", timeout: 2000 });
      if (fresh) navigate(`${base}/${theme.id}`);
    } catch (e) {
      toastManager.add({ title: "Theme Did Not Save", description: clean(e), type: "error" });
    } finally {
      setSaving(false);
    }
  };
  const makeDefault = async () => {
    if (!shown || !target) return;
    try {
      await setDefaultTheme(target, shown);
      toastManager.add({ title: `${shown.name} Is the Default`, type: "success", timeout: 1500 });
    } catch (e) {
      toastManager.add({ title: "Could Not Set the Default", description: clean(e), type: "error" });
    }
  };
  const remove = async () => {
    if (!shown || !target) return;
    try {
      if (!fresh) await removeTheme(target, shown.id);
      setDraft(null);
      setConfirm(false);
      navigate(base);
    } catch (e) {
      toastManager.add({ title: "Theme Was Not Deleted", description: clean(e), type: "error" });
    }
  };
  const cssUrl = `${ws.url.replace(/\/$/, "")}/_ws/theme.css`;

  return (
    <WorkspaceFrame
      icon={<PaletteIcon />}
      title={shown ? <Crumbs items={["Themes", shown.name]} /> : "Themes"}
      onOpenNav={onOpenNav}
      actions={
        <Button size="xs" disabled={!dirty} loading={saving} onClick={() => void save()}>
          <SaveIcon />
          Save
        </Button>
      }
    >
      <ListState data={themes.data} error={themes.error} loading={themes.loading} onRetry={() => void themes.refresh()} isEmpty={() => false} empty={null}>
        {() => (
          <div className="flex flex-col gap-5">
            {/* the header: which theme is open, and what can happen to it */}
            <div className="flex flex-wrap items-center gap-2">
              <Menu>
                <MenuTrigger render={<Button variant="outline" className="gap-2 ps-3 [&_svg]:mx-0" />}>
                  {shown && (
                    <span className="flex size-4 shrink-0 overflow-hidden rounded-full border">
                      <span className="flex-1" style={{ background: shown.colors.primary }} />
                      <span className="flex-1" style={{ background: shown.colors.secondary }} />
                    </span>
                  )}
                  <span className="max-w-56 truncate">{shown?.name ?? "Pick a theme"}</span>
                  {fresh && (
                    <Badge variant="info" size="sm">
                      new
                    </Badge>
                  )}
                  <ChevronDownIcon className="size-4 opacity-70" />
                </MenuTrigger>
                <MenuPopup align="start" className="min-w-56">
                  {records.map((r) => (
                    <MenuItem key={r.theme.id} onClick={() => open(r.theme.id)}>
                      <span className="flex size-4 shrink-0 overflow-hidden rounded-full border">
                        <span className="flex-1" style={{ background: r.theme.colors.primary }} />
                        <span className="flex-1" style={{ background: r.theme.colors.secondary }} />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{r.theme.name}</span>
                      {r.isDefault && <StarIcon className="size-3.5 text-muted-foreground" />}
                    </MenuItem>
                  ))}
                  <MenuSeparator />
                  <MenuItem onClick={() => setCreating(true)}>
                    <PlusIcon className="size-4" />
                    New Theme
                  </MenuItem>
                </MenuPopup>
              </Menu>
              {isDefault ? (
                <Badge variant="secondary">Default</Badge>
              ) : (
                <Button variant="ghost" className="gap-2 [&_svg]:mx-0" disabled={!shown || fresh} onClick={() => void makeDefault()}>
                  <StarIcon />
                  Make Default
                </Button>
              )}
              <span className="flex-1" />
              <Button variant="ghost" className="gap-2 [&_svg]:mx-0" onClick={() => setCreating(true)}>
                <PlusIcon />
                New Theme
              </Button>
              <Button variant="ghost" className="gap-2 text-destructive-foreground [&_svg]:mx-0" disabled={!shown || isDefault} onClick={() => setConfirm(true)}>
                <Trash2Icon />
                Delete
              </Button>
            </div>
            {shown ? (
              <>
                <Card title="Brand">
                  <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <Field label="Name" className="md:col-span-2">
                      <Input size="lg" value={shown.name} onChange={(e) => patch((t) => ({ ...t, name: e.target.value }))} className="max-w-md" />
                    </Field>
                    <ImageField label="Logo" hint="SVG or PNG with a transparent background works best." value={shown.assets.logo} themeId={shown.id} slot="logo" onChange={(url) => patch((t) => ({ ...t, assets: { ...t.assets, logo: url ?? undefined } }))} />
                    <ImageField label="Favicon" hint="A square image; 512 × 512 covers every size." value={shown.assets.favicon} themeId={shown.id} slot="favicon" onChange={(url) => patch((t) => ({ ...t, assets: { ...t.assets, favicon: url ?? undefined } }))} />
                  </div>
                </Card>
                <div className="grid gap-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                  <Card title="Colors">
                    <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                      <ColorField label="Accent" value={shown.colors.primary} onChange={(hex) => setColor("primary", hex)} />
                      <ColorField label="Background" value={shown.colors.background} onChange={(hex) => setColor("background", hex)} />
                      <ColorField label="Secondary" value={shown.colors.secondary} onChange={(hex) => setColor("secondary", hex)} />
                      <ColorField label="Text" value={shown.colors.foreground} onChange={(hex) => setColor("foreground", hex)} />
                      <ColorField label="Tertiary" value={shown.colors.accent} onChange={(hex) => setColor("accent", hex)} />
                    </div>
                  </Card>
                  <Card title="Fonts">
                    <div className="flex flex-col gap-4">
                      <FontField label="Headline" value={shown.fonts.heading.family} onChange={(f) => patch((t) => ({ ...t, fonts: { ...t.fonts, heading: spec(f) } }))} />
                      <FontField label="Body" value={shown.fonts.body.family} onChange={(f) => patch((t) => ({ ...t, fonts: { ...t.fonts, body: spec(f) } }))} />
                    </div>
                  </Card>
                </div>
                <Card
                  title="Preview"
                  actions={
                    <button type="button" onClick={() => copyText(cssUrl)} className="flex cursor-pointer items-center gap-1.5 truncate rounded font-mono text-xs text-muted-foreground hover:text-foreground" title={cssUrl}>
                      <span className="truncate">{cssUrl.replace(/^https?:\/\//, "")}</span>
                      <CopyIcon className="size-3 shrink-0" />
                    </button>
                  }
                >
                  <Preview theme={shown} />
                </Card>
                <div className="flex items-center justify-end gap-3 pb-2">
                  {dirty && !saving && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
                  <Button disabled={!dirty} loading={saving} onClick={() => void save()}>
                    <SaveIcon />
                    Save Theme
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-16 text-center text-sm text-muted-foreground">Pick a theme or make a new one.</div>
            )}
          </div>
        )}
      </ListState>
      <NewThemeDialog
        open={creating}
        onOpenChange={setCreating}
        taken={records.map((r) => r.theme.id)}
        onCreate={(t) => {
          setDraft(t);
          navigate(`${base}/${t.id}`);
        }}
      />
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Delete ${shown?.name ?? "this theme"}?`} description={fresh ? "It was never saved; nothing else changes." : "Apps that asked for it by id fall back to the default."} onConfirm={() => void remove()} />
    </WorkspaceFrame>
  );
}
