// Renders stills at the given times (seconds) into out/stills, from one bundle.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { enableTailwind } from "@remotion/tailwind-v4";
import fs from "node:fs";
import path from "node:path";
const times = process.argv.slice(2).map(Number);
fs.mkdirSync("out/stills", { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), webpackOverride: (c) => enableTailwind(c) });
const composition = await selectComposition({ serveUrl, id: "Launch" });
for (const t of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(t * 30));
  const output = `out/stills/${t.toFixed(2).padStart(6, "0")}.jpg`;
  await renderStill({ serveUrl, composition, frame, output, imageFormat: "jpeg", jpegQuality: 80, scale: Number(process.env.SCALE ?? 0.5) });
  console.log(output);
}
