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
        "flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm leading-[1.6] text-foreground",
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
  return <div className={cn("-ms-1.5 flex items-center gap-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100", className)} {...props} />;
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

/** "6 minutes ago", "yesterday", and so on; the date and time in full on hover. */
function ago(at: number, now: number): string {
  const seconds = Math.max(0, (now - at) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return relative.format(-Math.round(seconds / 60), "minute");
  if (seconds < 86400) return relative.format(-Math.round(seconds / 3600), "hour");
  if (seconds < 7 * 86400) return relative.format(-Math.round(seconds / 86400), "day");
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: new Date(at).getFullYear() === new Date(now).getFullYear() ? undefined : "numeric" });
}

/** When a message was sent, kept current while it shows. */
export function MessageTime({ at }: { at: number }): React.ReactElement {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const date = new Date(at);
  return (
    <time dateTime={date.toISOString()} title={date.toLocaleString()} className="px-1.5 text-xs whitespace-nowrap text-muted-foreground">
      {ago(at, now)}
    </time>
  );
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
