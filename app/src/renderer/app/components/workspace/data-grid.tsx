import { CalendarIcon, HashIcon, KeyIcon, LinkIcon, PlusIcon, ToggleLeftIcon, TypeIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "~/components/ui/button";
import type { Column, DataTable } from "~/lib/mock";
import { cn } from "~/lib/utils";

const typeIcon: Record<Column["type"], React.ComponentType<{ className?: string }>> = {
  key: KeyIcon,
  text: TypeIcon,
  number: HashIcon,
  date: CalendarIcon,
  bool: ToggleLeftIcon,
  ref: LinkIcon,
};

// The spreadsheet itself: sticky header, row numbers, blank rows to fill the panel.
export function DataGrid({ table: current }: { table: DataTable }): React.ReactElement {
  const blank = Array.from({ length: Math.max(0, 14 - current.rows.length) });
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
        <thead className="sticky top-0 z-10 bg-background">
          <tr>
            <th className="sticky left-0 z-20 w-8 border-b border-e bg-background" />
            {current.columns.map((c) => {
              const Icon = typeIcon[c.type];
              return (
                <th key={c.name} className="h-8 min-w-32 border-b border-e px-2 text-left font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Icon className="size-3 opacity-60" />
                    {c.name}
                  </span>
                </th>
              );
            })}
            <th className="h-8 w-10 border-b px-2">
              <Button variant="ghost" size="icon-xs" aria-label="Add column">
                <PlusIcon />
              </Button>
            </th>
          </tr>
        </thead>
        <tbody>
          {current.rows.map((r, i) => (
            <tr key={i} className="group hover:bg-accent/40">
              <td className="sticky left-0 border-b border-e bg-background px-2 text-center text-[10px] text-muted-foreground/60 group-hover:bg-accent/40">{i + 1}</td>
              {current.columns.map((c) => (
                <td key={c.name} className="h-8 max-w-56 truncate border-b border-e px-2 whitespace-nowrap">
                  {typeof r[c.name] === "boolean" ? (
                    <span className={cn("inline-block size-3 rounded-sm border", r[c.name] ? "bg-primary border-primary" : "")} />
                  ) : (
                    String(r[c.name] ?? "")
                  )}
                </td>
              ))}
              <td className="border-b" />
            </tr>
          ))}
          {blank.map((_, i) => (
            <tr key={`b${i}`}>
              <td className="sticky left-0 h-8 border-b border-e bg-background" />
              {current.columns.map((c) => (
                <td key={c.name} className="border-b border-e" />
              ))}
              <td className="border-b" />
            </tr>
          ))}
          <tr>
            <td className="sticky left-0 h-8 border-e bg-background" />
            <td colSpan={current.columns.length + 1} className="px-2 text-muted-foreground">
              <button type="button" className="hover:text-foreground">New row</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
