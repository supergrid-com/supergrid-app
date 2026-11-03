import { ActivityIcon, AppWindowIcon, BookOpenIcon, ChartColumnIcon, CheckIcon, ChevronRightIcon, CircleAlertIcon, ClapperboardIcon, CodeIcon, DatabaseIcon, FilePenIcon, FileTextIcon, FolderIcon, GlobeIcon, ImageIcon, LoaderCircleIcon, MapIcon, NavigationIcon, PaletteIcon, SearchIcon, SparklesIcon, TerminalIcon, Trash2Icon, WrenchIcon, type LucideIcon } from "lucide-react";
import type * as React from "react";
import type { ToolCall } from "../../../../shared/acp";
import { contentText } from "../../../../shared/acp";
import { ourTool, type AgentWidget } from "../../../../shared/agent";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "~/components/ui/collapsible";
import { cn } from "~/lib/utils";
import { Widget } from "./widgets";

const kindIcons: Record<string, LucideIcon> = { execute: TerminalIcon, read: FileTextIcon, edit: FilePenIcon, delete: Trash2Icon, search: SearchIcon, fetch: GlobeIcon };

/** How our own tools read in the transcript: a plain label from the call's input, and an icon for the area. */
function describe(name: string, input: Record<string, unknown>): { label: string; Icon: LucideIcon } {
  const s = (k: string) => (typeof input[k] === "string" && input[k] ? ` ${String(input[k])}` : "");
  const db = (label: string) => ({ label, Icon: DatabaseIcon });
  switch (name) {
    case "db_tables": return db("Tables");
    case "db_describe": return db(`Describe${s("table")}`);
    case "db_rows": return db(`Rows of${s("table")}`);
    case "db_query": return db(s("title") ? `Query:${s("title")}` : "Query");
    case "db_insert": return db(`Add rows to${s("table")}`);
    case "db_update": return db(`Update${s("table")}`);
    case "db_delete": return db(`Delete from${s("table")}`);
    case "db_execute": return { label: "Run SQL", Icon: CodeIcon };
    case "db_create_table": return { label: `Create table${s("name")}`, Icon: CodeIcon };
    case "db_add_column": return { label: `Add${s("name")} to${s("table")}`, Icon: CodeIcon };
    case "db_drop_table": return { label: `Drop${s("table")}`, Icon: CodeIcon };
    case "images_list": return { label: `Images${s("search") ? `:${s("search")}` : ""}`, Icon: ImageIcon };
    case "media_list": return { label: `Media${s("search") ? `:${s("search")}` : ""}`, Icon: ClapperboardIcon };
    case "files_list": return { label: `Files${s("prefix") ? ` in${s("prefix")}` : ""}`, Icon: FolderIcon };
    case "library_show": return { label: "Show from the library", Icon: ImageIcon };
    case "library_upload": return { label: `Upload${s("title") ? `:${s("title")}` : ""}`, Icon: FolderIcon };
    case "skills_search": return { label: `Skills${s("query") ? `:${s("query")}` : ""}`, Icon: SparklesIcon };
    case "skills_read": return { label: `Read skill${s("id")}`, Icon: SparklesIcon };
    case "skills_save": return { label: `Save skill${s("id")}`, Icon: SparklesIcon };
    case "theme_guide": return { label: "Theme guide", Icon: PaletteIcon };
    case "themes_list": return { label: "Themes", Icon: PaletteIcon };
    case "theme_get": return { label: `Theme${s("id") || " (default)"}`, Icon: PaletteIcon };
    case "theme_save": return { label: `Save theme${s("id")}`, Icon: PaletteIcon };
    case "theme_create": return { label: `New theme${s("name")}`, Icon: PaletteIcon };
    case "theme_set_default": return { label: `Make${s("id")} the default`, Icon: PaletteIcon };
    case "theme_delete": return { label: `Delete theme${s("id")}`, Icon: PaletteIcon };
    case "analytics_query": return { label: s("title") ? `Analytics:${s("title")}` : "Analytics", Icon: ChartColumnIcon };
    case "analytics_funnel": return { label: "Funnel", Icon: ChartColumnIcon };
    case "events_recent": return { label: `Recent${s("name")} events`, Icon: ActivityIcon };
    case "event_names": return { label: "Event names", Icon: ActivityIcon };
    case "app_context": return { label: "Where you are", Icon: AppWindowIcon };
    case "app_navigate": return { label: `Open${s("to") || " home"}`, Icon: NavigationIcon };
    case "apps_list": return { label: "Installed apps", Icon: AppWindowIcon };
    case "sitemap": return { label: "Sitemap", Icon: MapIcon };
    case "suggest_dev_mode": return { label: "Suggest Dev mode", Icon: CodeIcon };
    case "docs_list": return { label: "Docs", Icon: BookOpenIcon };
    case "docs_read": return { label: `Read docs:${s("id")}`, Icon: BookOpenIcon };
    default: return { label: name.replace(/_/g, " "), Icon: WrenchIcon };
  }
}

