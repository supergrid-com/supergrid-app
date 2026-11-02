import { ChevronDownIcon, ChevronUpIcon, CodeIcon, FolderPlusIcon, PanelLeftIcon, PlusIcon, RotateCcwIcon, XIcon } from "lucide-react";
import * as React from "react";
import { NavIcon, navColors, navIconNames } from "~/components/workspace/nav-icons";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { toastManager } from "~/components/ui/toast";
import type { Workspace } from "~/lib/mock";
import { type NavConfig, type NavEntry, type NavGroupConfig, type NavItemConfig, type NavMenuConfig, type NavTarget, sanitize, targetMeta, targetsFor, useNavConfig } from "~/lib/nav-config";
import { cn } from "~/lib/utils";

// The nav editor on Settings → General. Every change writes straight to the stored config, so
// the rail on the left updates as you go. A JSON view sits behind a toggle for anyone who
// would rather type it.

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

const iconItems = navIconNames.map((n) => ({ value: n, label: n }));
const colorItems = navColors.map((c) => ({ value: c.value || "default", label: c.name }));

function Reorder({ onUp, onDown, canUp, canDown }: { onUp: () => void; onDown: () => void; canUp: boolean; canDown: boolean }): React.ReactElement {
  return (
    <span className="flex shrink-0 flex-col">
      <button type="button" aria-label="Move up" disabled={!canUp} onClick={onUp} className="flex h-4 w-5 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-default disabled:opacity-30">
        <ChevronUpIcon className="size-3.5" />
      </button>
      <button type="button" aria-label="Move down" disabled={!canDown} onClick={onDown} className="flex h-4 w-5 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-default disabled:opacity-30">
        <ChevronDownIcon className="size-3.5" />
      </button>
    </span>
  );
}

function Remove({ onClick, label }: { onClick: () => void; label: string }): React.ReactElement {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
      <XIcon className="size-3.5" />
    </button>
  );
}

