import type { EventName } from "@supergrid/app-kit/rpc";
import { ChevronDownIcon } from "lucide-react";
import * as React from "react";
import { Button } from "~/components/ui/button";
import { Combobox, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxPopup } from "~/components/ui/combobox";
import { Menu, MenuCheckboxItem, MenuGroup, MenuGroupLabel, MenuPopup, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { cn } from "~/lib/utils";

// Picking event names, two ways: several at once from a menu grouped reserved / per app (the
// events and analytics filters), or one name with free text allowed (a hook or trigger, which
// may name an event nobody has sent yet).

/** Names split the way the menus show them: the workspace's own first, then one group per app. */
export function groupNames(names: EventName[]): { label: string; names: EventName[] }[] {
  const reserved = names.filter((n) => n.reserved);
  const apps = new Map<string, EventName[]>();
  for (const n of names) {
    if (n.reserved) continue;
    const k = n.app_id ?? "other";
    apps.set(k, [...(apps.get(k) ?? []), n]);
  }
  return [{ label: "Workspace", names: reserved }, ...[...apps].sort(([a], [b]) => a.localeCompare(b)).map(([label, list]) => ({ label, names: list }))].filter((g) => g.names.length);
}

export function EventNamesMenu({ names, value, onChange, label = "Events", className }: { names: EventName[]; value: string[]; onChange: (next: string[]) => void; label?: string; className?: string }): React.ReactElement {
  const groups = React.useMemo(() => groupNames(names), [names]);
  const toggle = (name: string, on: boolean) => onChange(on ? [...value, name] : value.filter((v) => v !== name));
  return (
    <Menu>
      <MenuTrigger render={<Button size="xs" variant="outline" className={cn(value.length && "font-medium", className)} />}>
        {value.length === 0 ? label : value.length === 1 ? value[0] : `${value.length} events`}
        <ChevronDownIcon className="opacity-60" />
      </MenuTrigger>
      <MenuPopup align="start" className="max-h-80 w-64 overflow-y-auto">
        {groups.map((g, i) => (
          <React.Fragment key={g.label}>
            {i > 0 && <MenuSeparator />}
            <MenuGroup>
              <MenuGroupLabel>{g.label}</MenuGroupLabel>
              {g.names.map((n) => (
                <MenuCheckboxItem key={n.name} checked={value.includes(n.name)} onCheckedChange={(on) => toggle(n.name, on)} closeOnClick={false}>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate font-mono text-xs">{n.name}</span>
                    {n.count > 0 && <span className="ms-auto text-[11px] tabular-nums text-muted-foreground">{n.count.toLocaleString()}</span>}
                  </span>
                </MenuCheckboxItem>
              ))}
            </MenuGroup>
          </React.Fragment>
        ))}
        {groups.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">No events yet</div>}
      </MenuPopup>
    </Menu>
  );
}

export function EventCombobox({ names, value, onChange, placeholder = "order.completed", autoFocus }: { names: EventName[]; value: string; onChange: (next: string) => void; placeholder?: string; autoFocus?: boolean }): React.ReactElement {
  const items = React.useMemo(() => names.map((n) => n.name), [names]);
  const byName = React.useMemo(() => new Map(names.map((n) => [n.name, n])), [names]);
  return (
    <Combobox
      items={items}
      value={items.includes(value) ? value : null}
      onValueChange={(v) => { if (v) onChange(v); }}
      inputValue={value}
      // on close Base UI syncs the box to the selected item, which for a name nobody has sent yet means
      // emptying it; typed names stay so a hook can wait for an event that does not exist yet
      onInputValueChange={(v, details) => { if (details.reason === "input-clear" && v === "") return; onChange(v); }}
    >
      <ComboboxInput size="sm" placeholder={placeholder} autoFocus={autoFocus} className="font-mono text-xs" />
      <ComboboxPopup>
        <ComboboxEmpty>{value.trim() ? `"${value.trim()}" is new: it fires once something sends it` : "No events yet"}</ComboboxEmpty>
        <ComboboxList>
          {(name: string) => {
            const n = byName.get(name);
            return (
              <ComboboxItem key={name} value={name}>
                <span className="flex items-center gap-2">
                  <span className="truncate font-mono text-xs">{name}</span>
                  <span className="ms-auto text-[11px] text-muted-foreground">{n?.reserved ? "workspace" : (n?.app_id ?? "")}</span>
                </span>
              </ComboboxItem>
            );
          }}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}
