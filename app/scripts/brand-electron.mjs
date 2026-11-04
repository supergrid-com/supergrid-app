// Makes the development Electron look like SuperGrid. `pnpm dev` runs node_modules/electron's
// Electron.app, whose bundle names the app in the menu bar, Dock and ⌘-Tab and gives it its icon;
// app.setName and dock.setIcon only reach part of that. This rewrites the bundle's name and icon,
// then signs it again (ad hoc) since the change breaks its signature. Packaged builds get theirs from
// electron-builder. Runs after install (postinstall) and again on `pnpm brand`; safe to repeat.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const NAME = "SuperGrid";
const here = dirname(fileURLToPath(import.meta.url));

if (process.platform !== "darwin") process.exit(0);
const bundle = join(dirname(createRequire(import.meta.url).resolve("electron/package.json")), "dist/Electron.app");
const icon = join(here, "../build/icon.icns");
if (!existsSync(bundle) || !existsSync(icon)) {
  console.log("brand-electron: no Electron.app or build/icon.icns yet, skipped");
  process.exit(0);
}

const plist = join(bundle, "Contents/Info.plist");
// Already branded: leave it alone. Signing again would be harmless for the same files, but the keychain
// knows the app by its signature (safeStorage's key), so the bundle is only touched when it has to be.
const bundleIcon = join(bundle, "Contents/Resources/electron.icns");
const named = execFileSync("plutil", ["-extract", "CFBundleName", "raw", plist], { encoding: "utf8" }).trim() === NAME;
if (named && readFileSync(bundleIcon).equals(readFileSync(icon))) {
  console.log(`brand-electron: already ${NAME}`);
  process.exit(0);
}
const set = (key, value) => execFileSync("plutil", ["-replace", key, "-string", value, plist]);
set("CFBundleName", NAME);
set("CFBundleDisplayName", NAME);
copyFileSync(icon, bundleIcon);
execFileSync("codesign", ["--force", "--deep", "--sign", "-", bundle], { stdio: "ignore" });
// Finder and the Dock cache a bundle's icon by its modification time and Launch Services entry.
execFileSync("touch", [bundle]);
const lsregister = "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister";
if (existsSync(lsregister)) execFileSync(lsregister, ["-f", bundle]);
console.log(`brand-electron: ${bundle} is now ${NAME}`);
