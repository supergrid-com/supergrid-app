// sg: what happens outside a running platform. `install` puts a platform into a Cloudflare account; `release` and `keygen` are ours;
// `app new` starts an app from core/template and `app check` reads a manifest back (docs/app-system.md).
// Uses the same @supergrid/cloud code as the platform. Run from core/: pnpm sg <command>
import { execFileSync, spawnSync } from "node:child_process";
import { generateKeyPairSync, createPrivateKey, randomBytes, sign } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { CONTRACT } from "@supergrid/app-kit/rpc";
import { isAppId, isPrefix, resourceNames } from "@supergrid/app-kit/names";
import { checkManifest, type AppManifest } from "@supergrid/app-kit/manifest";
import { scaffoldApp, scaffoldAppFolder, scaffoldWorkspace } from "@supergrid/app-kit/scaffold";
import { generateWorkspace } from "@supergrid/app-kit/generate";
import { withInlineIcon } from "@supergrid/app-kit/vite";
import { CfApiError, accountSubdomain, createCf, enableWorkersDev, ensureD1, fetchBundle, fetchRelease, getSettings, putSchedules, putWorker, sha256Hex, waitForVersion, type Binding, type Bundle, type Cf, type Release } from "@supergrid/cloud";

const CORE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [cmd, ...rest] = process.argv.slice(2);
const flags = Object.fromEntries(rest.filter((a) => a.startsWith("--")).map((a) => { const [k, ...v] = a.slice(2).split("="); return [k, v.length ? v.join("=") : "true"]; }));
const args = rest.filter((a) => !a.startsWith("--"));
const log = (m: string) => console.log(`• ${m}`);
function fail(m: string): never { console.error(`✘ ${m}`); process.exit(1); }
const need = (name: string) => flags[name] ?? process.env[`SG_${name.toUpperCase().replace(/-/g, "_")}`] ?? fail(`--${name} is required`);
const wrangler = (a: string[], cwd = CORE) => {
  const r = spawnSync(join(CORE, "node_modules/.bin/wrangler"), a, { cwd, encoding: "utf8" });
  if (r.status !== 0) fail(`wrangler ${a.join(" ")} failed\n${r.stdout}${r.stderr}`);
  return r.stdout;
};

function keygen() {
  const out = resolve(flags.out ?? ".");
  if (existsSync(join(out, "release.key"))) fail(`${join(out, "release.key")} already exists`);
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "release.key"), privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  const pub = (publicKey.export({ type: "spki", format: "der" }) as Buffer).subarray(-32).toString("base64");
  writeFileSync(join(out, "release.pub"), `${pub}\n`);
  log(`wrote ${join(out, "release.key")} (keep private) and release.pub`);
}

const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = (dir: string, keep: (rel: string) => boolean) => walk(dir).map((p) => relative(dir, p)).filter(keep);

/** React Router's output: server modules plus client assets. */
function compiledRouterBuild(dir: string) {
  const server = join(dir, "build/server"), client = join(dir, "build/client");
  const cfg = JSON.parse(readFileSync(join(server, "wrangler.json"), "utf8")) as { compatibility_date: string; compatibility_flags?: string[]; assets?: { html_handling?: string; not_found_handling?: string } };
  return {
    main: "index.js",
    modules: Object.fromEntries(files(server, (f) => f.endsWith(".js")).map((f) => [f, readFileSync(join(server, f), "utf8")])),
    assets: Object.fromEntries(files(client, (f) => !f.startsWith(".")).map((f) => [f, readFileSync(join(client, f)).toString("base64")])),
    compatibilityDate: cfg.compatibility_date, compatibilityFlags: cfg.compatibility_flags ?? [],
  };
}

