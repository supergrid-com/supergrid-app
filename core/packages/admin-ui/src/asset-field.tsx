// A field that holds a workspace asset (a picture, a video, a file): opens the shell's media picker through the admin
// SDK, shows what was picked, and carries it in a hidden input as JSON so a plain <Form> post gets it. Standalone, where
// there is no shell, it explains that instead of failing.
import { ImageIcon, XIcon } from "lucide-react";
import type { Asset, AssetKind } from "@supergrid/app-kit/rpc";
import * as React from "react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";
import { useAdmin } from "./shell";

/** What an asset column stores: enough to draw it again without asking the workspace. */
export type AssetRef = Pick<Asset, "id" | "kind" | "provider" | "name" | "title" | "alt" | "width" | "height" | "urls">;
export const toAssetRef = (a: Asset): AssetRef => ({ id: a.id, kind: a.kind, provider: a.provider, name: a.name, title: a.title, alt: a.alt, width: a.width, height: a.height, urls: a.urls });
/** The value an asset column holds, parsed; null when empty or not JSON. */
export function parseAssetRef(value: unknown): AssetRef | null {
  if (!value) return null;
  if (typeof value === "object") return value as AssetRef;
  try { return JSON.parse(String(value)) as AssetRef; } catch { return null; }
}

export function AssetField({ name, value, onChange, kinds = ["image"], label = "Choose", className }: { /** The form field name; the JSON of the asset goes in a hidden input under it. */ name?: string; value: AssetRef | null; onChange?: (next: AssetRef | null) => void; kinds?: AssetKind[]; label?: string; className?: string }): React.ReactElement {
  const { host } = useAdmin();
  const [inner, setInner] = React.useState<AssetRef | null>(value);
  React.useEffect(() => setInner(value), [value]);
  const set = (next: AssetRef | null) => { setInner(next); onChange?.(next); };
  const pick = async () => {
    const a = await host?.pickAsset({ kinds });
    if (a) set(toAssetRef(a));
  };
  const thumb = inner?.urls.thumbnail ?? (inner?.kind === "image" ? inner.urls.src : null);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {name && <input type="hidden" name={name} value={inner ? JSON.stringify(inner) : ""} />}
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground">
        {thumb ? <img src={thumb} alt={inner?.alt ?? ""} className="size-full object-cover" /> : <ImageIcon className="size-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{inner ? (inner.title ?? inner.name) : <span className="text-muted-foreground">Nothing chosen</span>}</div>
        {inner?.width && inner.height && <div className="text-xs text-muted-foreground">{inner.width} × {inner.height}</div>}
      </div>
      {host?.embedded ? (
        <Button type="button" size="sm" variant="outline" onClick={() => void pick()}>{label}</Button>
      ) : (
        <span className="text-xs text-muted-foreground">Open from SuperGrid to pick from the library</span>
      )}
      {inner && (
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Clear" onClick={() => set(null)}>
          <XIcon />
        </Button>
      )}
    </div>
  );
}
