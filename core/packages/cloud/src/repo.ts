// An installed app's Artifacts repo, with git running in memory so it works inside a Worker.
//   upstream  the maintainer's source, exactly as released. Nothing else commits here.
//   main      upstream plus the install commit (wrangler.jsonc) plus whatever the user changes. Deploys from here.
import git from "isomorphic-git";
import http from "isomorphic-git/http/web";
import { MemoryFS } from "./memory-fs";

const AUTHOR = { name: "SuperGrid", email: "platform@supergrid.local" };
const DIR = "/work";
/** Git Basic auth wants only the token's secret; Artifacts tokens can carry an `?expires=` suffix. */
const auth = (token: string) => () => ({ username: "x", password: token.split("?")[0]! });
const b64bytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function writeSource(fs: MemoryFS, source: Record<string, string>) {
  for (const [path, b64] of Object.entries(source)) {
    await fs.writeDeep(`${DIR}/${path}`, b64bytes(b64));
    await git.add({ fs, dir: DIR, filepath: path });
  }
}

/** First push of an install. Returns main's commit. */
export async function seedRepo(opts: { remote: string; token: string; source: Record<string, string>; install: Record<string, string>; version: string }): Promise<string> {
  const { remote: url, token } = opts;
  const fs = new MemoryFS();
  await fs.mkdir(DIR, { recursive: true });
  await git.init({ fs, dir: DIR, defaultBranch: "upstream" });
  await writeSource(fs, opts.source);
  await git.commit({ fs, dir: DIR, message: `Release ${opts.version}`, author: AUTHOR });
  await git.branch({ fs, dir: DIR, ref: "main", checkout: true });
  for (const [path, text] of Object.entries(opts.install)) {
    await fs.writeDeep(`${DIR}/${path}`, text);
    await git.add({ fs, dir: DIR, filepath: path });
  }
  const main = await git.commit({ fs, dir: DIR, message: "Install", author: AUTHOR });
  for (const ref of ["upstream", "main"]) await push(fs, url, token, ref);
  return main;
}

async function push(fs: MemoryFS, url: string, token: string, ref: string) {
  const res = await git.push({ fs, http, dir: DIR, url, ref, remoteRef: ref, onAuth: auth(token) });
  if (!res.ok) throw new Error(`git push ${ref} failed: ${res.error ?? JSON.stringify(res)}`);
}

export type RepoUpdate = {
  /**
   * untouched: the user changed nothing, so the signed build is exactly what main holds.
   * merged: the user's changes merged cleanly and main is pushed. Their code needs its own build.
   * conflict: upstream moved, main did not. The user resolves it with `git merge upstream`.
   */
  outcome: "untouched" | "merged" | "conflict";
  commit: string;
};

/** Move upstream to a new release and merge it into main. `lastCommit` is main as the platform last left it. */
export async function updateRepo(opts: { remote: string; token: string; source: Record<string, string>; version: string; lastCommit: string | null }): Promise<RepoUpdate> {
  const { remote: url, token } = opts;
  const fs = new MemoryFS();
  await fs.mkdir(DIR, { recursive: true });
  await git.clone({ fs, http, dir: DIR, url, ref: "main", onAuth: auth(token) });
  const before = await git.resolveRef({ fs, dir: DIR, ref: "main" });
  const untouched = before === opts.lastCommit;

  await git.checkout({ fs, dir: DIR, ref: "upstream", remote: "origin", force: true });
  for (const path of await git.listFiles({ fs, dir: DIR, ref: "upstream" })) {
    if (path in opts.source) continue;
    await fs.unlink(`${DIR}/${path}`).catch(() => {});
    await git.remove({ fs, dir: DIR, filepath: path });
  }
  await writeSource(fs, opts.source);
  await git.commit({ fs, dir: DIR, message: `Release ${opts.version}`, author: AUTHOR });
  await push(fs, url, token, "upstream");

  await git.checkout({ fs, dir: DIR, ref: "main", force: true });
  try {
    const merged = await git.merge({ fs, dir: DIR, ours: "main", theirs: "upstream", author: AUTHOR, message: `Update to ${opts.version}` });
    await push(fs, url, token, "main");
    return { outcome: untouched ? "untouched" : "merged", commit: merged.oid! };
  } catch (e) {
    if ((e as { code?: string }).code === "MergeConflictError") return { outcome: "conflict", commit: before };
    throw e;
  }
}
