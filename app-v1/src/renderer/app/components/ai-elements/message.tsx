import { code } from "@streamdown/code";
import { CheckIcon, CopyIcon } from "lucide-react";
import * as React from "react";
import { Streamdown } from "streamdown";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

type From = "user" | "assistant" | "system";

export function Message({ from, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { from: From }): React.ReactElement {
  return <div className={cn("group flex w-full min-w-0 flex-col gap-2", from === "user" ? "is-user items-end" : "is-assistant", className)} {...props} />;
}

export function MessageContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn(
        "flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm leading-relaxed text-foreground",
        "group-[.is-user]:max-w-[88%] group-[.is-user]:rounded-2xl group-[.is-user]:rounded-br-md group-[.is-user]:border group-[.is-user]:bg-background group-[.is-user]:px-3.5 group-[.is-user]:py-2 group-[.is-user]:whitespace-pre-wrap",
        className,
      )}
      {...props}
    />
  );
}

const plugins = { code };
// the agent's links are mostly file paths, so they stay plain text in the chat for now
const linkSafety = { enabled: false };

/** The agent's markdown, safe to render while it is still arriving. */
export const MessageResponse = React.memo(function MessageResponse({ children, streaming, className }: { children: string; streaming?: boolean; className?: string }): React.ReactElement {
  return (
    <Streamdown plugins={plugins} linkSafety={linkSafety} isAnimating={streaming} caret={streaming ? "block" : undefined} className={cn("min-w-0 max-w-full", className)}>
      {children}
    </Streamdown>
  );
});

export function MessageActions({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn("-ms-1.5 flex items-center gap-0.5 text-muted-foreground opacity-0 transition-opacity group-last:opacity-100 group-hover:opacity-100", className)} {...props} />;
}

export function CopyAction({ text }: { text: string }): React.ReactElement {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Copy" onClick={copy} className="text-muted-foreground hover:text-foreground" />}>{copied ? <CheckIcon /> : <CopyIcon />}</TooltipTrigger>
      <TooltipPopup>{copied ? "Copied" : "Copy"}</TooltipPopup>
    </Tooltip>
  );
}

export function MessageNotice({ level, children }: { level: "info" | "error"; children: React.ReactNode }): React.ReactElement {
  return <div className={cn("rounded-lg border px-3 py-2 text-xs leading-relaxed", level === "error" ? "border-destructive/30 bg-destructive/8 text-destructive-foreground" : "text-muted-foreground")}>{children}</div>;
}
