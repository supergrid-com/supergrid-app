import cues from "./cues.json";
import words from "./words.json";

// Everything is timed off the voice over itself: src/cues.json has one cue per sentence of the script
// and src/words.json every word, both made by scripts/cues.mjs from whisper's word times on the sped-up
// voice over. A scene starts at a cue or at the word it shows, so a new take of the voice moves the
// whole film with it: re-run the timing and nothing here changes.

export const FPS = 30;

/** When cue `n` starts, in seconds, plus `offset` into it. */
export const cue = (n: number, offset = 0): number => cues[n - 1]!.start + offset;
/** When cue `n` ends. */
export const cueEnd = (n: number): number => cues[n - 1]!.end;

/** When the words of `phrase` are first said in cue `n`, plus `offset`. Throws if they aren't, so a
 *  changed script fails loudly instead of drifting. */
export function say(n: number, phrase: string, offset = 0): number {
  const want = phrase.toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, ""));
  const c = cues[n - 1]!;
  for (let i = 0; i < words.length; i++) {
    if (words[i]!.s < c.start - 0.001 || words[i]!.s >= c.end) continue;
    if (want.every((w, k) => words[i + k]?.w === w)) return words[i]!.s + offset;
  }
  throw new Error(`"${phrase}" isn't said in cue ${n}: ${c.text}`);
}

export const VO_END = cues[cues.length - 1]!.end;
/** The end card holds a little after the last word. */
export const DURATION = VO_END + 2.6;

// The beats, in order. Each runs until the next one starts.
export const beats = {
  hook: 0,
  fourParts: cue(3, 0.45),
  buyBuild: cue(17),
  features: cue(19),
  clone: cue(20),
  iceberg: say(21, "misses", -0.1),
  wants: cue(24),
  reveal: cue(28),
  app: cue(29, -0.3),
  cto: cue(46, 0.15),
  industries: cue(47, 0.45),
  close: cue(50),
  end: cue(52),
} as const;

export const beatList = Object.entries(beats).map(([name, start], i, all) => ({ name, start, end: all[i + 1]?.[1] ?? DURATION }));
export const beatEnd = (name: keyof typeof beats): number => beatList.find((b) => b.name === name)!.end;
