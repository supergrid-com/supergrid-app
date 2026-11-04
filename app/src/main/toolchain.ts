import { app } from "electron";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The Node and pnpm a workspace repo runs on. A packaged build brings its own, so a Mac with neither can install and
// serve a workspace: Node is the app's own executable started with ELECTRON_RUN_AS_NODE, and pnpm is this app's one
// runtime dependency (unpacked from the asar, package.json "asarUnpack"). In development the user's own pnpm and Node
// run instead; SG_OWN_NODE=1 switches a dev run to the bundled pair to try it.
//
// Some things still look for a `node` command: every `.bin` launcher starts `#!/usr/bin/env node` and install scripts
// run `node install.js`. So `node` and `pnpm` are small scripts in <userData>/runtime/bin that exec the app executable;
// childEnv in apps.ts puts that folder first on PATH. ELECTRON_RUN_AS_NODE is exported by the script, so forks further
// down (Vite's, pnpm's) inherit it and stay Node too.

export const ownToolchain = (): boolean => app.isPackaged || process.env.SG_OWN_NODE === "1";

/** pnpm's CLI, outside the asar: Node can read a script from an asar, but pnpm also loads its own files and workers. */
function pnpmCli(): string {
  return join(app.getAppPath().replace(/app\.asar$/, "app.asar.unpacked"), "node_modules/pnpm/bin/pnpm.cjs");
}

const sh = (s: string) => `'${s.replaceAll("'", `'\\''`)}'`;
const script = (args: string) => `#!/bin/sh\n# Written by SuperGrid (src/main/toolchain.ts): its own Node, for the workspace repos it runs.\nELECTRON_RUN_AS_NODE=1 exec ${sh(process.execPath)} ${args}"$@"\n`;

/** The folder holding the `node` and `pnpm` scripts, rewritten whenever the app moves (the executable path changes). */
export function shimDir(): string {
  const dir = join(app.getPath("userData"), "runtime/bin");
  mkdirSync(dir, { recursive: true });
  const shims: Record<string, string> = { node: script(""), pnpm: script(`${sh(pnpmCli())} `) };
  for (const [name, text] of Object.entries(shims)) {
    const path = join(dir, name);
    if (!existsSync(path) || readFileSync(path, "utf8") !== text) writeFileSync(path, text);
    chmodSync(path, 0o755);
  }
  return dir;
}

/** The bundled pnpm, as a command to run. */
export const ownPnpm = (): string => join(shimDir(), "pnpm");