/** Shell tools report a JSON envelope; what matters to a reader is the output inside it. */
function readable(text: string): string {
  try {
    const parsed = JSON.parse(text) as { output?: unknown };
    if (typeof parsed.output === "string") return parsed.output;
  } catch {
    // plain text already
  }
  return text;
}

function Pre({ children, className }: { children: React.ReactNode; className?: string }): React.ReactElement {
  return <pre className={cn("max-h-56 overflow-auto rounded-md bg-muted px-2.5 py-2 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap break-words", className)}>{children}</pre>;
}

function Diff({ path, oldText, newText }: { path: string; oldText: string | null; newText: string }): React.ReactElement {
  const lines = (s: string) => s.replace(/\n$/, "").split("\n");
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="truncate border-b bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground">{path.split("/").pop()}</div>
      <div className="max-h-56 overflow-auto font-mono text-[11.5px] leading-relaxed">
        {oldText && lines(oldText).map((l, i) => <div key={`o${i}`} className="bg-destructive/10 px-2.5 whitespace-pre-wrap text-destructive-foreground">- {l}</div>)}
        {newText && lines(newText).map((l, i) => <div key={`n${i}`} className="bg-success/10 px-2.5 whitespace-pre-wrap text-success-foreground">+ {l}</div>)}
      </div>
    </div>
  );
}

/**
 * One tool call: a quiet row with its live status, opening to what it did. A call of one of our
 * tools reads as what it did ("Rows of contacts") and shows the card it drew under the row.
 */
export function Tool({ call, widget }: { call: ToolCall; widget?: AgentWidget }): React.ReactElement {
  const status = call.status ?? "pending";
  const running = status === "pending" || status === "in_progress";
  const failed = status === "failed";
  const ours = ourTool(call.title);
  const shown = ours ? describe(ours, (call.rawInput && typeof call.rawInput === "object" ? call.rawInput : {}) as Record<string, unknown>) : null;
  const Icon = shown?.Icon ?? kindIcons[call.kind ?? ""] ?? WrenchIcon;
  const content = call.content ?? [];
  const hasBody = content.some((c) => c.type !== "terminal");

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Collapsible className="min-w-0 rounded-lg border bg-background/60 text-xs">
        <CollapsibleTrigger disabled={!hasBody} className="group/tool flex h-8 w-full min-w-0 items-center gap-2 px-2.5 text-left outline-none">
          <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className={cn("min-w-0 flex-1 truncate text-foreground", shown ? "text-xs" : "font-mono text-[11.5px]")}>{shown?.label ?? call.title}</span>
          {running ? <LoaderCircleIcon className="size-3.5 shrink-0 animate-spin text-muted-foreground" /> : failed ? <CircleAlertIcon className="size-3.5 shrink-0 text-destructive" /> : <CheckIcon className="size-3.5 shrink-0 text-success" />}
          {hasBody && <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/tool:rotate-90" />}
        </CollapsibleTrigger>
        {hasBody && (
          <CollapsiblePanel>
            <div className="flex flex-col gap-2 border-t p-2">
              {content.map((c, i) =>
                c.type === "content" ? (
                  <Pre key={i} className={failed ? "text-destructive-foreground" : undefined}>
                    {readable(contentText(c.content))}
                  </Pre>
                ) : c.type === "diff" ? (
                  <Diff key={i} path={c.path} oldText={c.oldText ?? null} newText={c.newText} />
                ) : null,
              )}
            </div>
          </CollapsiblePanel>
        )}
      </Collapsible>
      {widget && <Widget widget={widget} />}
    </div>
  );
}
