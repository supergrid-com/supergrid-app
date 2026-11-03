import {
  type CellSelectionDirection,
  type ColumnDef,
  type ColumnOrderState,
  type ColumnSizingState,
  type ColumnVisibilityState,
  type Updater,
  cellSelectionFeature,
  columnFilteringFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDownIcon, ArrowDownNarrowWideIcon, ArrowUpIcon, ArrowUpDownIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, EyeOffIcon, Loader2Icon, PanelRightOpenIcon, PlusIcon, SearchIcon, Settings2Icon, Trash2Icon, XIcon } from "lucide-react";
import * as React from "react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Skeleton } from "~/components/ui/skeleton";
import { Menu, MenuCheckboxItem, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { Popover, PopoverPopup, PopoverTrigger } from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import { CellView, editText, formatCurrency, formatNumber, isEmpty, OptionDot, parseInput, PrimaryIcon, toText, typeIcons, typeLabels } from "./cells";
import type { Field, FieldType, GridRow } from "./types";

// The admin pages' data grid, after Attio's record tables: a toolbar (search, sort, fields), a
// dense grid with lines between every cell, the record's name pinned on the left beside the row
// checkboxes, columns that resize and drag to a new place, a range of cells selected with the
// mouse or the keyboard and edited in place, a + to add a field, a row to add a record, and a
// footer that calculates each column. TanStack Table keeps the state; rows are virtualized so a
// table of thousands scrolls like one of ten.

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  columnSizingFeature,
  columnResizingFeature,
  columnPinningFeature,
  columnOrderingFeature,
  columnVisibilityFeature,
  rowSelectionFeature,
  cellSelectionFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns: { basic: sortFn_basic, text: sortFn_text },
});
type Features = typeof features;

const SELECT = "__select";
const ROW_H = 40;
const HEAD_H = 38;
const FOOT_H = 36;
const ADD_COL_W = 44;
const SELECT_W = 44;

// the row checkboxes, checked in the workspace's accent like the rest of the selection
const accentCheck = "data-checked:border-(--grid-accent) data-indeterminate:border-(--grid-accent) **:data-[slot=checkbox-indicator]:data-checked:bg-(--grid-accent) **:data-[slot=checkbox-indicator]:data-checked:text-active-foreground";

const textTypes = new Set<FieldType>(["text", "number", "currency", "date", "datetime", "json", "person", "record", "email", "url", "phone", "rating"]);

function defaultWidth(f: Field): number {
  if (f.primary) return 240;
  switch (f.type) {
    case "checkbox":
      return 110;
    case "number":
    case "rating":
      return 130;
    case "multiselect":
    case "email":
    case "url":
      return 220;
    case "json":
      return 260;
    case "datetime":
      return 190;
    default:
      return 170;
  }
}

type Calc = "count" | "empty" | "filled" | "unique" | "sum" | "avg" | "min" | "max";
const calcLabels: Record<Calc, string> = { count: "Count values", empty: "Count empty", filled: "Percent filled", unique: "Count unique", sum: "Sum", avg: "Average", min: "Min", max: "Max" };
const numericCalcs: Calc[] = ["sum", "avg", "min", "max"];

function calculate(field: Field, calc: Calc, values: unknown[]): string {
  const filled = values.filter((v) => !isEmpty(v) && v !== false);
  switch (calc) {
    case "count":
      return formatNumber(filled.length);
    case "empty":
      return formatNumber(values.length - filled.length);
    case "filled":
      return values.length ? `${Math.round((filled.length / values.length) * 100)}%` : "–";
    case "unique":
      return formatNumber(new Set(filled.map((v) => toText(field, v))).size);
    default: {
      const nums = filled.map(Number).filter(Number.isFinite);
      if (!nums.length) return "–";
      const n = calc === "sum" ? nums.reduce((a, b) => a + b, 0) : calc === "avg" ? nums.reduce((a, b) => a + b, 0) / nums.length : calc === "min" ? Math.min(...nums) : Math.max(...nums);
      return field.type === "currency" ? formatCurrency(n) : formatNumber(Math.round(n * 100) / 100, field.suffix);
    }
  }
}

// ---- what the grid remembers per table: widths, order, hidden fields and footer calculations ----

type Prefs = { sizing: ColumnSizingState; order: ColumnOrderState; visibility: ColumnVisibilityState; calcs: Record<string, Calc> };
const emptyPrefs: Prefs = { sizing: {}, order: [], visibility: {}, calcs: {} };

function usePrefs(key: string | undefined): [Prefs, React.Dispatch<React.SetStateAction<Prefs>>] {
  const [prefs, setPrefs] = React.useState<Prefs>(() => {
    if (!key) return emptyPrefs;
    try {
      return { ...emptyPrefs, ...JSON.parse(localStorage.getItem(key) ?? "{}") };
    } catch {
      return emptyPrefs;
    }
  });
  React.useEffect(() => {
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(prefs));
    } catch {}
  }, [key, prefs]);
  return [prefs, setPrefs];
}

function slice<K extends keyof Prefs>(set: React.Dispatch<React.SetStateAction<Prefs>>, k: K) {
  return (u: Updater<Prefs[K]>) => set((p) => ({ ...p, [k]: typeof u === "function" ? (u as (old: Prefs[K]) => Prefs[K])(p[k]) : u }));
}

// ---- the grid ----

