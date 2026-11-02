import * as React from "react";
import { Button } from "~/components/ui/button";
import { Combobox, ComboboxChip, ComboboxChips, ComboboxChipsInput, ComboboxEmpty, ComboboxItem, ComboboxList, ComboboxPopup, ComboboxValue } from "~/components/ui/combobox";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "~/components/ui/dialog";
import type { Workspace } from "~/lib/mock";
import { APP_ID } from "~/lib/ws-api";
import { useWsMutation, useWsQuery } from "~/lib/ws-query";

// Picking tags: a chips combobox over the workspace's tags, where typing a new name and
// pressing Enter makes one up. Used by the bulk dialog, the add-contact dialog and the detail.
export function TagsPicker({ ws, value, onChange, placeholder = "Add tag…", autoFocus, allowNew = true }: { ws: Workspace; value: string[]; onChange: (next: string[]) => void; placeholder?: string; autoFocus?: boolean; allowNew?: boolean }): React.ReactElement {
  const tags = useWsQuery(ws.id, "listTags", [], { tags: ["contacts", "tags"] });
  const [text, setText] = React.useState("");
  const known = React.useMemo(() => (tags.data ?? []).map((t) => t.tag), [tags.data]);
  // every value stays selectable even when the workspace has not seen it yet
  const items = React.useMemo(() => [...new Set([...known, ...value])], [known, value]);
  const add = (tag: string) => {
    const t = tag.trim().toLowerCase().replace(/\s+/g, "-");
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setText("");
  };
  return (
    <Combobox multiple items={items} value={value} onValueChange={(v) => onChange(v as string[])} inputValue={text} onInputValueChange={setText}>
      <ComboboxChips>
        <ComboboxValue>
          {(vals: string[]) => (
            <>
              {vals.map((v) => (
                <ComboboxChip key={v} aria-label={v}>
                  {v}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput
                placeholder={vals.length ? "" : placeholder}
                autoFocus={autoFocus}
                size="sm"
                onKeyDown={(e) => {
                  // Enter on a name no tag matches makes a new one
                  if (allowNew && e.key === "Enter" && text.trim() && !items.some((i) => i.toLowerCase() === text.trim().toLowerCase())) {
                    e.preventDefault();
                    add(text);
                  }
                }}
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxPopup>
        <ComboboxEmpty>{allowNew && text.trim() ? `Press Enter to add "${text.trim()}"` : "No tags"}</ComboboxEmpty>
        <ComboboxList>{(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}</ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}

// Add or remove tags on a set of selected contacts.
export function BulkTagDialog({ ws, ids, mode, open, onOpenChange, onDone }: { ws: Workspace; ids: string[]; mode: "add" | "remove"; open: boolean; onOpenChange: (open: boolean) => void; onDone?: () => void }): React.ReactElement {
  const [tags, setTags] = React.useState<string[]>([]);
  const tag = useWsMutation(ws.id, "tagContacts", { invalidates: ["contacts"], title: "Tags did not change" });
  React.useEffect(() => {
    if (open) setTags([]);
  }, [open]);
  const apply = async () => {
    const out = await tag.run(APP_ID, ids, mode === "add" ? tags : undefined, mode === "remove" ? tags : undefined);
    if (out !== null) {
      onOpenChange(false);
      onDone?.();
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Tag" : "Untag"} {ids.length} contact{ids.length === 1 ? "" : "s"}</DialogTitle>
          <DialogDescription>{mode === "add" ? "Every selected contact gets these tags." : "These tags come off every selected contact."}</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <TagsPicker ws={ws} value={tags} onChange={setTags} autoFocus allowNew={mode === "add"} />
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button disabled={tags.length === 0} loading={tag.pending} onClick={() => void apply()}>
            {mode === "add" ? "Add tags" : "Remove tags"}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
