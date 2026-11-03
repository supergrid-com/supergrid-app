import * as React from "react";
import { SectionPage } from "~/components/section-page";
import { Button } from "~/components/ui/button";
import { ColorPicker } from "~/components/ui/color-picker";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Slider } from "~/components/ui/slider";
import { Switch } from "~/components/ui/switch";
import { accents, useWorkspaceAccent } from "~/lib/accent";
import { usePlatform } from "~/lib/platform";
import { CUSTOM, isDark, type Knobs, knobsOf, matchingSidebar, presets, resolveInterface, SYSTEM } from "~/lib/theme";
import { cn } from "~/lib/utils";
import { useShell } from "~/shell/context";

// How the app looks, after Linear's settings. Two themes from one list of presets, each three
// knobs. The interface is the page inside a workspace's card; its accent is the workspace's and
// is saved with it. The sidebar (the rail, panels and chat around the page) matches the
// interface until its toggle is on, then takes a preset or custom knobs of its own. Moving a
// knob makes the theme Custom. Everything repaints as you go, so the app itself is the preview.

/** A theme's badge: its background, its ink and a dot of its accent. */
function Swatch({ knobs, className }: { knobs: Knobs; className?: string }): React.ReactElement {
  const dark = isDark(knobs.background);
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-black/10 px-1.5 text-xs font-medium dark:border-white/15", className)} style={{ background: knobs.background, color: dark ? "#f4f4f4" : "#1a1a1a" }}>
      <span className="size-1.5 rounded-full" style={{ background: knobs.accent }} />
      Aa
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/** A color knob: the kit's picker in its pill, with the core colors as dots inside it. */
function ColorField({ label, value, palette, onChange, after }: { label: string; value: string; palette: readonly string[]; onChange: (hex: string) => void; after?: React.ReactNode }): React.ReactElement {
  return (
    <Row label={label}>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {after}
        <ColorPicker label={label} value={value} palette={palette} onChange={onChange} />
      </div>
    </Row>
  );
}

function ContrastField({ value, onChange }: { value: number; onChange: (v: number) => void }): React.ReactElement {
  return (
    <Row label="Contrast">
      <div className="flex w-60 max-w-full items-center gap-4">
        <Slider value={value} min={0} max={100} step={1} onValueChange={(v) => onChange(Array.isArray(v) ? (v[0] ?? 0) : v)} aria-label="Contrast" />
        <span className="w-7 shrink-0 text-end font-mono text-sm tabular-nums text-muted-foreground">{value}</span>
      </div>
    </Row>
  );
}

type Option = { id: string; name: string; knobs: Knobs | null };

function PresetSelect({ label, options, value, onPick, knobs, className }: { label: string; options: Option[]; value: string; onPick: (id: string) => void; knobs: Knobs; className?: string }): React.ReactElement {
  return (
    <Select value={value} onValueChange={(v) => onPick(v as string)} items={options.map((o) => ({ value: o.id, label: o.name }))}>
      <SelectTrigger size="sm" className={cn("w-52", className)} aria-label={label}>
        <Swatch knobs={knobs} className="-ms-1" />
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            <span className="flex items-center gap-2">
              {o.knobs ? <Swatch knobs={o.knobs} /> : <span className="inline-flex h-6 w-11 items-center justify-center rounded-md border border-dashed text-[10px] text-muted-foreground">auto</span>}
              {o.name}
            </span>
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

function Card({ title, action, children }: { title: string; action: React.ReactNode; children?: React.ReactNode }): React.ReactElement {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs/5">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
        <h3 className="min-w-0 font-heading text-base font-semibold">{title}</h3>
        {action}
      </div>
      {children && <div className="divide-y border-t">{children}</div>}
    </section>
  );
}

// the core colors: the accents, and the presets' backgrounds
const accentPalette = accents.map((a) => a.color);
const backgroundPalette = [...new Set(presets.map((p) => p.background))];

const presetOptions: Option[] = presets.map((p) => ({ id: p.id, name: p.name, knobs: { accent: p.accent, background: p.background, contrast: p.contrast } }));

export function Appearance(): React.ReactElement {
  const { appearance, setInterface, setSidebar } = usePlatform();
  const { ws } = useShell();
  const [wsAccent, setWsAccent] = useWorkspaceAccent(ws.id);
  const osDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

  const iface = appearance.interface;
  const ifaceKnobs = resolveInterface(iface, osDark);
  // what the page shows: the workspace's accent over the theme's
  const shown = { ...ifaceKnobs, accent: wsAccent ?? ifaceKnobs.accent };
  const side = appearance.sidebar;
  const sideKnobs = side.enabled ? knobsOf(side, ifaceKnobs) : matchingSidebar(shown);

  const interfaceOptions: Option[] = [{ id: SYSTEM, name: "System Preference", knobs: null }, ...presetOptions, { id: CUSTOM, name: "Custom", knobs: iface.preset === CUSTOM ? iface : null }];
  const sidebarOptions: Option[] = [...presetOptions, { id: CUSTOM, name: "Custom", knobs: side.preset === CUSTOM ? side : null }];

  // picking a preset copies its knobs in, so Custom starts from it; moving a knob makes it Custom
  const pickInterface = (id: string) => setInterface({ ...iface, ...(id === CUSTOM || id === SYSTEM ? ifaceKnobs : knobsOf({ ...iface, preset: id }, ifaceKnobs)), preset: id });
  const pickSidebar = (id: string) => setSidebar({ ...side, ...(id === CUSTOM ? sideKnobs : knobsOf({ ...side, preset: id }, sideKnobs)), preset: id });

  return (
    <SectionPage title="Appearance" width={880}>
      <div className="flex flex-col gap-6">
        <Card title="Interface Theme" action={<PresetSelect label="Interface Theme" options={interfaceOptions} value={iface.preset} onPick={pickInterface} knobs={shown} />}>
          <ColorField
            label="Accent"
            value={shown.accent}
            palette={accentPalette}
            onChange={setWsAccent}
            after={
              wsAccent &&
              wsAccent !== ifaceKnobs.accent && (
                <Button variant="ghost" size="xs" onClick={() => setWsAccent(null)} title={`Back to the theme's ${ifaceKnobs.accent}`}>
                  Theme's
                </Button>
              )
            }
          />
          <ColorField label="Background" value={ifaceKnobs.background} palette={backgroundPalette} onChange={(background) => setInterface({ ...ifaceKnobs, background, preset: CUSTOM })} />
          <ContrastField value={ifaceKnobs.contrast} onChange={(contrast) => setInterface({ ...ifaceKnobs, contrast, preset: CUSTOM })} />
        </Card>

        <Card title="Sidebar Theme" action={<Switch checked={side.enabled} onCheckedChange={(enabled) => setSidebar({ ...side, enabled })} aria-label="Custom sidebar theme" />}>
          {side.enabled && (
            <>
              <Row label="Theme">
                <PresetSelect label="Sidebar Theme" options={sidebarOptions} value={side.preset} onPick={pickSidebar} knobs={sideKnobs} className="w-60" />
              </Row>
              <ColorField label="Accent" value={sideKnobs.accent} palette={accentPalette} onChange={(accent) => setSidebar({ ...side, ...sideKnobs, accent, preset: CUSTOM })} />
              <ColorField label="Background" value={sideKnobs.background} palette={backgroundPalette} onChange={(background) => setSidebar({ ...side, ...sideKnobs, background, preset: CUSTOM })} />
              <ContrastField value={sideKnobs.contrast} onChange={(contrast) => setSidebar({ ...side, ...sideKnobs, contrast, preset: CUSTOM })} />
            </>
          )}
        </Card>
        <p className="text-xs text-muted-foreground">{`The accent is ${ws.name}'s and is saved with the workspace. The themes are this window's.`}</p>
      </div>
    </SectionPage>
  );
}