export type Sorting = { id: string; desc: boolean } | null;
/** A page of a bigger table: how many rows there are in all, which ones these are, and how to move. */
export type Paging = { total: number; offset: number; limit: number; onOffset: (offset: number) => void; onLimit: (limit: number) => void; sizes?: number[] };

export type DataGridProps = {
  fields: Field[];
  rows: GridRow[];
  /** What a row is called, for the toolbar and the add row: { one: "contact", many: "contacts" }. */
  noun?: { one: string; many: string };
  /** Where the grid keeps its widths, order and hidden fields between visits. */
  storageKey?: string;
  onCellChange?: (rowId: string, fieldId: string, value: unknown) => void;
  /** Adds an empty row. Returning its id makes the grid start editing its name; returning nothing (a form opens instead) leaves it. */
  onAddRow?: () => string | void;
  onAddField?: (field: { label: string; type: FieldType }) => void;
  onDeleteRows?: (ids: string[]) => void;
  /** Opens a row somewhere else (a drawer): a button appears at the end of its name cell on hover. */
  onOpenRow?: (rowId: string) => void;
  /** Search done outside the grid (on the server). Without it the grid searches the rows it has. */
  search?: { value: string; onChange: (value: string) => void };
  /** Sorting done outside the grid. Without it the grid sorts the rows it has. */
  sorting?: { value: Sorting; onChange: (next: Sorting) => void };
  /** The rows are one page of more: a strip under the grid pages through them. */
  paging?: Paging;
  /** Rows are on their way: the count dims and a spinner shows. */
  loading?: boolean;
  /** More controls after Fields in the toolbar: a filter button, a refresh. */
  toolbar?: React.ReactNode;
  /** What an empty grid says, when it is not a search that emptied it. */
  emptyText?: string;
  /** What tells one row from another. By default the row's `id`. */
  rowKey?: (row: GridRow) => string;
  /** The New button in the toolbar; off when the page puts it elsewhere (the title bar). The row at the bottom stays. */
  toolbarAdd?: boolean;
  /** The footer with a calculation per column (sum, count, …). Off by default for now. */
  calcs?: boolean;
};

type Editing = { rowId: string; colId: string; initial?: string };

