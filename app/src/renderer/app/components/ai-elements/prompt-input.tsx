import { ArrowUpIcon, CameraIcon, CheckIcon, ImageIcon, PaperclipIcon, PlusIcon, SquareIcon } from "lucide-react";
import * as React from "react";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuSub, MenuSubPopup, MenuSubTrigger, MenuTrigger } from "~/components/ui/menu";
import { SegmentedControl, SegmentedControlItem } from "~/components/ui/segmented-control";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

// The composer, after Claude Code's: the text across the top, and under it a row with + on the left
// and model, effort, mode and send on the right. In a narrow panel the row can't hold them all, so
// the + holds them instead (`useComposerNarrow`): the pickers fold into its menu as submenus.

type Option = { id: string; name: string; description?: string | null };

/** A picker as the + menu takes it: what PromptInputSelect shows, without the trigger. */
export type ComposerChoice = { label: string; value: string; options: Option[]; onChange: (id: string) => void; nameOf?: (o: Option) => string; disabled?: boolean };

const NarrowContext = React.createContext(false);
/** True inside a PromptInput too narrow for the toolbar's pickers (the pin-narrow agent panel). */
export const useComposerNarrow = (): boolean => React.useContext(NarrowContext);
const NARROW_WIDTH = 500;

/** The box: the text, then a toolbar. A click anywhere in it that isn't a control goes to the text. */
export function PromptInput({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  const ref = React.useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setNarrow(el.clientWidth < NARROW_WIDTH);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("button, textarea, [role=menu]")) return;
        e.preventDefault();
        ref.current?.querySelector("textarea")?.focus();
      }}
      className={cn("flex cursor-text flex-col rounded-[20px] border bg-card px-4 pt-3.5 pb-2.5 text-foreground shadow-xs/5 transition-colors focus-within:border-foreground/20", className)}
      {...props}
    >
      <NarrowContext.Provider value={narrow}>{children}</NarrowContext.Provider>
    </div>
  );
}

/** Enter sends and Shift+Enter makes a new line. Two lines tall to start, it grows with its content up to a limit. */
export function PromptInputTextarea({ value, onChange, onSubmit, placeholder, disabled, autoFocus }: { value: string; onChange: (value: string) => void; onSubmit: () => void; placeholder: string; disabled?: boolean; autoFocus?: boolean }): React.ReactElement {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 48), 240)}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={2}
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
      className="w-full resize-none bg-transparent text-base leading-6 outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
    />
  );
}

/** The row under the text: `start` on the left (the + button), the rest on the right. */
export function PromptInputToolbar({ start, children }: { start?: React.ReactNode; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="-me-1 flex min-w-0 items-center gap-1 pt-2">
      <div className="-ms-2 flex min-w-0 flex-1 items-center">{start}</div>
      <div className="flex min-w-0 items-center">{children}</div>
    </div>
  );
}

const triggerClass = "flex h-8 min-w-0 cursor-pointer items-center rounded-lg px-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60 data-popup-open:bg-accent data-popup-open:text-foreground";

const menuPopupClass = "rounded-xl text-foreground";
const menuItemClass = "gap-2.5 rounded-md px-2.5";

/**
 * The + at the start of the row: a menu of attachments (none wired up yet) and, in a narrow
 * composer, the thread's kind and every picker the row has no room for, each as a submenu.
 */
export function PromptInputAdd({ kind, choices = [] }: { kind?: { dev: boolean; onChange: (dev: boolean) => void; disabled?: boolean }; choices?: (ComposerChoice | false | null | undefined)[] }): React.ReactElement {
  const pickers = choices.filter((c): c is ComposerChoice => !!c);
  const attach = (icon: React.ReactNode, label: string) => (
    <MenuItem className={menuItemClass}>
      {icon}
      {label}
      <span className="ms-auto text-xs text-muted-foreground">Soon</span>
    </MenuItem>
  );
  return (
    <Menu>
      <MenuTrigger render={<button type="button" aria-label="Add" className={cn(triggerClass, "size-8 justify-center px-0")} />}>
        <PlusIcon className="size-5" />
      </MenuTrigger>
      <MenuPopup align="start" side="top" sideOffset={8} className={cn(menuPopupClass, "w-60")}>
        <MenuGroup>
          <MenuGroupLabel className="px-2.5 pt-1.5 pb-1 text-xs font-normal">Attach</MenuGroupLabel>
          {attach(<ImageIcon />, "Add Photos")}
          {attach(<PaperclipIcon />, "Add Files")}
          {attach(<CameraIcon />, "Take a Screenshot")}
        </MenuGroup>
        {kind && (
          <>
            <MenuSeparator />
            <MenuRadioGroup value={kind.dev ? "dev" : "agent"} onValueChange={(v) => kind.onChange(v === "dev")}>
              <MenuRadioItem value="agent" disabled={kind.disabled}>
                Agent
              </MenuRadioItem>
              <MenuRadioItem value="dev" disabled={kind.disabled}>
                Dev
              </MenuRadioItem>
            </MenuRadioGroup>
          </>
        )}
        {pickers.length > 0 && (
          <>
            <MenuSeparator />
            {pickers.map((c) => {
              const nameOf = c.nameOf ?? ((o: Option) => o.name);
              const current = c.options.find((o) => o.id === c.value);
              return (
                <MenuSub key={c.label}>
                  <MenuSubTrigger disabled={c.disabled} className={menuItemClass}>
                    <span className="shrink-0">{c.label}</span>
                    <span className="ms-auto min-w-0 truncate text-muted-foreground">{current ? nameOf(current) : c.value}</span>
                  </MenuSubTrigger>
                  <MenuSubPopup className={cn(menuPopupClass, "w-52")}>
                    <MenuRadioGroup value={c.value} onValueChange={(v) => c.onChange(String(v))}>
                      {c.options.map((o) => (
                        <MenuRadioItem key={o.id} value={o.id}>
                          {nameOf(o)}
                        </MenuRadioItem>
                      ))}
                    </MenuRadioGroup>
                  </MenuSubPopup>
                </MenuSub>
              );
            })}
          </>
        )}
      </MenuPopup>
    </Menu>
  );
}

