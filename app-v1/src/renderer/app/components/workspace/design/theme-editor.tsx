import { FONT_CHOICES, isDark, normalizeHex, ramp, SHADE_STEPS, type FontSpec, type Theme, type ThemeAssets } from "@supergrid/theme";
import { ImageIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import * as React from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { SegmentedControl, SegmentedControlItem } from "~/components/ui/segmented-control";
import { Select, SelectGroup, SelectGroupLabel, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { Card } from "~/components/workspace/frame";
import { cn } from "~/lib/utils";

// The theme editor: the few decisions that shape a design, each a small control, grouped the way
// people think about them. It edits a draft and reports every change up; saving is the page's job.

type Patch = (fn: (t: Theme) => Theme) => void;

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }): React.ReactElement {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[13px] font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

/** One choice among a few, as a segmented control. */
function Choice<T extends string>({ value, options, onChange, size = "sm" }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; size?: "sm" | "default" }): React.ReactElement {
  return (
    <SegmentedControl size={size} className="w-full *:flex-1">
      {options.map((o) => (
        <SegmentedControlItem key={o.value} data-checked={o.value === value ? "" : undefined} onClick={() => onChange(o.value)}>
          {o.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}

function ColorField({ label, value, onChange, onRemove, hint }: { label: string; value: string; onChange: (hex: string) => void; onRemove?: () => void; hint?: string }): React.ReactElement {
  const [text, setText] = React.useState(value);
  React.useEffect(() => setText(value), [value]);
  const commit = (v: string) => {
    const hex = normalizeHex(v);
    if (hex) onChange(hex);
    else setText(value);
  };
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <label className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-md border shadow-xs/5" style={{ background: value }} title="Pick a color">
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" aria-label={`${label} color`} />
        </label>
        <Input value={text} onChange={(e) => setText(e.target.value)} onBlur={() => commit(text)} onKeyDown={(e) => { if (e.key === "Enter") commit(text); }} className="font-mono" size="sm" spellCheck={false} />
        {onRemove && (
          <Button variant="ghost" size="icon-xs" aria-label={`Remove ${label}`} onClick={onRemove} className="text-muted-foreground">
            <XIcon />
          </Button>
        )}
      </div>
    </Field>
  );
}

/** The 50–950 ramp a color generates, as a strip. */
export function RampStrip({ hex, className }: { hex: string; className?: string }): React.ReactElement {
  const r = React.useMemo(() => ramp(hex), [hex]);
  return (
    <div className={cn("flex h-4 overflow-hidden rounded-sm", className)} aria-hidden>
      {SHADE_STEPS.map((s) => (
        <span key={s} className="flex-1" style={{ background: r[s] }} title={`${s}: ${r[s]}`} />
      ))}
    </div>
  );
}

const CUSTOM = "__custom__";

function FontField({ label, value, onChange, hint, allowNone, onClear }: { label: string; value?: FontSpec; onChange: (f: FontSpec) => void; hint?: string; allowNone?: boolean; onClear?: () => void }): React.ReactElement {
  const known = value ? FONT_CHOICES.find((f) => f.family.toLowerCase() === value.family.toLowerCase()) : undefined;
  const [custom, setCustom] = React.useState(!!value && !known);
  const selected = !value ? "" : custom || !known ? CUSTOM : known.family;
  const groups = [
    { label: "Sans", items: FONT_CHOICES.filter((f) => f.category === "sans") },
    { label: "Display", items: FONT_CHOICES.filter((f) => f.category === "display") },
    { label: "Serif", items: FONT_CHOICES.filter((f) => f.category === "serif") },
    { label: "Mono", items: FONT_CHOICES.filter((f) => f.category === "mono") },
  ];
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <Select
          value={selected}
          onValueChange={(v) => {
            if (v === CUSTOM) { setCustom(true); if (!value) onChange({ family: "", provider: "google" }); return; }
            if (v === "") { onClear?.(); return; }
            setCustom(false);
            const choice = FONT_CHOICES.find((f) => f.family === v)!;
            onChange({ family: choice.family, provider: choice.provider });
          }}
        >
          <SelectTrigger size="sm" className="min-w-0 flex-1">
            <SelectValue>{(v: string) => (v === CUSTOM ? "Other…" : v || "None")}</SelectValue>
          </SelectTrigger>
          <SelectPopup>
            {allowNone && <SelectItem value="">None</SelectItem>}
            {groups.map((g) => (
              <SelectGroup key={g.label}>
                <SelectGroupLabel>{g.label}</SelectGroupLabel>
                {g.items.map((f) => (
                  <SelectItem key={f.family} value={f.family}>
                    <span style={{ fontFamily: f.provider === "system" ? f.stack : `'${f.family}', sans-serif` }}>{f.family}</span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
            <SelectItem value={CUSTOM}>Other…</SelectItem>
          </SelectPopup>
        </Select>
      </div>
      {selected === CUSTOM && (
        <div className="flex flex-col gap-1.5">
          <Input size="sm" placeholder="Google Fonts family, or a font stack" value={value?.family ?? ""} onChange={(e) => onChange({ ...(value ?? {}), family: e.target.value, provider: value?.provider ?? "google" })} />
          <div className="flex items-center gap-2">
            <Choice value={value?.provider ?? "google"} options={[{ value: "google", label: "Google Fonts" }, { value: "system", label: "Installed" }, { value: "custom", label: "Stylesheet URL" }]} onChange={(p) => onChange({ ...(value ?? { family: "" }), provider: p })} />
          </div>
          {value?.provider === "custom" && <Input size="sm" placeholder="https://…/font.css" value={value.url ?? ""} onChange={(e) => onChange({ ...value, url: e.target.value })} />}
        </div>
      )}
    </Field>
  );
}

const ASSET_MAX = 400_000;

function AssetField({ label, hint, value, onChange }: { label: string; hint?: string; value?: string; onChange: (v: string | undefined) => void }): React.ReactElement {
  const [err, setErr] = React.useState<string | null>(null);
  const pick = (file: File | undefined) => {
    setErr(null);
    if (!file) return;
    if (file.size > ASSET_MAX) { setErr(`${Math.round(file.size / 1000)} KB is over the ${ASSET_MAX / 1000} KB limit; upload it elsewhere and paste its URL.`); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };
  return (
    <Field label={label} hint={err ?? hint}>
      <div className="flex items-center gap-2">
        <label className="flex size-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground" title="Choose a file">
          {value ? <img src={value} alt="" className="size-full object-contain" /> : <ImageIcon className="size-4" />}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        <Input size="sm" placeholder="https://… or pick a file" value={value?.startsWith("data:") ? "(file)" : (value ?? "")} readOnly={value?.startsWith("data:")} onChange={(e) => onChange(e.target.value || undefined)} />
        {value && (
          <Button variant="ghost" size="icon-xs" aria-label={`Remove ${label}`} onClick={() => onChange(undefined)} className="text-muted-foreground">
            <XIcon />
          </Button>
        )}
      </div>
    </Field>
  );
}

export function ThemeEditor({ theme, onChange }: { theme: Theme; onChange: Patch }): React.ReactElement {
  const [newColor, setNewColor] = React.useState("");
  const c = theme.colors;
  const setColor = (key: keyof Omit<Theme["colors"], "custom">, hex: string | undefined) => onChange((t) => {
    const colors = { ...t.colors };
    if (hex) colors[key] = hex; else delete colors[key];
    return { ...t, colors };
  });
  const setCustom = (name: string, hex: string | null) => onChange((t) => {
    const custom = { ...(t.colors.custom ?? {}) };
    if (hex) custom[name] = hex; else delete custom[name];
    return { ...t, colors: { ...t.colors, custom: Object.keys(custom).length ? custom : undefined } };
  });
  const setFont = (key: keyof Theme["fonts"], f: FontSpec | undefined) => onChange((t) => {
    const fonts = { ...t.fonts };
    if (f) fonts[key] = f; else if (key === "accent" || key === "mono") delete fonts[key];
    return { ...t, fonts };
  });
  const setAsset = (key: keyof ThemeAssets, v: string | undefined) => onChange((t) => {
    const assets = { ...t.assets };
    if (v) assets[key] = v; else delete assets[key];
    return { ...t, assets };
  });
  const addCustom = () => {
    const name = newColor.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    if (!name || c.custom?.[name]) return;
    setCustom(name, "#0d9488");
    setNewColor("");
  };

  return (
    <div className="flex flex-col gap-4">
      <Card title="Theme" description="A name people see; the id is what apps reference and stays as it is.">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Name">
            <Input size="sm" value={theme.name} onChange={(e) => onChange((t) => ({ ...t, name: e.target.value }))} />
          </Field>
          <Field label="Mode" hint={`id: ${theme.id}`}>
            <Choice
              value={theme.mode}
              options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
              onChange={(mode) => onChange((t) => {
                // a mode switch brings the page colors along when they still sit on the other side, so one click gives a usable theme
                const colors = { ...t.colors };
                if (mode === "dark" && !isDark(colors.background)) { colors.background = "#0b0b0f"; colors.foreground = "#ededf0"; }
                if (mode === "light" && isDark(colors.background)) { colors.background = "#ffffff"; colors.foreground = "#171717"; }
                return { ...t, mode, colors };
              })}
            />
          </Field>
        </div>
      </Card>

      <Card title="Fonts" description="Two is plenty. The accent font is for quotes and labels, when a second voice helps.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FontField label="Headings" value={theme.fonts.heading} onChange={(f) => setFont("heading", f)} />
          <FontField label="Body" value={theme.fonts.body} onChange={(f) => setFont("body", f)} />
          <FontField label="Accent" value={theme.fonts.accent} allowNone onClear={() => setFont("accent", undefined)} onChange={(f) => setFont("accent", f)} hint="Optional" />
          <FontField label="Code" value={theme.fonts.mono} allowNone onClear={() => setFont("mono", undefined)} onChange={(f) => setFont("mono", f)} hint="Optional" />
        </div>
      </Card>

      <Card title="Colors" description="Five colors make the theme; everything else (greys, borders, hover fills) is derived from them.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <ColorField label="Primary" value={c.primary} onChange={(h) => setColor("primary", h)} hint="Buttons, links, focus rings" />
            <RampStrip hex={c.primary} />
          </div>
          <div className="flex flex-col gap-1.5">
            <ColorField label="Secondary" value={c.secondary} onChange={(h) => setColor("secondary", h)} hint="Secondary buttons, highlights" />
            <RampStrip hex={c.secondary} />
          </div>
          <div className="flex flex-col gap-1.5">
            <ColorField label="Accent" value={c.accent} onChange={(h) => setColor("accent", h)} hint="Badges, callouts, the active item" />
            <RampStrip hex={c.accent} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Background" value={c.background} onChange={(h) => setColor("background", h)} />
            <ColorField label="Text" value={c.foreground} onChange={(h) => setColor("foreground", h)} />
          </div>
        </div>
        <details className="group mt-4">
          <summary className="cursor-pointer select-none text-[13px] font-medium text-muted-foreground hover:text-foreground">Status colors</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(["success", "warning", "danger", "info"] as const).map((k) => (
              <ColorField key={k} label={k[0].toUpperCase() + k.slice(1)} value={c[k] ?? { success: "#16a34a", warning: "#f59e0b", danger: "#dc2626", info: "#2563eb" }[k]} onChange={(h) => setColor(k, h)} onRemove={c[k] ? () => setColor(k, undefined) : undefined} />
            ))}
          </div>
        </details>
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <div className="text-[13px] font-medium">Custom colors</div>
            <div className="text-xs text-muted-foreground">Each gets a 50–950 ramp: <code className="font-mono">--sg-teal-500</code>.</div>
          </div>
          {Object.entries(c.custom ?? {}).map(([name, hex]) => (
            <div key={name} className="flex flex-col gap-1.5">
              <ColorField label={name} value={hex} onChange={(h) => setCustom(name, h)} onRemove={() => setCustom(name, null)} />
              <RampStrip hex={hex} />
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input size="sm" placeholder="Name, like teal or brand-2" value={newColor} onChange={(e) => setNewColor(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }} />
            <Button size="xs" variant="outline" onClick={addCustom} disabled={!newColor.trim()}>
              <PlusIcon />
              Add
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Shape" description="Rounding and density, for everything at once.">
        <div className="grid gap-4">
          <Field label="Corners">
            <Choice value={theme.radius} options={[{ value: "none", label: "None" }, { value: "sm", label: "S" }, { value: "md", label: "M" }, { value: "lg", label: "L" }, { value: "xl", label: "XL" }, { value: "full", label: "Round" }]} onChange={(radius) => onChange((t) => ({ ...t, radius }))} />
          </Field>
          <Field label="Spacing">
            <Choice value={theme.spacing} options={[{ value: "tight", label: "Tight" }, { value: "normal", label: "Normal" }, { value: "relaxed", label: "Relaxed" }]} onChange={(spacing) => onChange((t) => ({ ...t, spacing }))} />
          </Field>
        </div>
      </Card>

      <Card title="Buttons">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Corners">
            <Choice value={theme.buttons.radius ?? "theme"} options={[{ value: "theme", label: "Theme" }, { value: "pill", label: "Pill" }, { value: "square", label: "Square" }]} onChange={(radius) => onChange((t) => ({ ...t, buttons: { ...t.buttons, radius } }))} />
          </Field>
          <Field label="Weight">
            <Choice value={theme.buttons.weight ?? "medium"} options={[{ value: "medium", label: "Medium" }, { value: "semibold", label: "Semibold" }, { value: "bold", label: "Bold" }]} onChange={(weight) => onChange((t) => ({ ...t, buttons: { ...t.buttons, weight } }))} />
          </Field>
          <label className="flex items-center justify-between gap-3 text-[13px]">
            <span className="font-medium">Uppercase labels</span>
            <Switch checked={!!theme.buttons.uppercase} onCheckedChange={(uppercase) => onChange((t) => ({ ...t, buttons: { ...t.buttons, uppercase } }))} />
          </label>
          <label className="flex items-center justify-between gap-3 text-[13px]">
            <span className="font-medium">Shadow</span>
            <Switch checked={theme.buttons.shadow !== false} onCheckedChange={(shadow) => onChange((t) => ({ ...t, buttons: { ...t.buttons, shadow } }))} />
          </label>
        </div>
      </Card>

      <Card title="Inputs">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Style">
            <Choice value={theme.inputs.style ?? "outline"} options={[{ value: "outline", label: "Outline" }, { value: "filled", label: "Filled" }]} onChange={(style) => onChange((t) => ({ ...t, inputs: { ...t.inputs, style } }))} />
          </Field>
          <Field label="Corners">
            <Choice value={theme.inputs.radius ?? "theme"} options={[{ value: "theme", label: "Theme" }, { value: "pill", label: "Pill" }, { value: "square", label: "Square" }]} onChange={(radius) => onChange((t) => ({ ...t, inputs: { ...t.inputs, radius } }))} />
          </Field>
        </div>
      </Card>

      <Card title="Assets" description="Picked files are kept in the theme as data URLs (up to 400 KB each) until media uploads land; a URL is better when you have one.">
        <div className="grid gap-4 sm:grid-cols-2">
          <AssetField label="Logo" value={theme.assets.logo} onChange={(v) => setAsset("logo", v)} />
          <AssetField label="Logo on dark" value={theme.assets.logoDark} onChange={(v) => setAsset("logoDark", v)} hint="Optional" />
          <AssetField label="Favicon" value={theme.assets.favicon} onChange={(v) => setAsset("favicon", v)} />
          <AssetField label="Icon" value={theme.assets.icon} onChange={(v) => setAsset("icon", v)} hint="A square mark for app icons and avatars" />
        </div>
      </Card>

      <Card title="Notes" description="For the next person, or the agent: what this theme is for and what to leave alone.">
        <Textarea value={theme.notes ?? ""} onChange={(e) => onChange((t) => ({ ...t, notes: e.target.value || undefined }))} placeholder="Brand refresh for spring. Keep the amber accent." rows={3} />
      </Card>
      <div className="h-2" aria-hidden>
        <Trash2Icon className="hidden" />
      </div>
    </div>
  );
}
