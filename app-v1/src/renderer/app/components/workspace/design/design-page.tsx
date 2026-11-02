import { ThemeError, type Theme } from "@supergrid/theme";
import { CheckIcon, ChevronDownIcon, CopyIcon, MoonIcon, PaletteIcon, RotateCcwIcon, StarIcon, SunIcon, Trash2Icon } from "lucide-react";
import * as React from "react";
import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle, AlertDialogTrigger } from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { Tabs, TabsList, TabsTab } from "~/components/ui/tabs";
import { toastManager } from "~/components/ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { ThemeEditor } from "~/components/workspace/design/theme-editor";
import { KitPreview, SitePreview, ThemeScope, TokensPreview } from "~/components/workspace/design/theme-preview";
import { WorkspaceFrame } from "~/components/workspace/frame";
import { useAgent } from "~/lib/agent/provider";
import type { Workspace } from "~/lib/mock";
import { freeThemeId, removeTheme, saveTheme, setDefaultTheme, useThemes } from "~/lib/themes";
import { cn } from "~/lib/utils";

// The Design page: a workspace's themes, an editor for the open one and a live preview of the kit
// with it. Edits land in a draft; Save writes it to the workspace, which is what apps load.
// The agent can edit the same themes through the MCP tools; the list refreshes after each turn.

type View = "kit" | "site" | "tokens";
const same = (a: Theme, b: Theme) => JSON.stringify(a) === JSON.stringify(b);

