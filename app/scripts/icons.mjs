// Renders build/icon.svg into the app's icons: build/icon.png (1024, the dock icon in development
// and electron-builder's source) and build/icon.icns (the macOS bundle icon).
// Runs inside Electron, which draws the SVG: `pnpm icons`.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow } from "electron";

const build = join(dirname(fileURLToPath(import.meta.url)), "../build");
const svg = readFileSync(join(build, "icon.svg"), "utf8");
const scratch = mkdtempSync(join(tmpdir(), "sg-icons-"));

// Each size is drawn from the SVG at that size, so small ones stay sharp rather than shrunk from 1024.
async function render(size) {
  const win = new BrowserWindow({ width: size, height: size, show: false, transparent: true, frame: false, useContentSize: true, webPreferences: { offscreen: true } });
  win.webContents.setZoomFactor(1);
  const html = `<html><body style="margin:0;background:transparent">${svg.replace(/width="1024" height="1024"/, `width="${size}" height="${size}"`)}</body></html>`;
  const page = join(scratch, `${size}.html`);
  writeFileSync(page, html);
  await win.loadFile(page);
  await new Promise((r) => setTimeout(r, 150));
  let image = await win.webContents.capturePage({ x: 0, y: 0, width: size, height: size });
  if (image.getSize().width !== size) image = image.resize({ width: size, height: size, quality: "best" });
  win.destroy();
  return image.toPNG();
}

// Not a top-level await: an ESM entry that awaits ready never sees it, the event fires after the module loads.
// Each size gets its own window, so closing one must not quit the app.
app.dock?.hide();
app.on("window-all-closed", () => {});
void app.whenReady().then(main).catch((e) => {
  console.error(e);
  app.exit(1);
});

async function main() {
  const set = join(build, "icon.iconset");
  rmSync(set, { recursive: true, force: true });
  mkdirSync(set);
  for (const base of [16, 32, 128, 256, 512]) {
    writeFileSync(join(set, `icon_${base}x${base}.png`), await render(base));
    writeFileSync(join(set, `icon_${base}x${base}@2x.png`), await render(base * 2));
  }
  writeFileSync(join(build, "icon.png"), await render(1024));
  execFileSync("iconutil", ["-c", "icns", set, "-o", join(build, "icon.icns")]);
  rmSync(set, { recursive: true, force: true });
  rmSync(scratch, { recursive: true, force: true });
  console.log("wrote build/icon.png and build/icon.icns");
  app.quit();
}
