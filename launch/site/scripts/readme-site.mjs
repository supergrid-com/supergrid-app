// The repo README's shot of the site: the hero card at 1536 wide, with Blog open in the clickable app, captured at
// 1.5x with a transparent page so the card's rounded corners stay clean. Needs `pnpm dev` and a Chrome started with
// --remote-debugging-port=9400 (see README). Usage: node scripts/readme-site.mjs ../../.github/readme/site.png 1536 1080

import { writeFileSync } from "node:fs";
const [out, W, H] = process.argv.slice(2);
const list = await (await fetch("http://localhost:9400/json")).json();
const page = list.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
await new Promise((r) => (ws.onopen = r));
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await send("Emulation.setDeviceMetricsOverride", { width: +W, height: 1400, deviceScaleFactor: 2, mobile: false });
await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
await send("Page.enable");
await send("Page.navigate", { url: "http://localhost:5320/" });
await wait(6000);
await send("Runtime.evaluate", { expression: `(() => { const s = document.createElement("style"); s.textContent = "html,body{background:transparent!important} nextjs-portal{display:none!important}"; document.head.append(s); })()` });
await wait(800);
// open Blog in the clickable app, as the hero shot on the site shows it
console.log((await send("Runtime.evaluate", { expression: `(() => { const b = [...document.querySelectorAll("#hero button, #hero a, #hero [role=button]")].find((e) => e.innerText.trim() === "Blog"); b?.click(); return !!b })()`, returnByValue: true })).result.result.value);
await wait(3000);
const r = await send("Runtime.evaluate", { expression: `JSON.stringify(document.getElementById("hero").getBoundingClientRect())`, returnByValue: true });
const box = JSON.parse(r.result.result.value);
const clip = { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, +H), scale: 0.75 };
const shot = await send("Page.captureScreenshot", { format: "png", clip, captureBeyondViewport: true });
writeFileSync(out, Buffer.from(shot.result.data, "base64"));
console.log("saved", out, JSON.stringify(box), JSON.stringify(clip));
ws.close();
