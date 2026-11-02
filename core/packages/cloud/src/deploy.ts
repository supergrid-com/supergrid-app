// Deploying a prebuilt Worker through the REST API: static assets by direct upload, then the script or a new version.
import type { Cf } from "./client";

export type Binding =
  | { type: "d1"; name: string; id: string }
  | { type: "plain_text"; name: string; text: string }
  | { type: "secret_text"; name: string; text: string }
  | { type: "json"; name: string; json: unknown }
  | { type: "service"; name: string; service: string; entrypoint?: string }
  /** Keep this binding's current value (how a secret survives an update without the platform knowing it). */
  | { type: "inherit"; name: string }
  | { type: string; name: string; [k: string]: unknown };

export type Compiled = {
  main: string;
  /** JS modules, path to source. */
  modules: Record<string, string>;
  /** Static assets, path to base64. */
  assets: Record<string, string>;
  assetsConfig?: { html_handling?: string; not_found_handling?: string; run_worker_first?: boolean | string[] };
  compatibilityDate: string;
  compatibilityFlags: string[];
};

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", json: "application/json",
  svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", webp: "image/webp", ico: "image/x-icon", txt: "text/plain; charset=utf-8",
  woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf",
};
const mimeFor = (path: string) => MIME[path.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
const sizeOf = (b64: string) => Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);

/** The shape wrangler uses: sha256 of the base64 content plus the extension, 32 hex characters. */
async function assetHash(b64: string, path: string) {
  const ext = path.includes(".") ? path.split(".").pop()! : "";
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(b64 + ext))).slice(0, 32);
}

async function uploadAssets(cf: Cf, script: string, assets: Compiled["assets"]): Promise<string> {
  const manifest: Record<string, { hash: string; size: number }> = {};
  const byHash = new Map<string, { b64: string; path: string }>();
  for (const [path, b64] of Object.entries(assets)) {
    const hash = await assetHash(b64, path);
    manifest[path.startsWith("/") ? path : `/${path}`] = { hash, size: sizeOf(b64) };
    byHash.set(hash, { b64, path });
  }
  const session = await cf.post<{ jwt: string; buckets?: string[][] }>(cf.acct(`/workers/scripts/${script}/assets-upload-session`), { manifest });
  let jwt = session.jwt;
  for (const bucket of session.buckets ?? []) {
    const form = new FormData();
    for (const hash of bucket) {
      const f = byHash.get(hash);
      if (!f) throw new Error(`asset bucket references unknown hash ${hash}`);
      form.append(hash, new Blob([f.b64], { type: mimeFor(f.path) }), hash);
    }
    const r = await cf.uploadAssets(session.jwt, form);
    if (r?.jwt) jwt = r.jwt;
  }
  return jwt;
}

function form(c: Compiled, bindings: Binding[], jwt: string | undefined, message: string) {
  const metadata = {
    main_module: c.main, bindings, compatibility_date: c.compatibilityDate, compatibility_flags: c.compatibilityFlags,
    observability: { enabled: true }, annotations: { "workers/message": message.slice(0, 100) },
    ...(jwt ? { assets: { jwt, ...(c.assetsConfig ? { config: c.assetsConfig } : {}) } } : {}),
  };
  const f = new FormData();
  f.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }), "metadata.json");
  for (const [path, source] of Object.entries(c.modules)) f.append(path, new Blob([source], { type: "application/javascript+module" }), path);
  return f;
}

const withAssets = async (cf: Cf, script: string, c: Compiled) => (Object.keys(c.assets).length ? uploadAssets(cf, script, c.assets) : undefined);

/** Create a Worker, or replace it outright. Live as soon as this returns. */
export async function putWorker(cf: Cf, script: string, c: Compiled, bindings: Binding[], message: string) {
  await cf.request("PUT", cf.acct(`/workers/scripts/${script}`), form(c, bindings, await withAssets(cf, script, c), message));
}

/** Upload without sending traffic to it. */
export async function uploadVersion(cf: Cf, script: string, c: Compiled, bindings: Binding[], message: string): Promise<string> {
  const r = await cf.request<{ id: string }>("POST", cf.acct(`/workers/scripts/${script}/versions`), form(c, bindings, await withAssets(cf, script, c), message));
  return r.id;
}

/** Send all traffic to one version. Also how a rollback works: deploy the version that was live before. */
export async function deployVersion(cf: Cf, script: string, versionId: string, message: string) {
  await cf.post(cf.acct(`/workers/scripts/${script}/deployments`), {
    strategy: "percentage", versions: [{ version_id: versionId, percentage: 100 }], annotations: { "workers/message": message.slice(0, 100) },
  });
}

export async function activeVersion(cf: Cf, script: string): Promise<string | null> {
  const r = await cf.get<{ deployments: { versions: { version_id: string }[] }[] }>(cf.acct(`/workers/scripts/${script}/deployments`));
  return r.deployments?.[0]?.versions?.[0]?.version_id ?? null;
}

export const getSettings = (cf: Cf, script: string) => cf.get<{ bindings: Binding[]; compatibility_date?: string; compatibility_flags?: string[] }>(cf.acct(`/workers/scripts/${script}/settings`));

/** Change a Worker's bindings without touching its code. */
export async function setBindings(cf: Cf, script: string, bindings: Binding[]) {
  const f = new FormData();
  f.append("settings", new Blob([JSON.stringify({ bindings })], { type: "application/json" }), "settings.json");
  await cf.request("PATCH", cf.acct(`/workers/scripts/${script}/settings`), f);
}
