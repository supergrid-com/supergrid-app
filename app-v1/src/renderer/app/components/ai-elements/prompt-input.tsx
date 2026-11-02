import { ArrowUpIcon, CheckIcon, SquareIcon } from "lucide-react";
import * as React from "react";
import { Button } from "~/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "~/components/ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { usePlatform } from "~/lib/platform";
import { cn } from "~/lib/utils";

/** The input bar: a slim rounded field that holds the text and the send button. */
export function PromptInput({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn("flex items-end gap-1 rounded-2xl border bg-admin-raised py-1 ps-3 pe-1 text-foreground transition-colors focus-within:border-foreground/20", className)} {...props} />;
}

/** Enter sends and Shift+Enter makes a new line. It grows with its content, up to a limit. */
export function PromptInputTextarea({ value, onChange, onSubmit, placeholder, disabled, autoFocus }: { value: string; onChange: (value: string) => void; onSubmit: () => void; placeholder: string; disabled?: boolean; autoFocus?: boolean }): React.ReactElement {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      disabled={disabled}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          onSubmit();
        }
      }}
      className="max-h-50 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-sm leading-5 outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
    />
  );
}

/** The quiet row under the bar: model, mode, context. */
export function PromptInputFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn("flex min-w-0 items-center justify-end gap-0.5 px-1 pt-1", className)} {...props} />;
}

/** A small picker in the composer's footer: model, mode. */
export function PromptInputSelect({ label, value, options, onChange, disabled }: { label: string; value: string; options: { id: string; name: string; description?: string | null }[]; onChange: (id: string) => void; disabled?: boolean }): React.ReactElement {
  const { adminDark } = usePlatform();
  const current = options.find((o) => o.id === value);
  return (
    <Menu>
      <MenuTrigger render={<Button variant="ghost" size="xs" disabled={disabled} aria-label={label} className="min-w-0 shrink gap-1 px-1.5 font-normal text-muted-foreground hover:text-foreground data-popup-open:text-foreground" />}>
        <span className="truncate">{current?.name ?? value}</span>
      </MenuTrigger>
      <MenuPopup align="start" side="top" className={cn("on-admin max-w-72 text-foreground", adminDark ? "dark" : "light")}>
        {options.map((o) => (
          <MenuItem key={o.id} onClick={() => onChange(o.id)}>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">{o.name}</span>
              {o.description && <span className="text-xs text-muted-foreground">{o.description}</span>}
            </span>
            {o.id === value && <CheckIcon className="size-4 shrink-0 opacity-70" />}
          </MenuItem>
        ))}
      </MenuPopup>
    </Menu>
  );
}

export function PromptInputSubmit({ busy, disabled, onSubmit, onStop }: { busy: boolean; disabled: boolean; onSubmit: () => void; onStop: () => void }): React.ReactElement {
  const label = busy ? "Stop" : "Send";
  return (
    <Tooltip>
      <TooltipTrigger render={<Button size="icon-sm" variant="ghost" aria-label={label} disabled={!busy && disabled} onClick={busy ? onStop : onSubmit} className="size-8 shrink-0 rounded-xl sm:size-8" />}>{busy ? <SquareIcon className="size-3.5 fill-current" /> : <ArrowUpIcon />}</TooltipTrigger>
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );
}
