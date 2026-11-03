import { CheckIcon } from "lucide-react";
import type * as React from "react";
import { useParams } from "react-router";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { Crumbs, WorkspaceFrame } from "~/components/workspace/frame";
import { accents, useWorkspaceAccent } from "~/lib/accent";
import { usePlatform } from "~/lib/platform";
import { CUSTOM, presets, SYSTEM } from "~/lib/theme";
import { cn } from "~/lib/utils";
import { useOpenNav, useShell } from "~/shell/context";
import { componentsSection } from "~/shell/sections";
import { Buttons, Display, Feedback, Inputs, Navigation, Overlays, Selection } from "./kit";
import { EmptyStates, ShellPieces } from "./shell";
import { Colors, Surfaces, Typography } from "./theme";

// Components (dev builds only): the app's own theme and kit, live, one page per group in the sub
// panel (shell/sections.ts). The bar on top switches the interface theme, the sidebar theme and
// the workspace's accent in place, so every specimen can be checked in each of them.

const pages: Record<string, () => React.ReactElement> = {
  "": Colors,
  type: Typography,
  surfaces: Surfaces,
  buttons: Buttons,
  inputs: Inputs,
  selection: Selection,
  overlays: Overlays,
  feedback: Feedback,
  navigation: Navigation,
  display: Display,
  shell: ShellPieces,
  empty: EmptyStates,
};

export function Components(): React.ReactElement {
  const sub = (useParams()["*"] ?? "").split("/")[0] ?? "";
  const onOpenNav = useOpenNav();
  const item = componentsSection.items?.find((it) => it.path === sub) ?? componentsSection.items?.[0];
  const Page = pages[item?.path ?? ""] ?? Colors;
  const Icon = item?.icon ?? componentsSection.icon;
  return (
    <WorkspaceFrame icon={<Icon />} title={<Crumbs items={["Components", item?.label ?? ""]} />} width="wide" onOpenNav={onOpenNav}>
      <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-end md:justify-between">
        <h1 className="font-heading text-xl font-semibold">{item?.label}</h1>
        <ThemeBar />
      </div>
      <div className="flex flex-col gap-8 pb-8">
        <Page />
      </div>
    </WorkspaceFrame>
  );
}

const MATCH = "match";
const interfaceOptions = [{ value: SYSTEM, label: "System" }, ...presets.map((p) => ({ value: p.id, label: p.name })), { value: CUSTOM, label: "Custom" }];
const sidebarOptions = [{ value: MATCH, label: "Match Interface" }, ...presets.map((p) => ({ value: p.id, label: p.name })), { value: CUSTOM, label: "Custom" }];

function PresetSelect({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }): React.ReactElement {
  return (
    <Select items={options} value={value} onValueChange={(v) => onChange(v as string)}>
      <SelectTrigger size="sm" className="w-40" aria-label={label}>
        <span className="text-muted-foreground">{label}</span>
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

function Dot({ color, on, label, onClick }: { color: string; on: boolean; label: string; onClick: () => void }): React.ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            aria-pressed={on}
            onClick={onClick}
            className={cn("flex size-6 cursor-pointer items-center justify-center rounded-full border border-black/10 outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/15", on && "ring-2 ring-foreground/70 ring-offset-2 ring-offset-background")}
            style={{ background: color }}
          />
        }
      >
        {on && <CheckIcon className="size-3 text-white mix-blend-difference" />}
      </TooltipTrigger>
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );
}

/** The interface and sidebar presets and the accent, switched in place (the same settings as Appearance; Custom keeps its knobs). */
function ThemeBar(): React.ReactElement {
  const { appearance, setInterface, setSidebar } = usePlatform();
  const { ws } = useShell();
  const [accent, setAccent] = useWorkspaceAccent(ws.id);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <PresetSelect label="Page" options={interfaceOptions} value={appearance.interface.preset} onChange={(preset) => setInterface({ ...appearance.interface, preset })} />
      <PresetSelect label="Sidebar" options={sidebarOptions} value={appearance.sidebar.enabled ? appearance.sidebar.preset : MATCH} onChange={(preset) => setSidebar(preset === MATCH ? { ...appearance.sidebar, enabled: false } : { ...appearance.sidebar, enabled: true, preset })} />
      <div className="flex items-center gap-1.5" role="group" aria-label="Accent">
        {accents.map((a) => (
          <Dot key={a.id} color={a.color} on={accent === a.color} label={`Accent: ${a.name}`} onClick={() => setAccent(accent === a.color ? null : a.color)} />
        ))}
      </div>
    </div>
  );
}
