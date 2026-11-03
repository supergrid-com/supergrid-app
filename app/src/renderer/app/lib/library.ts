import * as React from "react";
import type { LocalFile, UploadProgress } from "../../../shared/bridge";
import { toastManager } from "~/components/ui/toast";
import { sg } from "~/lib/bridge";
import { clean } from "~/lib/workspaces";

// What the Library pages read and the uploads they run. Listings come from the main process
// (src/main/library.ts) and sit in one store keyed by what they are, so a page that comes back
// shows what it had while it reads again. Uploads are jobs: the main process reports each one's
// bytes under the id made here, and the tray shows them wherever the page is.

/** The metadata key an upload carries so Images and Stream, which are account-wide, remember which workspace put it there. */
export const WS_META = "sg_workspace";

export type Entry<T> = { data: T | null; error?: string; loading: boolean; at: number };
const store = new Map<string, Entry<unknown>>();
const loaders = new Map<string, () => Promise<unknown>>();
const listeners = new Set<() => void>();

function set(key: string, next: Entry<unknown>): void {
  store.set(key, next);
  for (const l of listeners) l();
}

/** Reads a key again with the loader its page registered. */
export async function reload(key: string): Promise<void> {
  const load = loaders.get(key);
  if (!load) return;
  const cur = store.get(key);
  set(key, { data: cur?.data ?? null, loading: true, at: cur?.at ?? 0 });
  try {
    set(key, { data: await load(), loading: false, at: Date.now() });
  } catch (e) {
    set(key, { data: cur?.data ?? null, error: clean(e), loading: false, at: Date.now() });
  }
}

/** Reads every key that starts with `prefix` again: after an upload, a rename, a delete. */
export function invalidate(prefix: string): void {
  for (const key of store.keys()) if (key.startsWith(prefix)) void reload(key);
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/** The entry for a key, loaded on first use. `data` is null until the first answer. */
export function useRemote<T>(key: string | null, load: () => Promise<T>): Entry<T> & { refresh: () => Promise<void> } {
  if (key) loaders.set(key, load);
  const entry = React.useSyncExternalStore(subscribe, () => (key ? store.get(key) : undefined), () => (key ? store.get(key) : undefined)) as Entry<T> | undefined;
  React.useEffect(() => {
    if (key && !store.get(key)) void reload(key);
  }, [key]);
  const refresh = React.useCallback(() => (key ? reload(key) : Promise.resolve()), [key]);
  return { ...(entry ?? { data: null, loading: !!key && !!sg, at: 0 }), refresh };
}

// ---- uploads ----

export type UploadJob = { id: string; name: string; size: number; loaded: number; status: "uploading" | "done" | "error"; error?: string };

let jobs: UploadJob[] = [];
const jobListeners = new Set<() => void>();
let seq = 0;
let listening = false;

function setJobs(next: UploadJob[]): void {
  jobs = next;
  for (const l of jobListeners) l();
}
const patchJob = (id: string, next: Partial<UploadJob>) => setJobs(jobs.map((j) => (j.id === id ? { ...j, ...next } : j)));

function listen(): void {
  if (listening || !sg) return;
  listening = true;
  sg.library.onProgress((p: UploadProgress) => patchJob(p.job, { loaded: p.loaded, status: p.status, error: p.error }));
}

/** The uploads this window started, newest first, and a way to clear the finished ones. */
export function useUploadJobs(): { jobs: UploadJob[]; clear: () => void; cancel: (id: string) => void } {
  const list = React.useSyncExternalStore(
    (cb) => {
      jobListeners.add(cb);
      return () => jobListeners.delete(cb);
    },
    () => jobs,
    () => jobs,
  );
  return { jobs: list, clear: () => setJobs(jobs.filter((j) => j.status === "uploading")), cancel: (id) => void sg?.library.cancel(id) };
}

/** Runs one upload as a job: `work` gets the job id to hand the main process. Null when it failed; the error is shown. */
export async function runUpload<T>(file: Pick<LocalFile, "name" | "size">, work: (job: string) => Promise<T>): Promise<T | null> {
  listen();
  const id = `u${++seq}-${Date.now()}`;
  setJobs([{ id, name: file.name, size: file.size, loaded: 0, status: "uploading" }, ...jobs]);
  try {
    const out = await work(id);
    patchJob(id, { status: "done", loaded: file.size });
    return out;
  } catch (e) {
    const message = clean(e);
    patchJob(id, { status: "error", error: message });
    if (message !== "Cancelled") toastManager.add({ title: `${file.name} did not upload`, description: message, type: "error" });
    return null;
  }
}

/** A dropped File as the main process wants it: its path on this Mac. Null outside the app. */
export function toLocal(file: File): LocalFile | null {
  if (!sg) return null;
  const path = sg.library.pathOf(file);
  return path ? { path, name: file.name, size: file.size, type: file.type || null } : null;
}

/** The files a drop carries, with the ones inside dropped folders. */
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

/** Drag-and-drop onto a page: the handlers for its outer element and whether a drag is over it. */
export function useDropFiles(onFiles: (files: LocalFile[]) => void): { dragging: boolean; handlers: Pick<React.HTMLAttributes<HTMLElement>, "onDragEnter" | "onDragLeave" | "onDragOver" | "onDrop"> } {
  const [depth, setDepth] = React.useState(0);
  const handlers = React.useMemo(
    () => ({
      onDragEnter: (e: React.DragEvent) => {
        if (e.dataTransfer.types.includes("Files")) setDepth((n) => n + 1);
      },
      onDragLeave: () => setDepth((n) => Math.max(0, n - 1)),
      onDragOver: (e: React.DragEvent) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault();
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        setDepth(0);
        void filesFromDrop(e.dataTransfer).then((files) => {
          const local = files.map(toLocal).filter((f): f is LocalFile => !!f);
          if (local.length) onFiles(local);
        });
      },
    }),
    [onFiles],
  );
  return { dragging: depth > 0, handlers };
}

/** The native picker, as local files. */
export async function pickFiles(kind: "image" | "media" | "file" | "any", multiple = true): Promise<LocalFile[]> {
  if (!sg) return [];
  return sg.library.pick({ kind, multiple });
}
