/**
 * An in-memory filesystem with the `fs.promises` surface isomorphic-git
 * needs. Workers have no disk; a working tree lives in a Map for one request
 * or one Workflow step and is thrown away.
 */

type Entry = { kind: "file"; data: Uint8Array; mode: number; mtime: number } | { kind: "dir"; mtime: number } | { kind: "link"; target: string; mtime: number };

class FsError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "FsError";
  }
}

function norm(p: string): string {
  const parts: string[] = [];
  for (const seg of p.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return "/" + parts.join("/");
}
function parent(p: string): string {
  const i = p.lastIndexOf("/");
  return i <= 0 ? "/" : p.slice(0, i);
}
function base(p: string): string {
  return p.slice(p.lastIndexOf("/") + 1);
}

const enc = new TextEncoder();
const dec = new TextDecoder();

export class MemoryFS {
  private entries = new Map<string, Entry>([["/", { kind: "dir", mtime: Date.now() }]]);
  readonly promises: MemoryFS;

  constructor() {
    this.promises = this;
  }

  private get(p: string): Entry | undefined {
    return this.entries.get(norm(p));
  }

  private stats(p: string, e: Entry) {
    const size = e.kind === "file" ? e.data.length : 0;
    const mode = e.kind === "file" ? e.mode : e.kind === "dir" ? 0o40000 : 0o120000;
    return {
      type: e.kind,
      mode,
      size,
      ino: 0,
      dev: 0,
      uid: 0,
      gid: 0,
      mtimeMs: e.mtime,
      ctimeMs: e.mtime,
      mtime: new Date(e.mtime),
      ctime: new Date(e.mtime),
      isFile: () => e.kind === "file",
      isDirectory: () => e.kind === "dir",
      isSymbolicLink: () => e.kind === "link",
    };
  }

  async readFile(p: string, opts?: { encoding?: string } | string): Promise<Uint8Array | string> {
    const e = this.get(p);
    if (!e) throw new FsError("ENOENT", `ENOENT: ${p}`);
    if (e.kind !== "file") throw new FsError("EISDIR", `EISDIR: ${p}`);
    const encoding = typeof opts === "string" ? opts : opts?.encoding;
    return encoding ? dec.decode(e.data) : e.data;
  }

  async writeFile(p: string, data: Uint8Array | string, opts?: { mode?: number; encoding?: string } | string): Promise<void> {
    const n = norm(p);
    const dir = this.get(parent(n));
    if (!dir || dir.kind !== "dir") throw new FsError("ENOENT", `ENOENT: ${parent(n)}`);
    const existing = this.get(n);
    const mode = (typeof opts === "object" && opts?.mode) || (existing?.kind === "file" ? existing.mode : 0o100644);
    this.entries.set(n, { kind: "file", data: typeof data === "string" ? enc.encode(data) : data, mode, mtime: Date.now() });
  }

  async unlink(p: string): Promise<void> {
    const n = norm(p);
    const e = this.get(n);
    if (!e) throw new FsError("ENOENT", `ENOENT: ${p}`);
    if (e.kind === "dir") throw new FsError("EISDIR", `EISDIR: ${p}`);
    this.entries.delete(n);
  }

  async readdir(p: string): Promise<string[]> {
    const n = norm(p);
    const e = this.get(n);
    if (!e) throw new FsError("ENOENT", `ENOENT: ${p}`);
    if (e.kind !== "dir") throw new FsError("ENOTDIR", `ENOTDIR: ${p}`);
    const names: string[] = [];
    for (const k of this.entries.keys()) if (k !== n && parent(k) === n) names.push(base(k));
    return names.sort();
  }

  async mkdir(p: string, opts?: { recursive?: boolean }): Promise<void> {
    const n = norm(p);
    if (this.get(n)) {
      if (opts?.recursive) return;
      throw new FsError("EEXIST", `EEXIST: ${p}`);
    }
    const par = parent(n);
    if (!this.get(par)) {
      if (opts?.recursive) await this.mkdir(par, opts);
      else throw new FsError("ENOENT", `ENOENT: ${par}`);
    }
    this.entries.set(n, { kind: "dir", mtime: Date.now() });
  }

  async rmdir(p: string): Promise<void> {
    const n = norm(p);
    const e = this.get(n);
    if (!e) throw new FsError("ENOENT", `ENOENT: ${p}`);
    if (e.kind !== "dir") throw new FsError("ENOTDIR", `ENOTDIR: ${p}`);
    for (const k of this.entries.keys()) if (k !== n && k.startsWith(n + "/")) throw new FsError("ENOTEMPTY", `ENOTEMPTY: ${p}`);
    this.entries.delete(n);
  }

  async stat(p: string) {
    const n = norm(p);
    let e = this.get(n);
    if (e?.kind === "link") e = this.get(norm(parent(n) + "/" + e.target)) ?? e;
    if (!e) throw new FsError("ENOENT", `ENOENT: ${p}`);
    return this.stats(n, e);
  }

  async lstat(p: string) {
    const e = this.get(p);
    if (!e) throw new FsError("ENOENT", `ENOENT: ${p}`);
    return this.stats(norm(p), e);
  }

  async readlink(p: string): Promise<string> {
    const e = this.get(p);
    if (!e || e.kind !== "link") throw new FsError("EINVAL", `EINVAL: ${p}`);
    return e.target;
  }

  async symlink(target: string, p: string): Promise<void> {
    this.entries.set(norm(p), { kind: "link", target, mtime: Date.now() });
  }

  async chmod(p: string, mode: number): Promise<void> {
    const e = this.get(p);
    if (!e) throw new FsError("ENOENT", `ENOENT: ${p}`);
    if (e.kind === "file") e.mode = mode;
  }

  /** Convenience: write a file creating parents. */
  async writeDeep(p: string, data: Uint8Array | string, mode?: number): Promise<void> {
    await this.mkdir(parent(norm(p)), { recursive: true });
    await this.writeFile(p, data, mode ? { mode } : undefined);
  }

  /** Every file path under `dir` (relative to it), excluding `.git`. */
  async walk(dir: string): Promise<string[]> {
    const root = norm(dir);
    const out: string[] = [];
    for (const [k, e] of this.entries) {
      if (e.kind !== "file" || !k.startsWith(root + "/")) continue;
      const rel = k.slice(root.length + 1);
      if (rel === ".git" || rel.startsWith(".git/")) continue;
      out.push(rel);
    }
    return out.sort();
  }
}