export function DesignPage({ ws, onOpenNav }: { ws: Workspace; onOpenNav: () => void }): React.ReactElement {
  const themes = useThemes(ws);
  const agent = useAgent();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Theme | null>(null);
  const [view, setView] = React.useState<View>("kit");
  const [saving, setSaving] = React.useState(false);

  const records = themes.records;
  const current = React.useMemo(() => records.find((r) => r.theme.id === selectedId) ?? records[0], [records, selectedId]);
  const saved = current?.theme ?? null;
  const dirty = !!draft && !!saved && !same(draft, saved);

  // the draft follows the selected theme; a remote change (the agent) replaces a clean draft only
  React.useEffect(() => {
    if (!saved) return;
    setDraft((d) => (d && d.id === saved.id && dirty ? d : saved));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);
  // after each agent turn, pick up what it may have changed
  const wasBusy = React.useRef(agent.busy);
  React.useEffect(() => {
    if (wasBusy.current && !agent.busy) void themes.refresh();
    wasBusy.current = agent.busy;
  }, [agent.busy, themes]);

  const select = (id: string) => {
    if (dirty && !confirm("Discard unsaved changes to this theme?")) return;
    setSelectedId(id);
    setDraft(null);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const rec = await saveTheme(ws, draft);
      setDraft(rec.theme);
      toastManager.add({ title: `Saved ${rec.theme.name}`, description: themes.source === "workspace" ? "Apps pick it up on their next load." : "Kept locally: the workspace is not connected.", type: "success", timeout: 2500 });
    } catch (e) {
      const problems = e instanceof ThemeError ? e.problems : [(e as Error).message];
      toastManager.add({ title: "Could not save", description: problems.join(". "), type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async (mode?: Theme["mode"]) => {
    if (!saved) return;
    const base = draft ?? saved;
    const name = mode && mode !== base.mode ? `${base.name} (${mode})` : `Copy of ${base.name}`;
    const copy: Theme = { ...base, id: freeThemeId(records, name), name, mode: mode ?? base.mode };
    if (mode === "dark" && base.mode !== "dark") copy.colors = { ...base.colors, background: "#0b0b0f", foreground: "#ededf0" };
    if (mode === "light" && base.mode !== "light") copy.colors = { ...base.colors, background: "#ffffff", foreground: "#171717" };
    try {
      const rec = await saveTheme(ws, copy);
      setSelectedId(rec.theme.id);
      setDraft(rec.theme);
      toastManager.add({ title: `Created ${rec.theme.name}`, type: "success", timeout: 1500 });
    } catch (e) {
      toastManager.add({ title: "Could not create the theme", description: (e as Error).message, type: "error" });
    }
  };

  const makeDefault = async () => {
    if (!saved) return;
    try {
      await setDefaultTheme(ws, saved.id);
      toastManager.add({ title: `${saved.name} is now the default`, description: "Every app loads it from here on.", type: "success", timeout: 2500 });
    } catch (e) {
      toastManager.add({ title: "Could not set the default", description: (e as Error).message, type: "error" });
    }
  };

  const remove = async () => {
    if (!saved) return;
    try {
      await removeTheme(ws, saved.id);
      setSelectedId(null);
      setDraft(null);
      toastManager.add({ title: `Removed ${saved.name}`, type: "success", timeout: 1500 });
    } catch (e) {
      toastManager.add({ title: "Could not remove the theme", description: (e as Error).message, type: "error" });
    }
  };

  const picker = (
    <Menu>
      <MenuTrigger render={<Button variant="outline" size="xs" />}>
        {current ? (
          <>
            <span className="size-3 rounded-full border" style={{ background: current.theme.colors.primary }} />
            {current.theme.name}
            {current.isDefault && <StarIcon className="size-3 fill-current opacity-70" />}
          </>
        ) : (
          "Themes"
        )}
        <ChevronDownIcon />
      </MenuTrigger>
      <MenuPopup align="start">
        {records.map((r) => (
          <MenuItem key={r.theme.id} onClick={() => select(r.theme.id)}>
            <span className="size-3 rounded-full border" style={{ background: r.theme.colors.primary }} />
            <span className="flex-1">{r.theme.name}</span>
            {r.theme.mode === "dark" ? <MoonIcon className="size-3.5 opacity-60" /> : <SunIcon className="size-3.5 opacity-60" />}
            {r.isDefault && <StarIcon className="size-3.5 fill-current opacity-70" />}
            {r.theme.id === current?.theme.id && <CheckIcon className="size-3.5" />}
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem onClick={() => void duplicate()}>
          <CopyIcon />
          Duplicate {current?.theme.name ?? "theme"}
        </MenuItem>
        <MenuItem onClick={() => void duplicate("dark")}>
          <MoonIcon />
          New dark theme from it
        </MenuItem>
        <MenuItem onClick={() => void duplicate("light")}>
          <SunIcon />
          New light theme from it
        </MenuItem>
      </MenuPopup>
    </Menu>
  );

  const actions = (
    <>
      {picker}
      {current && !current.isDefault && (
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" size="xs" onClick={() => void makeDefault()} />}>
            <StarIcon />
            Make default
          </TooltipTrigger>
          <TooltipPopup>Apps load the default theme</TooltipPopup>
        </Tooltip>
      )}
      {dirty && (
        <Button variant="ghost" size="xs" onClick={() => setDraft(saved)}>
          <RotateCcwIcon />
          Revert
        </Button>
      )}
      <Button size="xs" onClick={() => void save()} disabled={!dirty || saving} loading={saving}>
        Save
      </Button>
    </>
  );

  return (
    <WorkspaceFrame icon={<PaletteIcon />} title="Design" width="wide" onOpenNav={onOpenNav} actions={actions}>
      {themes.error && (
        <div className="rounded-lg border border-warning/40 bg-warning/8 px-3 py-2 text-[13px] text-warning-foreground">
          The workspace could not be reached ({themes.error}); edits stay on this machine until it is.
        </div>
      )}
      {!draft ? (
        <div className="py-20 text-center text-sm text-muted-foreground">{themes.loading ? "Loading themes…" : "No themes yet."}</div>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
          <ThemeEditor theme={draft} onChange={(fn) => setDraft((d) => (d ? fn(d) : d))} />
          <div className="flex flex-col gap-3 xl:sticky xl:top-0">
            <div className="flex items-center gap-3">
              <Tabs value={view} onValueChange={(v) => setView(v as View)}>
                <TabsList size="sm">
                  <TabsTab value="kit">Components</TabsTab>
                  <TabsTab value="site">Site</TabsTab>
                  <TabsTab value="tokens">CSS</TabsTab>
                </TabsList>
              </Tabs>
              <span className="flex-1" />
              {dirty && <Badge variant="warning" size="sm">Unsaved</Badge>}
              <Badge variant="outline" size="sm">{themes.source === "workspace" ? "Workspace" : "Local"}</Badge>
              <Badge variant="outline" size="sm" className="font-mono">{draft.id}</Badge>
            </div>
            <div className={cn("overflow-hidden rounded-xl border shadow-xs/5", view !== "tokens" && "bg-neutral-100 dark:bg-neutral-900")}>
              <ThemeScope theme={draft} className="max-h-[calc(100vh-11rem)] overflow-y-auto">
                {view === "kit" && <KitPreview theme={draft} />}
                {view === "site" && <SitePreview theme={draft} name={ws.name} />}
                {view === "tokens" && <TokensPreview theme={draft} />}
              </ThemeScope>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Apps load the default theme from <code className="font-mono">/_ws/theme.css</code>; the agent can edit themes from the chat.</span>
              {current && !current.isDefault && (
                <AlertDialog>
                  <AlertDialogTrigger render={<Button variant="ghost" size="xs" className="text-muted-foreground hover:text-destructive" />}>
                    <Trash2Icon />
                    Delete theme
                  </AlertDialogTrigger>
                  <AlertDialogPopup>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {current.theme.name}?</AlertDialogTitle>
                      <AlertDialogDescription>Anything that references the theme by id falls back to the default.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogClose render={<Button variant="outline" />}>Cancel</AlertDialogClose>
                      <AlertDialogClose render={<Button variant="destructive" onClick={() => void remove()} />}>Delete</AlertDialogClose>
                    </AlertDialogFooter>
                  </AlertDialogPopup>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      )}
    </WorkspaceFrame>
  );
}