/**
 * Agent or Dev, after the +: Agent works in the workspace (its rows, themes, library, analytics);
 * Dev may also change the shape of tables, run SQL by hand, and build and change the apps' code.
 * The thread's tools and the context each prompt carries follow it (lib/agent/provider.tsx).
 */
export function PromptInputKind({ dev, onChange, disabled }: { dev: boolean; onChange: (dev: boolean) => void; disabled?: boolean }): React.ReactElement {
  const item = (on: boolean, label: string, hint: string, value: boolean) => (
    <Tooltip>
      <TooltipTrigger render={<SegmentedControlItem aria-pressed={on} data-pressed={on || undefined} disabled={disabled} onClick={() => onChange(value)} className="px-2.5 text-[13px]" />}>{label}</TooltipTrigger>
      <TooltipPopup>{hint}</TooltipPopup>
    </Tooltip>
  );
  return (
    <SegmentedControl size="sm" aria-label="Agent or Dev" className="ms-1 bg-foreground/6">
      {item(!dev, "Agent", "Works in the workspace: rows, themes, library, analytics", false)}
      {item(dev, "Dev", "Can also change table shapes, run SQL and build app code", true)}
    </SegmentedControl>
  );
}

/**
 * A picker in the toolbar, as Claude Code's mode menu: a heading, each option with its description,
 * a check on the current one, and its number, which picks it while the menu is open.
 */
export function PromptInputSelect({ label, value, options, onChange, disabled, align = "end", nameOf = (o) => o.name, icon, strong }: { label: string; value: string; options: Option[]; onChange: (id: string) => void; disabled?: boolean; align?: "start" | "end"; /** The option's name in the trigger and the menu. */ nameOf?: (o: Option) => string; /** Shown before the name in the trigger, like Claude Code's mark beside the model. */ icon?: React.ReactNode; /** Full-strength text rather than muted, for the model. */ strong?: boolean }): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const current = options.find((o) => o.id === value);
  // a menu of bare names (the models) is narrower than one with descriptions (the modes)
  const described = options.some((o) => o.description);
  const pick = (id: string) => {
    setOpen(false);
    // the current one too: a folded choice (the model's) may stand for a variant the session isn't on
    onChange(id);
  };
  return (
    <Menu open={open} onOpenChange={setOpen}>
      <MenuTrigger render={<button type="button" disabled={disabled} aria-label={label} className={cn(triggerClass, "gap-1.5 px-1.5", strong && "text-foreground")} />}>
        {icon}
        <span className="truncate">{current ? nameOf(current) : value}</span>
      </MenuTrigger>
      <MenuPopup
        align={align}
        side="top"
        sideOffset={8}
        onKeyDown={(e) => {
          const n = Number(e.key);
          if (Number.isInteger(n) && n >= 1 && n <= Math.min(options.length, 9)) {
            e.preventDefault();
            pick(options[n - 1]!.id);
          }
        }}
        className={cn("max-w-[calc(100vw-2rem)] rounded-xl text-foreground", described ? "w-68" : "w-52")}
      >
        <MenuGroup>
          <MenuGroupLabel className="px-2.5 pt-1.5 pb-1 text-xs font-normal">{label}</MenuGroupLabel>
          {options.map((o, i) => (
            <MenuItem key={o.id} onClick={() => pick(o.id)} className="items-start gap-2.5 rounded-md px-2.5 py-1.5">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm leading-5">{nameOf(o)}</span>
                {o.description && <span className="text-xs leading-4 text-muted-foreground">{o.description}</span>}
              </span>
              <span className="flex h-5 shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {o.id === value && <CheckIcon className="size-3.5 text-info opacity-100!" />}
                {i < 9 && <span className="w-2 text-end tabular-nums">{i + 1}</span>}
              </span>
            </MenuItem>
          ))}
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}

/** The round send button; while a turn runs it stops it. */
export function PromptInputSubmit({ busy, disabled, onSubmit, onStop }: { busy: boolean; disabled: boolean; onSubmit: () => void; onStop: () => void }): React.ReactElement {
  const label = busy ? "Stop" : "Send";
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            disabled={!busy && disabled}
            onClick={busy ? onStop : onSubmit}
            className="ms-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground text-background outline-none transition-colors hover:bg-foreground/85 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:bg-foreground/10 disabled:text-foreground/50"
          />
        }
      >
        {busy ? <SquareIcon className="size-3.5 fill-current" /> : <ArrowUpIcon className="size-5" strokeWidth={2.25} />}
      </TooltipTrigger>
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );
}
