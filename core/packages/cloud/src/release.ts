// Signed releases. CI signs a small pointer file with a private key it alone holds; the pointer carries the bundle's hash, so
// verifying the pointer with the public key covers the bundle. Each part has its own pointer and version, so any part can ship alone:
//   <feed>/platform.json  <feed>/workspace.json  <feed>/app-forms.json  <feed>/catalog.json
import type { AppManifest } from "@supergrid/app-kit/manifest";
import type { Compiled } from "./deploy";

export type Release = {
  /** platform, workspace, or app-<id>. */
  part: string;
  version: string;
  /** The contract this release speaks (CONTRACT in @supergrid/app-kit/rpc). */
  contract: number;
  /** The lowest workspace contract it can run against. */
  requires?: { workspace?: number };
  /** The bundle: absolute, or relative to the feed. */
  url: string;
  sha256: string;
  notes: string;
  publishedAt: string;
  manifest?: AppManifest;
};
export type Catalog = { apps: { id: string; name: string; description?: string; version: string }[] };
export type Signed = { payload: string; sig: string };

/** A release's compiled Worker, plus the app's source for its Artifacts repo. Bundles carry no account ids and no secrets. */
export type Bundle = Compiled & {
  format: 1;
  part: string;
  version: string;
  /** Apps only: repo path to base64. */
  source?: Record<string, string>;
};

const b64bytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function verifySigned(signed: Signed, publicKey: string): Promise<unknown> {
  const key = await crypto.subtle.importKey("raw", b64bytes(publicKey), { name: "Ed25519" }, false, ["verify"]);
  const ok = await crypto.subtle.verify({ name: "Ed25519" }, key, b64bytes(signed.sig), new TextEncoder().encode(signed.payload));
  if (!ok) throw new Error("Release signature is not valid. Refusing it.");
  return JSON.parse(signed.payload);
}

async function fetchSigned(feed: string, file: string, publicKey: string) {
  const res = await fetch(`${feed.replace(/\/$/, "")}/${file}?t=${Date.now()}`);
  if (!res.ok) throw new Error(`Release feed ${file}: ${res.status}`);
  return verifySigned((await res.json()) as Signed, publicKey);
}

export async function fetchRelease(feed: string, part: string, publicKey: string): Promise<Release> {
  const release = (await fetchSigned(feed, `${part}.json`, publicKey)) as Release;
  if (release.part !== part) throw new Error(`Release feed answered ${release.part} for ${part}. Refusing it.`);
  return release;
}
export const fetchCatalog = (feed: string, publicKey: string) => fetchSigned(feed, "catalog.json", publicKey) as Promise<Catalog>;

export async function sha256Hex(bytes: BufferSource) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function fetchBundle(feed: string, release: Release): Promise<Bundle> {
  const url = /^https?:/.test(release.url) ? release.url : `${feed.replace(/\/$/, "")}/${release.url}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Bundle ${url}: ${res.status}`);
  const bytes = await res.arrayBuffer();
  if ((await sha256Hex(bytes)) !== release.sha256) throw new Error(`Bundle for ${release.part} ${release.version} does not match its signed hash. Refusing it.`);
  const text = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
  const bundle = JSON.parse(text) as Bundle;
  if (bundle.part !== release.part || bundle.version !== release.version) throw new Error("Bundle does not match its release.");
  return bundle;
}

/** Negative when a is older than b. "dev" is older than everything. */
export function compareVersions(a: string, b: string) {
  const parts = (v: string) => (v === "dev" ? [-1] : v.split(".").map(Number));
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] ?? 0) - (y[i] ?? 0); if (d) return d; }
  return 0;
}
