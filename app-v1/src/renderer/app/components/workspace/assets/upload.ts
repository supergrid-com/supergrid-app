import type { Asset, UploadInput } from "@supergrid/app-kit/rpc";
import { measureFile, sendBytes, type UploadProgress } from "@supergrid/app-kit/media";
import * as React from "react";
import { toastManager } from "~/components/ui/toast";
import { isDesktop } from "~/lib/bridge";
import { APP_ID, call } from "~/lib/ws-api";
import { invalidate } from "~/lib/ws-query";

// Uploads from the Assets page: a ticket from the workspace, the bytes straight to the provider,
// then the confirmation (core/workspace/ASSETS.md). In the browser mock there is nowhere to send
// bytes, so the file is kept as an object URL and shown from there.

export type UploadJob = { id: string; file: File; progress: UploadProgress; status: "uploading" | "done" | "error"; asset?: Asset; error?: string; cancel: () => void };

const previews = new Map<string, string>();
/** The local object URL for an asset uploaded in this session without a real provider (the mock). */
export const previewFor = (asset: Pick<Asset, "id">): string | undefined => previews.get(asset.id);

export function useAssetUploads(wsId: string) {
  const [jobs, setJobs] = React.useState<UploadJob[]>([]);
  const seq = React.useRef(0);
  const patch = React.useCallback((id: string, next: Partial<UploadJob>) => setJobs((list) => list.map((j) => (j.id === id ? { ...j, ...next } : j))), []);
  const upload = React.useCallback(
    async (file: File, input: Partial<UploadInput> = {}): Promise<Asset | null> => {
      const id = `u${++seq.current}`;
      const controller = new AbortController();
      setJobs((list) => [{ id, file, progress: { loaded: 0, total: file.size, fraction: 0 }, status: "uploading", cancel: () => controller.abort() }, ...list]);
      try {
        const [ticket, measured] = await Promise.all([call(wsId, "createUpload", APP_ID, { name: file.name, mime: file.type || undefined, size: file.size, ...input }), measureFile(file)]);
        if (isDesktop) await sendBytes(ticket, file, (progress) => patch(id, { progress }), controller.signal);
        else previews.set(ticket.asset.id, URL.createObjectURL(file));
        const asset = await call(wsId, "completeUpload", APP_ID, ticket.asset.id, measured);
        patch(id, { status: "done", asset, progress: { loaded: file.size, total: file.size, fraction: 1 } });
        invalidate(wsId, "assets");
        return asset;
      } catch (e) {
        const message = (e as Error).name === "AbortError" ? "Cancelled" : String((e as Error)?.message ?? e);
        patch(id, { status: "error", error: message });
        if ((e as Error).name !== "AbortError") toastManager.add({ title: `${file.name} did not upload`, description: message, type: "error" });
        invalidate(wsId, "assets");
        return null;
      }
    },
    [wsId, patch],
  );
  const uploadAll = React.useCallback((files: Iterable<File>, input: Partial<UploadInput> = {}) => Promise.all([...files].map((f) => upload(f, input))), [upload]);
  const clear = React.useCallback(() => setJobs((list) => list.filter((j) => j.status === "uploading")), []);
  const active = jobs.filter((j) => j.status === "uploading").length;
  return { jobs, active, upload, uploadAll, clear };
}

/** Files from a drop event, including the ones inside dropped folders where the browser lets us see them. */
export async function filesFromDrop(dt: DataTransfer): Promise<File[]> {
  const out: File[] = [];
  const entries = [...dt.items].map((i) => (typeof i.webkitGetAsEntry === "function" ? i.webkitGetAsEntry() : null));
  if (!entries.some(Boolean)) return [...dt.files];
  const walk = async (entry: FileSystemEntry | null): Promise<void> => {
    if (!entry) return;
    if (entry.isFile) {
      const file = await new Promise<File | null>((resolve) => (entry as FileSystemFileEntry).file(resolve, () => resolve(null)));
      if (file && !file.name.startsWith(".")) out.push(file);
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      let batch: FileSystemEntry[];
      do {
        batch = await new Promise<FileSystemEntry[]>((resolve) => reader.readEntries(resolve, () => resolve([])));
        for (const e of batch) await walk(e);
      } while (batch.length);
    }
  };
  for (const e of entries) await walk(e);
  return out;
}