export function DataGrid({ fields, rows, noun = { one: "row", many: "rows" }, storageKey, onCellChange, onAddRow, onAddField, onDeleteRows, onOpenRow, search, sorting: extSorting, paging, loading, toolbar, emptyText, rowKey = (r) => String(r.id), toolbarAdd = true, calcs = false }: DataGridProps): React.ReactElement {
  const byId = React.useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields]);
  const primary = fields.find((f) => f.primary) ?? fields[0];
  const [prefs, setPrefs] = usePrefs(storageKey);
  const [editing, setEditing] = React.useState<Editing | null>(null);
  const [scrolledX, setScrolledX] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  // the grid fills the viewport however few rows it has, so the add row and the footer sit at the bottom
  const [viewportHeight, setViewportHeight] = React.useState(0);
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportHeight(el.clientHeight));
    ro.observe(el);
    setViewportHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const columns = React.useMemo<ColumnDef<Features, GridRow>[]>(
    () => [
      { id: SELECT, size: SELECT_W, enableResizing: false, enableSorting: false, enableHiding: false, enableCellSelection: false },
      ...fields.map(
        (f): ColumnDef<Features, GridRow> => ({
          id: f.id,
          accessorFn: (r: GridRow) => r[f.id] as never,
          header: f.label,
          size: f.width ?? defaultWidth(f),
          minSize: 70,
          enableHiding: !f.primary,
          sortUndefined: "last",
          sortFn: f.type === "number" || f.type === "currency" || f.type === "rating" || f.type === "checkbox" || f.type === "date" ? "basic" : (a, b, id) => toText(f, a.getValue(id)).localeCompare(toText(f, b.getValue(id))),
        }),
      ),
    ],
    [fields],
  );

  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: (r) => rowKey(r),
    state: { columnSizing: prefs.sizing, columnOrder: prefs.order, columnVisibility: prefs.visibility, ...(extSorting ? { sorting: extSorting.value ? [extSorting.value] : [] } : {}) },
    onColumnSizingChange: slice(setPrefs, "sizing"),
    onColumnOrderChange: slice(setPrefs, "order"),
    onColumnVisibilityChange: slice(setPrefs, "visibility"),
    initialState: { columnPinning: { start: [SELECT, primary.id], end: [] } },
    ...(extSorting ? { manualSorting: true, onSortingChange: (u: Updater<{ id: string; desc: boolean }[]>) => extSorting.onChange((typeof u === "function" ? u(extSorting.value ? [extSorting.value] : []) : u)[0] ?? null) } : {}),
    ...(search ? { manualFiltering: true } : {}),
    columnResizeMode: "onChange",
    // rows keep their ids through an edit, so the selection stays where the user left it
    autoResetCellSelection: false,
    globalFilterFn: (row, columnId, value) => {
      const f = byId.get(columnId);
      return !!f && toText(f, row.getValue(columnId)).toLowerCase().includes(String(value).toLowerCase());
    },
    getColumnCanGlobalFilter: (c) => c.id !== SELECT,
  });

  const modelRows = table.getRowModel().rows;
  const rowIndex = React.useMemo(() => new Map(modelRows.map((r, i) => [r.id, i])), [modelRows]);
  const virtualizer = useVirtualizer({
    count: modelRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    getItemKey: (i) => modelRows[i]!.id,
    overscan: 12,
    scrollMargin: HEAD_H,
    scrollPaddingStart: HEAD_H,
    scrollPaddingEnd: calcs ? FOOT_H : 0,
  });

  const startHeaders = table.getStartHeaderGroups()[0]?.headers ?? [];
  const centerHeaders = table.getCenterHeaderGroups()[0]?.headers ?? [];
  const headers = [...startHeaders, ...centerHeaders];
  const startWidth = table.getStartTotalSize();
  const innerWidth = table.getTotalSize() + (onAddField ? ADD_COL_W : 0);
  const lastPinned = startHeaders[startHeaders.length - 1]?.column.id;

  const pinStyle = (colId: string, size: number): React.CSSProperties => {
    const col = table.getColumn(colId);
    return col?.getIsPinned() ? { width: size, position: "sticky", insetInlineStart: col.getStart("start") } : { width: size };
  };
  const pinClass = (colId: string) => {
    const pinned = table.getColumn(colId)?.getIsPinned();
    return cn(pinned && "z-10", colId === lastPinned && scrolledX && "shadow-[6px_0_8px_-6px_rgb(0_0_0/0.12)]");
  };

  // ---- editing ----

  const focused = table.getFocusedCell();
  const focusKey = focused ? `${focused.row.id}:${focused.column.id}` : null;

  const startEdit = React.useCallback(
    (rowId: string, colId: string, initial?: string) => {
      const f = byId.get(colId);
      if (!f || !onCellChange || f.type === "checkbox" || f.readOnly) return;
      setEditing({ rowId, colId, initial });
    },
    [byId, onCellChange],
  );
  const stopEdit = React.useCallback((move?: CellSelectionDirection) => {
    setEditing(null);
    if (move) table.moveCellSelection(move);
    scrollRef.current?.focus({ preventScroll: true });
  }, [table]);
  const commit = (rowId: string, colId: string, value: unknown) => {
    const row = rows.find((r) => rowKey(r) === rowId);
    if (row && JSON.stringify(row[colId] ?? null) !== JSON.stringify(value ?? null)) onCellChange?.(rowId, colId, value);
  };

  const clearSelected = () => {
    if (!onCellChange) return;
    for (const b of table.getCellSelectionBounds()) {
      for (let r = b.minRowIndex; r <= b.maxRowIndex; r++) {
        const row = modelRows[r];
        if (!row) continue;
        for (let c = b.minColumnIndex; c <= b.maxColumnIndex; c++) {
          const col = table.getVisibleLeafColumns()[c];
          const f = col && byId.get(col.id);
          if (!f || f.readOnly) continue;
          commit(row.id, f.id, f.type === "multiselect" ? [] : f.type === "checkbox" ? false : null);
        }
      }
    }
  };

  const copySelected = () => {
    const cols = table.getVisibleLeafColumns();
    const b = table.getCellSelectionBounds()[0];
    if (!b) return;
    const lines: string[] = [];
    for (let r = b.minRowIndex; r <= b.maxRowIndex; r++) {
      const row = modelRows[r];
      if (!row) continue;
      const cells: string[] = [];
      for (let c = b.minColumnIndex; c <= b.maxColumnIndex; c++) {
        const f = cols[c] && byId.get(cols[c]!.id);
        if (f) cells.push(toText(f, row.original[f.id]));
      }
      lines.push(cells.join("\t"));
    }
    void navigator.clipboard?.writeText(lines.join("\n"));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (editing || e.target !== e.currentTarget) return;
    const mod = e.metaKey || e.ctrlKey;
    const arrows: Record<string, CellSelectionDirection> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    const dir = arrows[e.key];
    if (dir) {
      e.preventDefault();
      if (!focused) table.setFocusedCell(modelRows[0]?.id ?? "", primary.id);
      else if (e.shiftKey) table.extendCellSelection(dir);
      else table.moveCellSelection(dir);
      return;
    }
    if (e.key === "Tab" && focused) {
      e.preventDefault();
      table.moveCellSelection(e.shiftKey ? "left" : "right");
      return;
    }
    if (mod && e.key.toLowerCase() === "a") {
      e.preventDefault();
      table.selectAllCells();
      return;
    }
    if (mod && e.key.toLowerCase() === "c") {
      e.preventDefault();
      copySelected();
      return;
    }
    if (e.key === "Escape") {
      table.resetCellSelection(true);
      return;
    }
    if (!focused) return;
    const f = byId.get(focused.column.id);
    if (!f) return;
    if (e.key === "Enter") {
      e.preventDefault();
      startEdit(focused.row.id, f.id);
    } else if (e.key === " " && f.type === "checkbox") {
      e.preventDefault();
      if (!f.readOnly) commit(focused.row.id, f.id, !focused.row.original[f.id]);
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      clearSelected();
    } else if (e.key.length === 1 && !mod && !e.altKey && (textTypes.has(f.type) || f.primary)) {
      e.preventDefault();
      startEdit(focused.row.id, f.id, e.key);
    }
  };

  // keep the focused cell on screen as the keyboard moves it: rows through the virtualizer, columns
  // by hand so a cell doesn't hide under the pinned ones
  React.useEffect(() => {
    if (!focused) return;
    const i = rowIndex.get(focused.row.id);
    if (i != null) virtualizer.scrollToIndex(i, { align: "auto" });
    const el = scrollRef.current;
    const col = focused.column;
    if (!el || col.getIsPinned()) return;
    const left = startWidth + col.getStart("center");
    const right = left + col.getSize();
    if (left - el.scrollLeft < startWidth) el.scrollLeft = left - startWidth;
    else if (right > el.scrollLeft + el.clientWidth) el.scrollLeft = right - el.clientWidth;
  }, [focusKey]);

  const addRow = () => {
    if (!onAddRow) return;
    const id = onAddRow();
    if (!id) return;
    table.setFocusedCell(id, primary.id);
    setEditing({ rowId: id, colId: primary.id });
  };

  // ---- drag a header to move its column ----

  const [drag, setDrag] = React.useState<{ id: string; over: string | null } | null>(null);
  const dropOn = (overId: string) => {
    if (!drag || drag.id === overId) return setDrag(null);
    const order = table.getAllLeafColumns().map((c) => c.id).filter((id) => id !== drag.id);
    order.splice(order.indexOf(overId), 0, drag.id);
    table.setColumnOrder(order);
    setDrag(null);
  };

  const selectedIds = Object.keys(table.state.rowSelection ?? {}).filter((id) => table.state.rowSelection[id]);
  const sorting = extSorting ? extSorting.value ?? undefined : table.state.sorting[0];
  const filtered = table.getFilteredRowModel().rows;
  const searchText = search ? search.value : ((table.state.globalFilter as string) ?? "");
  const setSearch = (v: string) => (search ? search.onChange(v) : table.setGlobalFilter(v));
  const total = paging ? paging.total : rows.length;
  const countLabel = paging
    ? `${total.toLocaleString()} ${total === 1 ? noun.one : noun.many}`
    : filtered.length === rows.length
      ? `${rows.length.toLocaleString()} ${rows.length === 1 ? noun.one : noun.many}`
      : `${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ ["--grid-hover" as string]: "color-mix(in oklab, var(--foreground) 3%, var(--background))", ["--grid-accent" as string]: "var(--admin-accent, var(--active))", ["--grid-selected" as string]: "color-mix(in oklab, var(--grid-accent) 8%, var(--background))" }}>
      {/* toolbar */}
      <div className="flex h-12 shrink-0 items-center gap-1.5 overflow-hidden border-b px-3 whitespace-nowrap">
        {selectedIds.length > 0 ? (
          <>
            <span className="px-1 text-[13px] font-medium tabular-nums">{selectedIds.length.toLocaleString()} selected</span>
            {onDeleteRows && (
              <Button
                size="xs"
                variant="destructive-outline"
                onClick={() => {
                  onDeleteRows(selectedIds);
                  table.resetRowSelection(true);
                  table.resetCellSelection(true);
                }}
              >
                <Trash2Icon />
                Delete
              </Button>
            )}
            <Button size="xs" variant="ghost" onClick={() => table.resetRowSelection(true)}>
              <XIcon />
              Clear
            </Button>
          </>
        ) : (
          <>
            <label className="flex h-7 w-56 min-w-24 shrink items-center gap-1.5 rounded-md border border-transparent px-2 text-[13px] text-foreground/70 transition-colors focus-within:border-input focus-within:bg-background hover:bg-accent/60 focus-within:hover:bg-background">
              <SearchIcon className="size-3.5 shrink-0" />
              <input
                value={searchText}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${noun.many}`}
                className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-foreground/55"
              />
              {!!searchText && (
                <button type="button" aria-label="Clear Search" onClick={() => setSearch("")} className="cursor-pointer text-muted-foreground hover:text-foreground">
                  <XIcon className="size-3.5" />
                </button>
              )}
            </label>
            <Menu>
              <MenuTrigger render={<Button size="xs" variant="ghost" className={cn("text-foreground/80 hover:text-foreground", sorting && "bg-(--grid-accent)/10 text-(--grid-accent) hover:bg-(--grid-accent)/15")} />}>
                <ArrowUpDownIcon />
                {sorting ? `Sorted by ${byId.get(sorting.id)?.label ?? sorting.id}` : "Sort"}
              </MenuTrigger>
              <MenuPopup align="start" className="min-w-52">
                <MenuGroup>
                  <MenuGroupLabel>Sort By</MenuGroupLabel>
                  <MenuRadioGroup value={sorting?.id ?? ""} onValueChange={(v) => table.setSorting(v ? [{ id: v as string, desc: sorting?.desc ?? false }] : [])}>
                    {fields.map((f) => (
                      <MenuRadioItem key={f.id} value={f.id}>
                        {f.label}
                      </MenuRadioItem>
                    ))}
                  </MenuRadioGroup>
                </MenuGroup>
                {sorting && (
                  <>
                    <MenuSeparator />
                    <MenuRadioGroup value={sorting.desc ? "desc" : "asc"} onValueChange={(v) => table.setSorting([{ id: sorting.id, desc: v === "desc" }])}>
                      <MenuRadioItem value="asc">Ascending</MenuRadioItem>
                      <MenuRadioItem value="desc">Descending</MenuRadioItem>
                    </MenuRadioGroup>
                    <MenuSeparator />
                    <MenuItem onClick={() => table.resetSorting(true)}>
                      <XIcon />
                      Clear sort
                    </MenuItem>
                  </>
                )}
              </MenuPopup>
            </Menu>
            <Menu>
              <MenuTrigger render={<Button size="xs" variant="ghost" className="text-foreground/80 hover:text-foreground" />}>
                <Settings2Icon />
                Columns
              </MenuTrigger>
              <MenuPopup align="start" className="min-w-52">
                <MenuGroup>
                  <MenuGroupLabel>Shown in This Table</MenuGroupLabel>
                  {fields
                    .filter((f) => !f.primary)
                    .map((f) => {
                      const col = table.getColumn(f.id);
                      return (
                        <MenuCheckboxItem key={f.id} checked={col?.getIsVisible() ?? true} onCheckedChange={(on) => col?.toggleVisibility(on)}>
                          {f.label}
                        </MenuCheckboxItem>
                      );
                    })}
                </MenuGroup>
              </MenuPopup>
            </Menu>
            {toolbar}
          </>
        )}
        <div className="flex-1" />
        {loading && <Loader2Icon className="size-3.5 shrink-0 animate-spin text-muted-foreground" />}
        <span className={cn("truncate whitespace-nowrap px-1 text-xs tabular-nums text-foreground/60 max-md:hidden", loading && "opacity-50")}>{countLabel}</span>
        {onAddRow && toolbarAdd && (
          <Button size="xs" onClick={addRow} className="shrink-0">
            <PlusIcon />
            New {noun.one}
          </Button>
        )}
      </div>

      {/* the grid */}
      <ScrollArea
        className="min-h-0 flex-1"
        clampContentMinWidth={false}
        viewportRef={scrollRef}
        viewportProps={{
          tabIndex: 0,
          role: "grid",
          "aria-rowcount": modelRows.length,
          onKeyDown,
          onScroll: (e) => setScrolledX(e.currentTarget.scrollLeft > 0),
          className: "relative overscroll-none text-[13px] select-none focus-visible:ring-0 focus-visible:ring-offset-0",
        }}
      >
        <div className="relative flex min-w-full flex-col" style={{ width: innerWidth, minHeight: viewportHeight }}>
          {/* header */}
          <div role="row" className="sticky top-0 z-20 flex shrink-0 border-b bg-background" style={{ height: HEAD_H }}>
            {headers.map((h) => {
              const col = h.column;
              const f = byId.get(col.id);
              const pinned = !!col.getIsPinned();
              if (!f) {
                return (
                  <div key={h.id} role="columnheader" className={cn("flex items-center justify-center border-e bg-background", pinClass(col.id))} style={pinStyle(col.id, h.getSize())}>
                    <Checkbox aria-label="Select all" checked={table.getIsAllRowsSelected()} indeterminate={table.getIsSomeRowsSelected()} onCheckedChange={() => table.toggleAllRowsSelected()} className={cn("size-3.5 sm:size-3.5", accentCheck)} />
                  </div>
                );
              }
              const Icon = f.primary ? PrimaryIcon : typeIcons[f.type];
              const sorted = col.getIsSorted();
              return (
                <div
                  key={h.id}
                  role="columnheader"
                  aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                  onDragOver={(e) => {
                    if (!drag || pinned) return;
                    e.preventDefault();
                    if (drag.over !== col.id) setDrag({ ...drag, over: col.id });
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    dropOn(col.id);
                  }}
                  className={cn("group/head relative flex items-center border-e bg-background", pinClass(col.id), drag && drag.over === col.id && drag.id !== col.id && "before:absolute before:inset-y-1 before:-start-px before:z-10 before:w-0.5 before:rounded-full before:bg-(--grid-accent)")}
                  style={pinStyle(col.id, h.getSize())}
                >
                  <Menu>
                    <MenuTrigger
                      render={
                        <button
                          type="button"
                          draggable={!pinned}
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", col.id);
                            setDrag({ id: col.id, over: null });
                          }}
                          onDragEnd={() => setDrag(null)}
                          className={cn("flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-2.5 text-left font-medium text-foreground/80 outline-none transition-colors hover:bg-accent/50 hover:text-foreground data-popup-open:bg-accent/60 data-popup-open:text-foreground", drag?.id === col.id && "opacity-50")}
                        />
                      }
                    >
                      <Icon className="size-3.5 shrink-0 opacity-60" />
                      <span className="truncate">{f.label}</span>
                      {sorted && (sorted === "asc" ? <ArrowUpIcon className="size-3 shrink-0 text-foreground" /> : <ArrowDownIcon className="size-3 shrink-0 text-foreground" />)}
                      <ChevronDownIcon className="ms-auto size-3 shrink-0 opacity-0 transition-opacity group-hover/head:opacity-50" />
                    </MenuTrigger>
                    <MenuPopup align="start" className="min-w-48">
                      <MenuGroup>
                        <MenuGroupLabel>{f.primary ? "Name" : typeLabels[f.type]}</MenuGroupLabel>
                        <MenuItem onClick={() => col.toggleSorting(false)}>
                          <ArrowUpIcon />
                          Sort ascending
                        </MenuItem>
                        <MenuItem onClick={() => col.toggleSorting(true)}>
                          <ArrowDownNarrowWideIcon />
                          Sort descending
                        </MenuItem>
                        {sorted && (
                          <MenuItem onClick={() => col.clearSorting()}>
                            <XIcon />
                            Clear sort
                          </MenuItem>
                        )}
                      </MenuGroup>
                      {!f.primary && (
                        <>
                          <MenuSeparator />
                          <MenuItem onClick={() => col.toggleVisibility(false)}>
                            <EyeOffIcon />
                            Hide field
                          </MenuItem>
                        </>
                      )}
                    </MenuPopup>
                  </Menu>
                  {col.getCanResize() && (
                    <div
                      role="separator"
                      aria-label={`Resize ${f.label}`}
                      onMouseDown={h.getResizeHandler()}
                      onTouchStart={h.getResizeHandler()}
                      onDoubleClick={() => col.resetSize()}
                      className={cn("absolute inset-y-0 -end-[3px] z-10 w-[5px] cursor-col-resize transition-colors hover:bg-(--grid-accent)/60", col.getIsResizing() && "bg-(--grid-accent)")}
                    />
                  )}
                </div>
              );
            })}
            {onAddField && <AddField onAdd={onAddField} />}
            <div className="flex-1" />
          </div>

          {/* rows */}
          <div className="relative shrink-0" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((vi) => {
              const row = modelRows[vi.index]!;
              const selected = row.getIsSelected();
              const cells = [...row.getStartVisibleCells(), ...row.getCenterVisibleCells()];
              return (
                <div
                  key={row.id}
                  role="row"
                  aria-rowindex={vi.index + 1}
                  data-selected={selected || undefined}
                  className="group/row absolute start-0 flex w-full border-b hover:bg-(--grid-hover) data-selected:bg-(--grid-selected)"
                  style={{ height: ROW_H, transform: `translateY(${vi.start - HEAD_H}px)` }}
                >
                  {cells.map((cell) => {
                    const col = cell.column;
                    const f = byId.get(col.id);
                    const pinned = !!col.getIsPinned();
                    const base = cn("relative flex h-full shrink-0 items-center overflow-hidden border-e", pinned && "bg-background group-hover/row:bg-(--grid-hover) group-data-selected/row:bg-(--grid-selected)", pinClass(col.id));
                    if (!f) {
                      return (
                        <div key={cell.id} role="gridcell" className={cn(base, "justify-center")} style={pinStyle(col.id, col.getSize())}>
                          <span className={cn("text-[11px] tabular-nums text-muted-foreground/60 group-hover/row:hidden", selected && "hidden")}>{vi.index + 1}</span>
                          <Checkbox aria-label="Select row" checked={selected} onClick={row.getToggleSelectedHandler()} className={cn("hidden size-3.5 group-hover/row:flex sm:size-3.5", accentCheck, selected && "flex")} />
                        </div>
                      );
                    }
                    const isEditing = editing?.rowId === row.id && editing.colId === col.id;
                    const sel = cell.getIsSelected();
                    const edges = cell.getSelectionEdges();
                    const ring = "var(--grid-accent)";
                    const shadow = sel ? [edges.top && `inset 0 1.5px 0 ${ring}`, edges.bottom && `inset 0 -1.5px 0 ${ring}`, edges.left && `inset 1.5px 0 0 ${ring}`, edges.right && `inset -1.5px 0 0 ${ring}`].filter(Boolean).join(",") : undefined;
                    const isFocus = cell.getIsFocused();
                    const value = row.original[f.id];
                    return (
                      <div
                        key={cell.id}
                        role="gridcell"
                        data-cell={`${row.id}:${col.id}`}
                        aria-selected={sel || undefined}
                        onMouseDown={(e) => {
                          if (e.button !== 0) return;
                          scrollRef.current?.focus({ preventScroll: true });
                          cell.getSelectionStartHandler()(e);
                        }}
                        onMouseEnter={cell.getSelectionExtendHandler()}
                        onDoubleClick={() => startEdit(row.id, col.id)}
                        className={cn(base, "px-2.5", (f.type === "number" || f.type === "currency") && "justify-end")}
                        style={pinStyle(col.id, col.getSize())}
                      >
                        <CellView field={f} value={value} onToggle={onCellChange && !f.readOnly ? () => commit(row.id, f.id, !value) : undefined} />
                        {onOpenRow && f.primary && (
                          <button
                            type="button"
                            aria-label="Open Row"
                            title="Open"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenRow(row.id);
                            }}
                            className="absolute end-1.5 top-1/2 hidden size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md border bg-background text-muted-foreground shadow-xs transition-colors group-hover/row:flex hover:bg-accent hover:text-foreground"
                          >
                            <PanelRightOpenIcon className="size-3.5" />
                          </button>
                        )}
                        {sel && <span aria-hidden className={cn("pointer-events-none absolute inset-0", !isFocus && "bg-(--grid-accent)/6")} style={{ boxShadow: shadow }} />}
                        {isEditing && (
                          <CellEditor
                            field={f}
                            value={value}
                            initial={editing.initial}
                            anchor={() => scrollRef.current?.querySelector(`[data-cell="${CSS.escape(`${row.id}:${col.id}`)}"]`) ?? null}
                            onChange={(v) => commit(row.id, f.id, v)}
                            onDone={stopEdit}
                          />
                        )}
                      </div>
                    );
                  })}
                  <div className="flex-1" />
                </div>
              );
            })}
          </div>

          {modelRows.length === 0 && loading && (
            <div aria-busy aria-label="Loading" className="flex shrink-0 flex-col">
              {Array.from({ length: Math.max(3, Math.min(12, Math.floor((viewportHeight - HEAD_H - ROW_H) / ROW_H))) }, (_, i) => (
                <div key={i} role="row" className="flex border-b" style={{ height: ROW_H }}>
                  {headers.map((h, j) => {
                    const f = byId.get(h.column.id);
                    // a different width per cell, so the rows read as rows rather than bars
                    const w = f ? 0.35 + (((i * 7 + j * 13) % 10) / 10) * 0.45 : 0;
                    return (
                      <div key={h.id} className={cn("flex h-full shrink-0 items-center border-e px-2.5", pinClass(h.column.id))} style={pinStyle(h.column.id, h.getSize())}>
                        {f ? <Skeleton className="h-3.5 rounded" style={{ width: `${Math.round(w * 100)}%` }} /> : <Skeleton className="size-3.5 rounded-[4px]" />}
                      </div>
                    );
                  })}
                  <div className="flex-1" />
                </div>
              ))}
            </div>
          )}
          {modelRows.length === 0 && !loading && (
            <div className="sticky start-0 flex h-28 items-center justify-center text-[13px] text-muted-foreground" style={{ width: scrollRef.current?.clientWidth }}>
              {searchText ? `No ${noun.many} match “${searchText}”` : (emptyText ?? `No ${noun.many} yet`)}
            </div>
          )}
          <div className="flex-1" />

          {/* a new row, at the bottom of the grid */}
          {onAddRow && (
            <div className="flex shrink-0 border-t" style={{ height: ROW_H }}>
              <button type="button" onClick={addRow} className="sticky start-0 flex h-full cursor-pointer items-center gap-2 bg-background ps-[15px] pe-4 text-foreground/70 transition-colors hover:text-foreground" style={{ width: startWidth }}>
                <PlusIcon className="size-3.5" />
                New {noun.one}
              </button>
            </div>
          )}

          {/* footer: a calculation per column */}
          {calcs && (
          <div role="row" className="sticky bottom-0 z-20 flex shrink-0 border-t bg-background" style={{ height: FOOT_H }}>
            {headers.map((h) => {
              const col = h.column;
              const f = byId.get(col.id);
              if (!f) return <div key={h.id} className={cn("border-e bg-background", pinClass(col.id))} style={pinStyle(col.id, h.getSize())} />;
              const calc = prefs.calcs[f.id];
              const numeric = f.type === "number" || f.type === "currency" || f.type === "rating";
              const options = (Object.keys(calcLabels) as Calc[]).filter((c) => numeric || !numericCalcs.includes(c));
              return (
                <div key={h.id} className={cn("group/foot flex border-e bg-background", pinClass(col.id))} style={pinStyle(col.id, h.getSize())}>
                  <Menu>
                    <MenuTrigger render={<button type="button" className={cn("flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1 px-2.5 text-xs text-muted-foreground outline-none transition-colors hover:bg-accent/50 data-popup-open:bg-accent/60", numeric && "justify-end")} />}>
                      {calc ? (
                        <>
                          <span className="truncate">{calcLabels[calc]}</span>
                          <span className="font-medium tabular-nums text-foreground">{calculate(f, calc, filtered.map((r) => r.original[f.id]))}</span>
                        </>
                      ) : (
                        <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover/foot:opacity-100">
                          <PlusIcon className="size-3" />
                          Calculate
                        </span>
                      )}
                    </MenuTrigger>
                    <MenuPopup align="start" side="top" className="min-w-44">
                      <MenuRadioGroup value={calc ?? ""} onValueChange={(v) => setPrefs((p) => ({ ...p, calcs: { ...p.calcs, [f.id]: v as Calc } }))}>
                        {options.map((c) => (
                          <MenuRadioItem key={c} value={c}>
                            {calcLabels[c]}
                          </MenuRadioItem>
                        ))}
                      </MenuRadioGroup>
                      {calc && (
                        <>
                          <MenuSeparator />
                          <MenuItem
                            onClick={() =>
                              setPrefs((p) => {
                                const { [f.id]: _, ...rest } = p.calcs;
                                return { ...p, calcs: rest };
                              })
                            }
                          >
                            <XIcon />
                            Remove
                          </MenuItem>
                        </>
                      )}
                    </MenuPopup>
                  </Menu>
                </div>
              );
            })}
            {onAddField && <div style={{ width: ADD_COL_W }} className="shrink-0" />}
            <div className="flex-1" />
          </div>
          )}
        </div>
      </ScrollArea>
      {paging && <Pager {...paging} noun={noun} />}
    </div>
  );
}