function ItemRow({
  ws,
  item,
  onChange,
  onRemove,
  reorder,
  nested,
}: {
  ws: Workspace;
  item: NavItemConfig;
  onChange: (next: NavItemConfig) => void;
  onRemove: () => void;
  reorder: React.ComponentProps<typeof Reorder>;
  nested?: boolean;
}): React.ReactElement {
  const meta = targetMeta(ws, item.target);
  const icon = item.icon ?? meta?.icon ?? "star";
  return (
    <div className={cn("flex items-center gap-2 py-1.5", nested && "ps-6")}>
      <Reorder {...reorder} />
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-admin text-admin-fg" style={item.color ? { color: item.color } : undefined}>
        <NavIcon name={icon} className="size-4" />
      </span>
      <Select items={iconItems} value={icon} onValueChange={(v) => onChange({ ...item, icon: !v || v === meta?.icon ? undefined : (v as NavItemConfig["icon"]) })}>
        <SelectTrigger size="sm" className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup className="max-h-72">
          {iconItems.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              <span className="flex items-center gap-2">
                <NavIcon name={i.value} className="size-4 opacity-70" />
                {i.label}
              </span>
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
      <Select items={colorItems} value={item.color || "default"} onValueChange={(v) => onChange({ ...item, color: !v || v === "default" ? undefined : v })}>
        <SelectTrigger size="sm" className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {navColors.map((c) => (
            <SelectItem key={c.value || "default"} value={c.value || "default"}>
              <span className="flex items-center gap-2">
                <span className="size-3 rounded-full border" style={{ background: c.value || "transparent" }} />
                {c.name}
              </span>
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
      <Input size="sm" value={item.label ?? ""} placeholder={meta?.label ?? item.target} onChange={(e) => onChange({ ...item, label: e.target.value || undefined })} className="min-w-0 flex-1" />
      <span className="w-20 shrink-0 truncate font-mono text-[11px] text-muted-foreground max-sm:hidden">{item.target}</span>
      <Remove onClick={onRemove} label={`Remove ${meta?.label ?? item.target}`} />
    </div>
  );
}

function AddItem({ ws, used, onAdd, compact }: { ws: Workspace; used: Set<NavTarget>; onAdd: (t: NavTarget) => void; compact?: boolean }): React.ReactElement | null {
  const free = targetsFor(ws).filter((t) => !used.has(t.target));
  const items = [{ value: "", label: compact ? "Add item…" : "Add an item…" }, ...free.map((t) => ({ value: t.target, label: t.label }))];
  if (free.length === 0) return null;
  return (
    <Select items={items} value="" onValueChange={(v) => v && onAdd(v as NavTarget)}>
      <SelectTrigger size="sm" className={cn("w-40", compact && "ms-6")}>
        <PlusIcon className="size-3.5" />
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {free.map((t) => (
          <SelectItem key={t.target} value={t.target}>
            <span className="flex items-center gap-2">
              <NavIcon name={t.icon} className="size-4 opacity-70" />
              {t.label}
            </span>
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

function GroupRow({
  ws,
  group,
  used,
  onChange,
  onRemove,
  reorder,
}: {
  ws: Workspace;
  group: NavGroupConfig;
  used: Set<NavTarget>;
  onChange: (next: NavGroupConfig) => void;
  onRemove: () => void;
  reorder: React.ComponentProps<typeof Reorder>;
}): React.ReactElement {
  const setItems = (items: NavItemConfig[]) => onChange({ ...group, items });
  return (
    <div className="rounded-lg border bg-muted/30 px-2 py-1.5">
      <div className="flex items-center gap-2 py-1">
        <Reorder {...reorder} />
        <Input size="sm" value={group.title ?? ""} placeholder="Group title (optional)" onChange={(e) => onChange({ ...group, title: e.target.value || undefined })} className="min-w-0 flex-1" />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Switch checked={!!group.dividerAbove} onCheckedChange={(v) => onChange({ ...group, dividerAbove: v })} className="[--thumb-size:--spacing(3.5)]" />
          Line above
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Switch checked={!!group.dividerBelow} onCheckedChange={(v) => onChange({ ...group, dividerBelow: v })} className="[--thumb-size:--spacing(3.5)]" />
          Line below
        </label>
        <Remove onClick={onRemove} label="Remove group" />
      </div>
      <div className="divide-y">
        {group.items.map((it, i) => (
          <ItemRow
            key={it.target}
            ws={ws}
            item={it}
            nested
            onChange={(next) => setItems(group.items.map((x, j) => (j === i ? next : x)))}
            onRemove={() => setItems(group.items.filter((_, j) => j !== i))}
            reorder={{ canUp: i > 0, canDown: i < group.items.length - 1, onUp: () => setItems(move(group.items, i, i - 1)), onDown: () => setItems(move(group.items, i, i + 1)) }}
          />
        ))}
      </div>
      <div className="py-1.5">
        <AddItem ws={ws} used={used} compact onAdd={(t) => setItems([...group.items, { kind: "item", target: t }])} />
      </div>
    </div>
  );
}

// A menu: its own rail row (icon, color, label), the panel title, and the items it opens.
function MenuRow({
  ws,
  menu,
  used,
  onChange,
  onRemove,
  reorder,
}: {
  ws: Workspace;
  menu: NavMenuConfig;
  used: Set<NavTarget>;
  onChange: (next: NavMenuConfig) => void;
  onRemove: () => void;
  reorder: React.ComponentProps<typeof Reorder>;
}): React.ReactElement {
  const setItems = (items: NavItemConfig[]) => onChange({ ...menu, items });
  const icon = menu.icon ?? "folder";
  return (
    <div className="rounded-lg border bg-muted/30 px-2 py-1.5">
      <div className="flex items-center gap-2 py-1">
        <Reorder {...reorder} />
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-admin text-admin-fg" style={menu.color ? { color: menu.color } : undefined}>
          <NavIcon name={icon} className="size-4" />
        </span>
        <Select items={iconItems} value={icon} onValueChange={(v) => onChange({ ...menu, icon: (v || "folder") as NavMenuConfig["icon"] })}>
          <SelectTrigger size="sm" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup className="max-h-72">
            {iconItems.map((i) => (
              <SelectItem key={i.value} value={i.value}>
                <span className="flex items-center gap-2">
                  <NavIcon name={i.value} className="size-4 opacity-70" />
                  {i.label}
                </span>
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <Select items={colorItems} value={menu.color || "default"} onValueChange={(v) => onChange({ ...menu, color: !v || v === "default" ? undefined : v })}>
          <SelectTrigger size="sm" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {navColors.map((c) => (
              <SelectItem key={c.value || "default"} value={c.value || "default"}>
                <span className="flex items-center gap-2">
                  <span className="size-3 rounded-full border" style={{ background: c.value || "transparent" }} />
                  {c.name}
                </span>
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <Input size="sm" value={menu.label} placeholder="Menu label" onChange={(e) => onChange({ ...menu, label: e.target.value })} className="min-w-0 flex-1" />
        <Input size="sm" value={menu.title ?? ""} placeholder="Panel title (optional)" onChange={(e) => onChange({ ...menu, title: e.target.value || undefined })} className="min-w-0 flex-1 max-sm:hidden" />
        <span className="w-20 shrink-0 truncate font-mono text-[11px] text-muted-foreground max-sm:hidden">menu</span>
        <Remove onClick={onRemove} label={`Remove ${menu.label}`} />
      </div>
      <div className="divide-y">
        {menu.items.map((it, i) => (
          <ItemRow
            key={it.target}
            ws={ws}
            item={it}
            nested
            onChange={(next) => setItems(menu.items.map((x, j) => (j === i ? next : x)))}
            onRemove={() => setItems(menu.items.filter((_, j) => j !== i))}
            reorder={{ canUp: i > 0, canDown: i < menu.items.length - 1, onUp: () => setItems(move(menu.items, i, i - 1)), onDown: () => setItems(move(menu.items, i, i + 1)) }}
          />
        ))}
      </div>
      <div className="py-1.5">
        <AddItem ws={ws} used={used} compact onAdd={(t) => setItems([...menu.items, { kind: "item", target: t }])} />
      </div>
    </div>
  );
}

export function NavEditor({ ws }: { ws: Workspace }): React.ReactElement {
  const { config, isDefault, set, reset } = useNavConfig(ws);
  const [json, setJson] = React.useState(false);
  const [text, setText] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);

  const used = new Set<NavTarget>();
  for (const e of config.entries) {
    if (e.kind === "item") used.add(e.target);
    else for (const it of e.items) used.add(it.target);
  }
  const menus = config.entries.filter((e) => e.kind === "menu").length;
  const setEntries = (entries: NavEntry[]) => set({ ...config, entries });
  const groups = config.entries.filter((e) => e.kind === "group").length;

  const openJson = () => {
    setText(JSON.stringify(config, null, 2));
    setErr(null);
    setJson(true);
  };
  const applyJson = () => {
    try {
      const parsed = JSON.parse(text) as unknown;
      const clean = sanitize(ws, parsed);
      set(clean);
      setText(JSON.stringify(clean, null, 2));
      setErr(null);
      toastManager.add({ title: "Navigation updated", type: "success", timeout: 1500 });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {json ? (
        <>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={16} spellCheck={false} className="font-mono text-xs" />
          {err && <div className="text-xs text-destructive-foreground">{err}</div>}
          <div className="flex items-center gap-2">
            <Button size="xs" onClick={applyJson}>
              Apply JSON
            </Button>
            <Button size="xs" variant="ghost" onClick={() => setJson(false)}>
              Back to the editor
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="divide-y">
            {config.entries.map((e, i) => {
              const reorder = { canUp: i > 0, canDown: i < config.entries.length - 1, onUp: () => setEntries(move(config.entries, i, i - 1)), onDown: () => setEntries(move(config.entries, i, i + 1)) };
              const replace = (next: NavEntry) => setEntries(config.entries.map((x, j) => (j === i ? next : x)));
              const remove = () => setEntries(config.entries.filter((_, j) => j !== i));
              return e.kind === "group" ? (
                <div key={e.id} className="py-1.5">
                  <GroupRow ws={ws} group={e} used={used} onChange={replace} onRemove={remove} reorder={reorder} />
                </div>
              ) : e.kind === "menu" ? (
                <div key={e.id} className="py-1.5">
                  <MenuRow ws={ws} menu={e} used={used} onChange={replace} onRemove={remove} reorder={reorder} />
                </div>
              ) : (
                <ItemRow key={e.target} ws={ws} item={e} onChange={replace} onRemove={remove} reorder={reorder} />
              );
            })}
            {config.entries.length === 0 && <div className="py-6 text-center text-[13px] text-muted-foreground">Nothing in the nav yet. Add an item below.</div>}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <AddItem ws={ws} used={used} onAdd={(t) => setEntries([...config.entries, { kind: "item", target: t }])} />
            <Button size="xs" variant="outline" onClick={() => setEntries([...config.entries, { kind: "group", id: `g${Date.now().toString(36)}`, title: groups === 0 ? "Apps" : undefined, dividerAbove: true, items: [] }])}>
              <FolderPlusIcon />
              Add group
            </Button>
            <Button size="xs" variant="outline" onClick={() => setEntries([...config.entries, { kind: "menu", id: `m${Date.now().toString(36)}`, label: menus === 0 ? "Marketing" : "Menu", icon: "folder", items: [] }])}>
              <PanelLeftIcon />
              Add menu
            </Button>
            <div className="flex-1" />
            <Button size="xs" variant="ghost" onClick={openJson}>
              <CodeIcon />
              Edit as JSON
            </Button>
            <Button size="xs" variant="ghost" disabled={isDefault} onClick={reset}>
              <RotateCcwIcon />
              Reset
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export type { NavConfig };
