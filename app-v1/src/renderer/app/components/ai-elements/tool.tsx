import type { DynamicToolUIPart } from "ai";
import { CheckIcon, ChevronRightIcon, CircleAlertIcon, FilePenIcon, FileTextIcon, GlobeIcon, LoaderCircleIcon, SearchIcon, TerminalIcon, Trash2Icon, WrenchIcon, type LucideIcon } from "lucide-react";
import type * as React from "react";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "~/components/ui/collapsible";
import type { ToolOutput } from "~/lib/agent/provider";
import { cn } from "~/lib/utils";

const kindIcons: Record<string, LucideIcon> = { execute: TerminalIcon, read: FileTextIcon, edit: FilePenIcon, delete: Trash2Icon, search: SearchIcon, fetch: GlobeIcon };

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

/** One tool call: a quiet row with its live status, opening to what it did. */
export function Tool({ part }: { part: DynamicToolUIPart }): React.ReactElement {
  const meta = (part.toolMetadata ?? {}) as { kind?: string; status?: string; title?: string };
  const output = part.state === "output-available" ? (part.output as ToolOutput) : null;
  const failed = part.state === "output-error";
  const status = failed ? "failed" : (output?.status ?? meta.status ?? "pending");
  const running = status === "pending" || status === "in_progress";
  const title = output?.title ?? part.title ?? meta.title ?? part.toolName;
  const Icon = kindIcons[meta.kind ?? part.toolName] ?? WrenchIcon;
  const hasBody = failed || (output?.content.length ?? 0) > 0;

  return (
    <Collapsible className="min-w-0 rounded-lg border bg-background/60 text-xs">
      <CollapsibleTrigger disabled={!hasBody} className="group/tool flex h-8 w-full min-w-0 items-center gap-2 px-2.5 text-left outline-none">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-foreground">{title}</span>
        {running ? <LoaderCircleIcon className="size-3.5 shrink-0 animate-spin text-muted-foreground" /> : failed || status === "failed" ? <CircleAlertIcon className="size-3.5 shrink-0 text-destructive" /> : <CheckIcon className="size-3.5 shrink-0 text-success" />}
        {hasBody && <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/tool:rotate-90" />}
      </CollapsibleTrigger>
      {hasBody && (
        <CollapsiblePanel>
          <div className="flex flex-col gap-2 border-t p-2">
            {failed && <Pre className="text-destructive-foreground">{part.errorText}</Pre>}
            {output?.content.map((c, i) => (c.type === "text" ? <Pre key={i}>{readable(c.text)}</Pre> : c.type === "diff" ? <Diff key={i} path={c.path} oldText={c.oldText} newText={c.newText} /> : null))}
          </div>
        </CollapsiblePanel>
      )}
    </Collapsible>
  );
}