// ---- the strip under a paged grid: which rows these are, the page size, and back and forward ----

function Pager({ total, offset, limit, onOffset, onLimit, sizes = [50, 100, 250, 500], noun }: Paging & { noun: { one: string; many: string } }): React.ReactElement {
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(total, offset + limit);
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.floor(offset / limit) + 1;
  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-t px-3 text-xs text-muted-foreground">
      <span className="tabular-nums">
        {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()} {total === 1 ? noun.one : noun.many}
      </span>
      <div className="flex-1" />
      <Menu>
        <MenuTrigger render={<Button size="xs" variant="ghost" className="text-foreground/70 hover:text-foreground" />}>
          {limit} per page
          <ChevronDownIcon className="opacity-60" />
        </MenuTrigger>
        <MenuPopup align="end" side="top" className="min-w-36">
          <MenuRadioGroup value={String(limit)} onValueChange={(v) => onLimit(Number(v))}>
            {sizes.map((n) => (
              <MenuRadioItem key={n} value={String(n)}>
                {n} per page
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuPopup>
      </Menu>
      <span className="tabular-nums">
        Page {page.toLocaleString()} of {pages.toLocaleString()}
      </span>
      <Button size="icon-xs" variant="ghost" aria-label="Previous Page" disabled={offset <= 0} onClick={() => onOffset(Math.max(0, offset - limit))}>
        <ChevronLeftIcon />
      </Button>
      <Button size="icon-xs" variant="ghost" aria-label="Next Page" disabled={to >= total} onClick={() => onOffset(offset + limit)}>
        <ChevronRightIcon />
      </Button>
    </div>
  );
}

// ---- the + at the end of the header: a name and a type for a new field ----

const addableTypes: FieldType[] = ["text", "number", "currency", "date", "datetime", "json", "select", "multiselect", "checkbox", "person", "email", "url", "phone", "rating"];

function AddField({ onAdd }: { onAdd: (field: { label: string; type: FieldType }) => void }): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const [type, setType] = React.useState<FieldType>("text");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onAdd({ label: label.trim(), type });
    setLabel("");
    setType("text");
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<button type="button" aria-label="Add Field" className="flex h-full shrink-0 cursor-pointer items-center justify-center border-e text-foreground/70 transition-colors hover:bg-accent/50 hover:text-foreground data-popup-open:bg-accent/60" style={{ width: ADD_COL_W }} />}
      >
        <PlusIcon className="size-4" />
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-64">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="text-[13px] font-semibold">New Field</div>
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Field name"
            className="h-8 rounded-md border border-input bg-background px-2.5 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/24"
          />
          <div className="grid grid-cols-2 gap-1">
            {addableTypes.map((t) => {
              const Icon = typeIcons[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn("flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-left text-xs transition-colors", type === t ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")}
                >
                  <Icon className="size-3.5" />
                  {typeLabels[t]}
                </button>
              );
            })}
          </div>
          <Button type="submit" size="sm" disabled={!label.trim()}>
            Add field
          </Button>
        </form>
      </PopoverPopup>
    </Popover>
  );
}

