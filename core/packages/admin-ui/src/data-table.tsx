// A compact index table on the kit's table parts: a sticky header, sortable columns, a click per row, and an
// empty state. The same density as the desktop's own tables, so an app's lists sit next to them without a seam.
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { cn } from "../ui/utils";

export type Column<T> = {
  key: string;
  label: React.ReactNode;
  render: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: "start" | "end";
  width?: string;
  className?: string;
};
export type Sort = { key: string; dir: "asc" | "desc" };

export function DataTable<T>({ columns, rows, rowKey, sort, onSort, onRowClick, empty, className }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; sort?: Sort; onSort?: (key: string) => void; onRowClick?: (row: T) => void; empty?: React.ReactNode; className?: string }): React.ReactElement {
  const headClass = "h-8 bg-background px-2 text-xs font-medium text-muted-foreground shadow-[inset_0_-1px_0_var(--border)]";
  return (
    <div className={cn("min-h-0 flex-1 overflow-auto", className)}>
      <Table className="w-full border-collapse text-[13px]">
        <TableHeader className="sticky top-0 z-10">
          <TableRow className="border-0 hover:bg-transparent">
            {columns.map((c, i) => {
              const active = sort?.key === c.key;
              const label = (
                <span className={cn("inline-flex items-center gap-1", c.align === "end" && "flex-row-reverse")}>
                  {c.label}
                  {c.sortable && (active ? sort!.dir === "asc" ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" /> : <ChevronsUpDownIcon className="size-3 opacity-0 group-hover:opacity-60" />)}
                </span>
              );
              return (
                <TableHead key={c.key} style={c.width ? { width: c.width } : undefined} className={cn(headClass, "group", c.align === "end" && "text-right", i === 0 && "ps-4", i === columns.length - 1 && "pe-4", c.className)}>
                  {c.sortable && onSort ? (
                    <button type="button" onClick={() => onSort(c.key)} className={cn("cursor-pointer hover:text-foreground", active && "text-foreground")}>
                      {label}
                    </button>
                  ) : label}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && empty !== undefined ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="p-0 whitespace-normal">{empty}</TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined} tabIndex={onRowClick ? 0 : undefined} className={cn("h-10", onRowClick && "cursor-pointer")}>
                {columns.map((c, i) => (
                  <TableCell key={c.key} className={cn("px-2 py-1.5", c.align === "end" && "text-right", i === 0 && "ps-4", i === columns.length - 1 && "pe-4", c.className)}>
                    {c.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
