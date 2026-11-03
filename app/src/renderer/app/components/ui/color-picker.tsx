"use client";

import { CheckIcon, PipetteIcon } from "lucide-react";
import * as React from "react";
import { ColorPicker as Picker } from "react-beautiful-color";
import { Popover, PopoverPopup, PopoverTrigger } from "~/components/ui/popover";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { isDark, parseHex } from "~/lib/theme";
import { cn } from "~/lib/utils";

// The kit's color picker, on react-beautiful-color's compound pieces: a saturation square, a hue
// bar, the eyedropper, the hex to edit, and a row of palette dots for the colors a theme is
// usually made of. `ColorPicker` is the whole thing in a popover behind a pill in the color;
// `ColorPickerPanel` is the inside, for anywhere it should sit inline; `ColorDots` the row alone.
// Values are hex strings.

/** A row of swatches; the current one is marked. */
export function ColorDots({ colors, value, onChange, size = "default", className }: { colors: readonly string[]; value?: string; onChange: (hex: string) => void; size?: "sm" | "default"; className?: string }): React.ReactElement {
  const current = value?.toLowerCase();
  return (
    <div role="group" className={cn("flex flex-wrap items-center", size === "sm" ? "gap-1.5" : "gap-2", className)}>
      {colors.map((c) => {
        const on = c.toLowerCase() === current;
        return (
          <Tooltip key={c}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={c}
                  aria-pressed={on}
                  onClick={() => onChange(c.toLowerCase())}
                  className={cn("flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/10 outline-none transition-transform hover:scale-110 active:scale-95 dark:border-white/15", size === "sm" ? "size-5" : "size-6", on && "ring-2 ring-foreground/60 ring-offset-2 ring-offset-background")}
                  style={{ background: c }}
                />
              }
            >
              {on && <CheckIcon className={cn("size-3", isDark(c) ? "text-white" : "text-black")} strokeWidth={3} />}
            </TooltipTrigger>
            <TooltipPopup className="font-mono text-xs uppercase">{c}</TooltipPopup>
          </Tooltip>
        );
      })}
    </div>
  );
}

/** The hex, typed: commits on Enter or blur when it parses, otherwise snaps back. */
function HexInput({ value, onChange, className }: { value: string; onChange: (hex: string) => void; className?: string }): React.ReactElement {
  const [text, setText] = React.useState(value);
  const [editing, setEditing] = React.useState(false);
  if (!editing && text !== value) setText(value);
  const commit = () => {
    setEditing(false);
    const next = text.trim().startsWith("#") ? text.trim() : `#${text.trim()}`;
    if (parseHex(next)) onChange(next.toLowerCase());
    else setText(value);
  };
  return (
    <input
      aria-label="Hex"
      value={editing ? text : value}
      onFocus={() => setEditing(true)}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setText(value);
          setEditing(false);
        }
      }}
      spellCheck={false}
      className={cn("min-w-0 bg-transparent font-mono text-sm uppercase outline-none", className)}
    />
  );
}

export function ColorPickerPanel({ value, onChange, palette, className }: { value: string; onChange: (hex: string) => void; palette?: readonly string[]; className?: string }): React.ReactElement {
  const hex = parseHex(value) ? value.toLowerCase() : "#000000";
  return (
    <div className={cn("flex w-64 flex-col gap-3", className)}>
      <Picker color={{ type: "hex", value: hex }} onChange={(c) => onChange(c.getHex().toLowerCase())} className="h-auto w-full gap-3 rounded-none bg-transparent shadow-none">
        <Picker.Saturation className="h-40 overflow-hidden rounded-lg border border-black/8 dark:border-white/10 [&_.react-colorful-pointer]:size-5 [&_.react-colorful-pointer]:border-[3px]" />
        <div className="flex items-center gap-3">
          <Picker.EyeDropper title="Pick a color from the screen" className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <PipetteIcon className="size-4" />
          </Picker.EyeDropper>
          <Picker.Hue className="h-3.5 flex-1 overflow-hidden rounded-full [&_.react-colorful-pointer]:size-4 [&_.react-colorful-pointer]:border-[3px]" />
        </div>
      </Picker>
      <div className="flex items-center gap-2">
        <span className="size-8 shrink-0 rounded-lg border border-black/10 dark:border-white/15" style={{ background: hex }} />
        <div className="flex h-8 flex-1 items-center rounded-lg border border-input bg-background px-2.5">
          <HexInput value={hex} onChange={onChange} className="w-full" />
        </div>
      </div>
      {palette && palette.length > 0 && <ColorDots colors={palette} value={hex} onChange={onChange} size="sm" />}
    </div>
  );
}

/** The pill: the color itself, the hex on it, and the picker in a popover under it. */
export function ColorPicker({
  value,
  onChange,
  palette,
  label = "Color",
  className,
  align = "end",
}: {
  value: string;
  onChange: (hex: string) => void;
  /** Dots under the picker, and the colors a theme is usually made of. */
  palette?: readonly string[];
  label?: string;
  className?: string;
  align?: "start" | "center" | "end";
}): React.ReactElement {
  const hex = parseHex(value) ? value.toLowerCase() : "#000000";
  const ink = isDark(hex) ? "#ffffff" : "#111111";
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`${label}: ${hex}`}
            className={cn("relative flex h-9 w-44 cursor-pointer items-center gap-2 rounded-lg border border-black/10 px-3 text-left shadow-xs/5 outline-none transition-shadow hover:shadow-sm data-popup-open:border-active data-popup-open:shadow-[0_0_0_1px_var(--active)] dark:border-white/10", className)}
            style={{ background: hex, color: ink }}
          />
        }
      >
        <PipetteIcon className="size-4 shrink-0 opacity-80" />
        <span className="min-w-0 flex-1 truncate font-mono text-sm uppercase">{hex}</span>
      </PopoverTrigger>
      {/* the popup pads its own viewport (p-4); nothing more here */}
      <PopoverPopup align={align} className="w-auto">
        <ColorPickerPanel value={hex} onChange={onChange} palette={palette} />
      </PopoverPopup>
    </Popover>
  );
}