function buildPart(part: string, version: string): { bundle: Bundle; manifest?: AppManifest } {
  if (part === "platform") {
    log("building the platform");
    execFileSync("pnpm", ["--filter", "platform", "build"], { cwd: CORE, stdio: "pipe" });
    return { bundle: { format: 1, part, version, ...compiledRouterBuild(join(CORE, "platform")) } };
  }
  if (part === "workspace") {
    log("building the workspace Worker");
    const dir = join(CORE, "workspace");
    wrangler(["deploy", "--dry-run", "--outdir", "dist"], dir);
    const cfg = JSON.parse(readFileSync(join(dir, "wrangler.jsonc"), "utf8").replace(/^\s*\/\/.*$/gm, "")) as { compatibility_date: string; compatibility_flags: string[] };
    return { bundle: { format: 1, part, version, main: "index.js", modules: { "index.js": readFileSync(join(dir, "dist/index.js"), "utf8") }, assets: {}, compatibilityDate: cfg.compatibility_date, compatibilityFlags: cfg.compatibility_flags } };
  }
  const dir = resolve(part);
  const manifestPath = join(dir, "supergrid.app.json");
  if (!existsSync(manifestPath)) fail(`${part} is not platform, workspace or an app folder`);
  const manifest = withInlineIcon({ ...(JSON.parse(readFileSync(manifestPath, "utf8")) as AppManifest), version }, dir);
  const problems = checkManifest(manifest);
  if (problems.length) fail(`${manifestPath}:\n${problems.map((x) => `  - ${x}`).join("\n")}`);
  if (!isAppId(manifest.id)) fail(`app id ${manifest.id} is not valid`);
  log(`building ${manifest.id}`);
  execFileSync("pnpm", ["build"], { cwd: dir, stdio: "pipe" });
  const skip = /^(node_modules|build|\.react-router|\.wrangler|dist)\/|^wrangler\.jsonc$|(^|\/)\.DS_Store$/;
  const source = Object.fromEntries(files(dir, (f) => !skip.test(f)).map((f) => [f, readFileSync(join(dir, f)).toString("base64")]));
  source["supergrid.app.json"] = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`).toString("base64");
  return { bundle: { format: 1, part: `app-${manifest.id}`, version, ...compiledRouterBuild(dir), source }, manifest };
}

const signer = () => createPrivateKey(readFileSync(resolve(need("key"))));
const signed = (value: unknown) => { const payload = JSON.stringify(value); return { payload, sig: sign(null, Buffer.from(payload), signer()).toString("base64") }; };

async function release() {
  const [target] = args;
  const version = need("version");
  if (!target || !/^\d+\.\d+\.\d+$/.test(version)) fail("usage: sg release <platform|workspace|app folder> --version=1.2.3 --key=release.key --out=dir [--notes=...] [--requires-workspace=n]");
  const out = resolve(need("out"));
  mkdirSync(out, { recursive: true });
  const { bundle, manifest } = buildPart(target, version);
  const gz = gzipSync(Buffer.from(JSON.stringify(bundle)));
  const file = `${bundle.part}-${version}.bundle.gz`;
  writeFileSync(join(out, file), gz);
  const rel: Release = {
    part: bundle.part, version, contract: CONTRACT, url: file, sha256: await sha256Hex(gz), notes: flags.notes ?? "", publishedAt: new Date().toISOString(),
    ...(flags["requires-workspace"] ? { requires: { workspace: Number(flags["requires-workspace"]) } } : {}), ...(manifest ? { manifest } : {}),
  };
  writeFileSync(join(out, `${bundle.part}.json`), JSON.stringify(signed(rel)));
  // The catalog is every app release in the feed.
  const apps = readdirSync(out).filter((f) => /^app-.*\.json$/.test(f)).map((f) => JSON.parse(JSON.parse(readFileSync(join(out, f), "utf8")).payload) as Release)
    .map((r) => ({ id: r.manifest!.id, name: r.manifest!.name, description: r.manifest!.description, version: r.version }));
  writeFileSync(join(out, "catalog.json"), JSON.stringify(signed({ apps })));
  log(`${bundle.part} ${version}: ${(gz.length / 1024 / 1024).toFixed(2)} MB, ${Object.keys(bundle.modules).length} modules, ${Object.keys(bundle.assets).length} assets`);
}

/** The signed-in wrangler credential and account: the installer acts as the person at the terminal. */
function wranglerCf(): Cf {
  const who = wrangler(["whoami"]);
  const accounts = [...who.matchAll(/│\s*(.+?)\s*│\s*([0-9a-f]{32})\s*│/g)].map((m) => ({ name: m[1]!, id: m[2]! }));
  const account = flags.account ? accounts.find((a) => a.id === flags.account || a.name === flags.account) : accounts.length === 1 ? accounts[0] : null;
  if (!account) fail(accounts.length ? `Choose an account with --account=<id>:\n${accounts.map((a) => `  ${a.id}  ${a.name}`).join("\n")}` : "Run: pnpm exec wrangler login");
  log(`Cloudflare account: ${account.name}`);
  const token = wrangler(["auth", "token"]).trim().split("\n").pop()!;
  return createCf(token, account.id);
}

async function install() {
  const prefix = flags.prefix ?? "sg";
  if (!isPrefix(prefix)) fail("--prefix must be a letter then up to 7 letters or digits");
  const mode = flags.mode ?? "creator";
  if (!["creator", "agency", "reseller"].includes(mode)) fail("--mode must be creator, agency or reseller");
  const feed = need("feed"), pub = need("pubkey");
  const cf = wranglerCf();
  const worker = resourceNames(prefix).platform;
  const taken = await getSettings(cf, worker).then(() => true, (e) => { if (e instanceof CfApiError && e.notFound) return false; throw e; });
  if (taken) fail(`${worker} already exists in this account. Updates run from the platform; use --prefix for a second install.`);

  log("fetching the signed platform release");
  const release = await fetchRelease(feed, "platform", pub);
  const bundle = await fetchBundle(feed, release);
  log(`creating the D1 database ${worker}`);
  const d1 = await ensureD1(cf, worker);
  const url = `https://${worker}.${await accountSubdomain(cf, prefix)}.workers.dev`;
  const setupToken = randomBytes(24).toString("base64url");
  const plain = (name: string, text: string): Binding => ({ type: "plain_text", name, text });
  const bindings: Binding[] = [
    { type: "d1", name: "PLATFORM_DB", id: d1.uuid },
    plain("SG_VERSION", bundle.version), plain("SG_PREFIX", prefix), plain("SG_MODE", mode), plain("SG_ACCOUNT_ID", cf.accountId),
    plain("SG_RELEASE_FEED", feed), plain("SG_RELEASE_PUBKEY", pub), plain("BETTER_AUTH_URL", url),
    { type: "secret_text", name: "BETTER_AUTH_SECRET", text: randomBytes(32).toString("hex") },
    { type: "secret_text", name: "SG_SETUP_TOKEN", text: setupToken },
  ];
  log(`deploying ${worker} ${bundle.version}`);
  await putWorker(cf, worker, bundle, bindings, `Install ${bundle.version}`);
  await enableWorkersDev(cf, worker);
  await putSchedules(cf, worker, ["17 4 * * *"]);
  await waitForVersion(`${url}/api/health`, bundle.version);
  console.log(`\n  Your platform is live. Create the first account here (one-time link, keep it private):\n\n  ${url}/setup?token=${setupToken}\n`);
}