// ---- in-place editors: an input over the cell, or a menu of options under it ----

function CellEditor({
  field,
  value,
  initial,
  anchor,
  onChange,
  onDone,
}: {
  field: Field;
  value: unknown;
  initial?: string;
  anchor: () => Element | null;
  onChange: (value: unknown) => void;
  onDone: (move?: CellSelectionDirection) => void;
}): React.ReactElement {
  if (field.type === "select" || field.type === "multiselect") return <OptionsEditor field={field} value={value} anchor={anchor} onChange={onChange} onDone={onDone} />;
  return <TextEditor field={field} value={value} initial={initial} onChange={onChange} onDone={onDone} />;
}

function TextEditor({ field, value, initial, onChange, onDone }: { field: Field; value: unknown; initial?: string; onChange: (value: unknown) => void; onDone: (move?: CellSelectionDirection) => void }): React.ReactElement {
  const [text, setText] = React.useState(initial ?? editText(field, value));
  const done = React.useRef(false);
  const finish = (save: boolean, move?: CellSelectionDirection) => {
    if (done.current) return;
    done.current = true;
    if (save) onChange(parseInput(field, text));
    onDone(move);
  };
  const numeric = field.type === "number" || field.type === "currency" || field.type === "rating";
  return (
    <input
      autoFocus
      type={field.type === "date" ? "date" : "text"}
      spellCheck={false}
      inputMode={numeric ? "decimal" : undefined}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onFocus={(e) => {
        // a typed first character replaces the value; Enter or a double click keeps it to edit
        const el = e.currentTarget;
        if (el.type === "text") el.setSelectionRange(el.value.length, el.value.length);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          finish(true, "down");
        } else if (e.key === "Tab") {
          e.preventDefault();
          finish(true, e.shiftKey ? "left" : "right");
        } else if (e.key === "Escape") {
          e.preventDefault();
          finish(false);
        }
      }}
      className={cn("absolute inset-0 z-10 h-full w-full bg-background px-2.5 text-[13px] text-foreground shadow-[inset_0_0_0_2px_var(--grid-accent)] outline-none", numeric && "text-right tabular-nums", field.primary && "font-medium", field.type === "json" && "font-mono text-xs")}
    />
  );
}

