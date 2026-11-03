import { ShieldQuestionIcon } from "lucide-react";
import type * as React from "react";
import type { RequestPermissionParams } from "../../../../shared/acp";
import { Button } from "~/components/ui/button";

/**
 * The agent is waiting for a yes or no before it runs something. `title` is the tool call's, since
 * a request need not repeat it.
 */
export function Confirmation({ params, title, onChoose, onCancel }: { params: RequestPermissionParams; title?: string; onChoose: (optionId: string) => void; onCancel: () => void }): React.ReactElement {
  const call = params.toolCall;
  const input = call.rawInput as { command?: unknown } | string | undefined;
  const detail = typeof input === "string" ? input : typeof input?.command === "string" ? input.command : input !== undefined ? JSON.stringify(input, null, 2) : null;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-warning/50 bg-background p-3 text-sm text-foreground">
      <div className="flex items-center gap-2 font-medium">
        <ShieldQuestionIcon className="size-4 shrink-0 text-warning-foreground" />
        <span>Allow this action?</span>
      </div>
      <div className="min-w-0 truncate font-mono text-xs text-muted-foreground">{call.title ?? title ?? "The agent wants to run a tool"}</div>
      {detail && <pre className="max-h-40 overflow-auto rounded-md bg-muted px-2.5 py-2 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap break-words">{detail}</pre>}
      <div className="flex flex-wrap items-center gap-1.5">
        {params.options.map((o) => (
          <Button key={o.optionId} size="xs" variant={o.kind.startsWith("allow") ? "default" : "outline"} onClick={() => onChoose(o.optionId)}>
            {o.name}
          </Button>
        ))}
        <Button size="xs" variant="ghost" onClick={onCancel}>
          Stop
        </Button>
      </div>
    </div>
  );
}