// ---- app new / app check ----------------------------------------------------------------------------------------------
const appNew = (dest: string, o: Omit<Parameters<typeof scaffoldApp>[0], "core" | "dest">) => scaffoldApp({ core: CORE, dest, ...o });

function appCommand() {
  const [sub, target] = args;
  if (sub === "new") {
    if (!target) fail("usage: sg app new <folder> --id=<id> [--name=...] [--mount=/path | --admin-only] [--description=...] [--color=#hex] [--icon=<svg file>]");
    const { dir, manifest } = appNew(target, { id: flags.id ?? target.split("/").pop()!, name: flags.name, mount: flags["admin-only"] ? null : flags.mount, description: flags.description, color: flags.color, icon: flags.icon });
    log(`${manifest.name} (${manifest.id}) is in ${dir}`);
    console.log(`\n  cd ${relative(process.cwd(), dir) || "."} && pnpm install && pnpm dev\n\n  Then read GUIDE.md. Public pages: ${manifest.public ? manifest.public.mount : "none (admin only)"}; admin: /admin/${manifest.id}.\n`);
    return;
  }
  if (sub === "check") {
    const dir = resolve(target ?? ".");
    const path = join(dir, "supergrid.app.json");
    if (!existsSync(path)) fail(`${path} not found`);
    const problems = checkManifest(JSON.parse(readFileSync(path, "utf8")));
    if (problems.length) fail(`${path}:\n${problems.map((x) => `  - ${x}`).join("\n")}`);
    log(`${path} is a valid manifest`);
    return;
  }
  fail("usage: sg app new <folder> --id=<id> | sg app check [folder]");
}

/** `sg ws new <dir> --id= --name=`, `sg ws add <dir> --id= [--name= --mount= --home=]`, `sg ws generate <dir>`: a workspace repo and its app folders (WORKSPACE-REPO.md). */
function wsCommand() {
  const [sub, dirArg] = args;
  if (sub === "new") {
    const id = need("id");
    const { dir } = scaffoldWorkspace({ core: CORE, dest: resolve(dirArg ?? fail("sg ws new <dir> --id=<id> --name=<name>")), id, name: flags.name ?? id, worker: flags.worker });
    generateWorkspace(dir);
    log(`created the workspace repo at ${dir}\n  cd ${dir} && pnpm install && pnpm dev`);
    return;
  }
  if (sub === "add") {
    const ws = resolve(dirArg ?? fail("sg ws add <workspace> --id=<id>"));
    const { dir, manifest } = scaffoldAppFolder({ core: CORE, workspace: ws, id: need("id"), name: flags.name, mount: flags["admin-only"] ? null : flags.mount, home: flags.home, description: flags.description, color: flags.color, icon: flags.icon });
    const g = generateWorkspace(ws);
    log(`added ${manifest.id} at ${dir}; ${g.apps.length} app(s) in the build`);
    return;
  }
  if (sub === "generate") {
    const g = generateWorkspace(resolve(dirArg ?? "."));
    for (const a of g.apps) log(`${a.id}${a.disabled ? " (disabled)" : ""}${a.manifest.public ? ` at ${a.manifest.public.mount}` : " (admin only)"}`);
    log(`wrote ${g.files.join(", ")}`);
    return;
  }
  fail("sg ws new|add|generate");
}

const commands: Record<string, () => unknown> = { keygen, release, install, app: appCommand, ws: wsCommand };
const run = cmd ? commands[cmd] : undefined;
if (!run) fail("usage: sg install | sg release | sg keygen | sg app new | sg app check");
await run();