function OptionsEditor({ field, value, anchor, onChange, onDone }: { field: Field; value: unknown; anchor: () => Element | null; onChange: (value: unknown) => void; onDone: (move?: CellSelectionDirection) => void }): React.ReactElement {
  const multi = field.type === "multiselect";
  const values = multi ? (Array.isArray(value) ? (value as string[]) : []) : [];
  const [el] = React.useState(anchor);
  return (
    <Menu open onOpenChange={(o) => !o && onDone()}>
      <MenuPopup anchor={el} align="start" side="bottom" sideOffset={2} className="min-w-48">
        <MenuGroup>
          <MenuGroupLabel>{field.label}</MenuGroupLabel>
          {multi
            ? field.options?.map((o) => (
                <MenuCheckboxItem key={o.value} checked={values.includes(o.value)} onCheckedChange={(on) => onChange(on ? [...values, o.value] : values.filter((v) => v !== o.value))}>
                  <span className="flex items-center gap-2">
                    <OptionDot color={o.color} />
                    {o.value}
                  </span>
                </MenuCheckboxItem>
              ))
            : (
                <MenuRadioGroup
                  value={(value as string) ?? ""}
                  onValueChange={(v) => {
                    onChange(v);
                    onDone();
                  }}
                >
                  {field.options?.map((o) => (
                    <MenuRadioItem key={o.value} value={o.value}>
                      <span className="flex items-center gap-2">
                        <OptionDot color={o.color} />
                        {o.value}
                      </span>
                    </MenuRadioItem>
                  ))}
                </MenuRadioGroup>
              )}
        </MenuGroup>
        {!isEmpty(value) && (
          <>
            <MenuSeparator />
            <MenuItem
              onClick={() => {
                onChange(multi ? [] : null);
                onDone();
              }}
            >
              <XIcon />
              Clear
            </MenuItem>
          </>
        )}
      </MenuPopup>
    </Menu>
  );
}
