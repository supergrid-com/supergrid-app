// Times the script against the voice over. Takes the script (the text above its `---`) and
// whisper.cpp's word-level JSON of the sped-up voice over, lines the two up word by word, and writes
// src/cues.json (one cue per sentence, in the script's own words) and src/words.json (every word).
//   whisper-cli -m ggml-small.en.bin -f vo16k.wav -ml 1 -sow -oj --dtw small.en -of words
//   node scripts/cues.mjs ../script-draft-9.md words.json
import fs from "node:fs";
const [, , scriptPath, whisperPath] = process.argv;
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, "");

const text = fs.readFileSync(scriptPath, "utf8").split(/\n---\n/)[0];
const said = text.split(/\s+/).filter(Boolean).map((w) => ({ w, n: norm(w), s: NaN, e: NaN }));
const heard = JSON.parse(fs.readFileSync(whisperPath, "utf8"))
  .transcription.map((x) => ({ n: norm(x.text), s: x.offsets.from / 1000, e: x.offsets.to / 1000 }))
  .filter((x) => x.n);

// longest common subsequence, then copy times across the matched words
const A = said.length, B = heard.length;
const L = Array.from({ length: A + 1 }, () => new Int32Array(B + 1));
for (let i = A - 1; i >= 0; i--) for (let j = B - 1; j >= 0; j--) L[i][j] = said[i].n === heard[j].n ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
for (let i = 0, j = 0; i < A && j < B; ) {
  if (said[i].n === heard[j].n) { said[i].s = heard[j].s; said[i].e = heard[j].e; i++; j++; }
  else if (L[i + 1][j] >= L[i][j + 1]) i++;
  else j++;
}
// words whisper heard differently ("vs." as "versus") take the gap between their neighbours
for (let i = 0; i < A; i++) {
  if (!Number.isNaN(said[i].s)) continue;
  let k = i; while (k < A && Number.isNaN(said[k].s)) k++;
  const a = i ? said[i - 1].e : 0, b = k < A ? said[k].s : a + 0.4, step = (b - a) / (k - i);
  for (let m = i; m < k; m++) { said[m].s = a + step * (m - i); said[m].e = a + step * (m - i + 1); }
}
const matched = said.filter((x) => heard.some((h) => h.n === x.n)).length;

// one cue per sentence ("vs." doesn't end one)
const cues = [];
let cur = [];
for (const x of said) {
  cur.push(x);
  if (/[.?!]$/.test(x.w) && x.w !== "vs.") { cues.push(cur); cur = []; }
}
if (cur.length) cues.push(cur);
const r = (t) => +t.toFixed(3);
fs.writeFileSync("src/cues.json", JSON.stringify(cues.map((c, i) => ({ n: i + 1, start: r(c[0].s), end: r(c.at(-1).e), text: c.map((x) => x.w).join(" ") })), null, 1));
fs.writeFileSync("src/words.json", JSON.stringify(said.map((x) => ({ w: x.n, s: r(x.s), e: r(x.e) }))));
console.log(`${cues.length} cues, ${matched}/${A} words heard, last ends ${r(said.at(-1).e)}`);
