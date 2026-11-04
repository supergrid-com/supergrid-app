import * as React from "react";
import { useNavigate } from "react-router";
import { Command, CommandCollection, CommandDialog, CommandDialogPopup, CommandEmpty, CommandGroup, CommandGroupLabel, CommandInput, CommandItem, CommandList, CommandPanel } from "~/components/ui/command";
import { useSession } from "~/lib/session";
import { useWorkspaces, type WorkspaceSummary } from "~/lib/workspaces";
import { useDocsModal, useOrgModal } from "~/shell/context";
import { docGroups } from "../../../shared/docs";
import { componentsSection, sections, settingsGroups, type SettingsSectionId } from "~/shell/sections";

type Item = { value: string; label: string };
type Group = { value: string; items: Item[] };

// ⌘K: jump to a section of this workspace, another workspace, one of the organization's pages, or a doc.
export function SearchPalette({ ws, open, onOpenChange }: { ws: WorkspaceSummary; open: boolean; onOpenChange: (open: boolean) => void }): React.ReactElement {
  const navigate = useNavigate();
  const { org } = useSession();
  const { list } = useWorkspaces(org);
  const modal = useOrgModal();
  const docsModal = useDocsModal();
  const groups = React.useMemo<Group[]>(() => {
    const out: Group[] = [
      {
        value: ws.name,
        items: [
          // the rail's sections, then (dev builds) Components, which has no row: the palette is how it opens
          ...[...sections, ...(import.meta.env.DEV ? [componentsSection] : [])].map((s) => ({ value: `go:/w/${ws.id}${s.path ? `/${s.path}` : ""}`, label: s.label })),
          ...ws.apps.map((a) => ({ value: `go:/w/${ws.id}/apps/${a.app}`, label: a.name })),
        ],
      },
    ];
    const others = (list ?? []).filter((w) => w.id !== ws.id);
    if (others.length) out.push({ value: "Workspaces", items: others.map((w) => ({ value: `go:/w/${w.id}`, label: w.name })) });
    for (const g of settingsGroups) out.push({ value: `${g.label} settings`, items: g.items.map((s) => ({ value: `org:${s.id}`, label: s.label })) });
    out.push({ value: "Docs", items: docGroups.flatMap((g) => g.docs.map((d) => ({ value: `docs:${d.id}`, label: d.title }))) });
    return out;
  }, [ws, list]);

  const pick = (value: string) => {
    onOpenChange(false);
    if (value.startsWith("go:")) navigate(value.slice(3));
    else if (value.startsWith("org:")) modal.open(value.slice(4) as SettingsSectionId);
    else if (value.startsWith("docs:")) docsModal.open(value.slice(5));
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandDialogPopup>
        <Command items={groups} itemToStringValue={(i) => (i as Item).label}>
          <CommandInput placeholder="Search pages, workspaces, settings and docs…" />
          <CommandPanel>
            <CommandEmpty>Nothing matches.</CommandEmpty>
            <CommandList>
              {(group: Group) => (
                <CommandGroup key={group.value} items={group.items}>
                  <CommandGroupLabel>{group.value}</CommandGroupLabel>
                  <CommandCollection>
                    {(item: Item) => (
                      <CommandItem key={item.value} value={item} onClick={() => pick(item.value)}>
                        {item.label}
                      </CommandItem>
                    )}
                  </CommandCollection>
                </CommandGroup>
              )}
            </CommandList>
          </CommandPanel>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  );
}

// Opens the palette on ⌘K / Ctrl+K anywhere in the shell.
export function useSearchShortcut(setOpen: (open: boolean) => void): void {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);
}
