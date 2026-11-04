// Reads the ElevenLabs SRT, divides every time by the speed the voice over was sped up by, and
// writes the cues the video times itself from (src/cues.json) plus a matching SRT.
import fs from "node:fs";
const [, , input, speed = "1.15"] = process.argv;
const k = Number(speed);
const ms = (t) => { const [h, m, s] = t.replace(",", ".").split(":"); return (Number(h) * 3600 + Number(m) * 60 + Number(s)) * 1000; };
const fmt = (x) => { const t = Math.round(x); const h = Math.floor(t / 3600000), m = Math.floor(t / 60000) % 60, s = Math.floor(t / 1000) % 60, r = t % 1000; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(r).padStart(3, "0")}`; };
const cues = fs.readFileSync(input, "utf8").trim().split(/\n\s*\n/).map((b) => {
  const lines = b.split("\n");
  const [a, z] = lines[1].split(" --> ");
  return { n: Number(lines[0]), start: +(ms(a) / k / 1000).toFixed(3), end: +(ms(z) / k / 1000).toFixed(3), text: lines.slice(2).filter((l) => !/^Speaker:/.test(l)).join(" ").trim() };
});
fs.writeFileSync("src/cues.json", JSON.stringify(cues, null, 1));
fs.writeFileSync("public/vo.srt", cues.map((c) => `${c.n}\n${fmt(c.start * 1000)} --> ${fmt(c.end * 1000)}\n${c.text}\n`).join("\n"));
console.log(cues.length, "cues, last ends", cues.at(-1).end);
