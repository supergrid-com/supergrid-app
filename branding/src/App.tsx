import { useEffect, useState } from "react";
import type * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Editor } from "./editor";
import { defaultMark, Mark, type MarkConfig } from "./mark";
import { randomMark } from "./presets";
import { Hero, InContext, Lockups, Palettes, Pinned, Presets, Sizes, TypeSpecimen } from "./sections";

const PINS_KEY = "supergrid-branding:pins";

// The mark under edit lives in the URL hash, so a link reproduces it exactly.
function readHash(): MarkConfig | null {
  try {
    const raw = location.hash.slice(1);
    return raw ? { ...defaultMark, ...JSON.parse(decodeURIComponent(raw)) } : null;
  } catch {
    return null;
  }
}

function readPins(): MarkConfig[] {
  try {
    const pins: Partial<MarkConfig>[] = JSON.parse(localStorage.getItem(PINS_KEY) ?? "[]");
    return pins.map((p) => ({ ...defaultMark, ...p }));
  } catch {
    return [];
  }
}

function svgSource(c: MarkConfig): string {
  return renderToStaticMarkup(<Mark c={c} size={512} />);
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const NAV = [
  ["variations", "Variations"],
  ["sizes", "Sizes"],
  ["lockups", "Lockups"],
  ["colour", "Colour"],
  ["in-context", "In context"],
  ["type", "Type"],
  ["pinned", "Pinned"],
] as const;

export function App(): React.ReactElement {
  const [c, setC] = useState<MarkConfig>(() => readHash() ?? defaultMark);
  const [pins, setPins] = useState<MarkConfig[]>(readPins);
  const [flash, setFlash] = useState<string | null>(null);
  const [paper, setPaper] = useState(false);

  useEffect(() => {
    const changed = Object.fromEntries(
      Object.entries(c).filter(([k, v]) => v !== defaultMark[k as keyof MarkConfig]),
    );
    const hash = Object.keys(changed).length ? `#${encodeURIComponent(JSON.stringify(changed))}` : "";
    history.replaceState(null, "", `${location.pathname}${hash}`);
  }, [c]);

  useEffect(() => {
    try {
      localStorage.setItem(PINS_KEY, JSON.stringify(pins));
    } catch {
      // Storage can be unavailable; pins then last only for this visit.
    }
  }, [pins]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(t);
  }, [flash]);

  const copy = async (text: string, what: string) => {
    await navigator.clipboard.writeText(text);
    setFlash(`${what} copied`);
  };

  return (
    <div className="layout">
      <aside className="panel">
        <div className="brand">
          <Mark c={{ ...defaultMark, padding: 0 }} size={28} />
          <div>
            <h1>SuperGrid</h1>
            <span>Branding lab</span>
          </div>
        </div>

        <div className="actions">
          <button type="button" onClick={() => setC(randomMark(c))}>Randomize</button>
          <button type="button" onClick={() => { setPins([c, ...pins]); setFlash("Pinned"); }}>Pin</button>
          <button type="button" onClick={() => setC({ ...defaultMark, fg: c.fg, bg: c.bg, accent: c.accent })}>Reset</button>
        </div>

        <Editor c={c} onChange={setC} />
        <label className="check">
          <input type="checkbox" checked={paper} onChange={(e) => setPaper(e.target.checked)} />
          Grid paper behind the hero
        </label>

        <div className="actions export">
          <button type="button" onClick={() => copy(svgSource(c), "SVG")}>Copy SVG</button>
          <button type="button" onClick={() => download("supergrid-mark.svg", svgSource(c))}>Download SVG</button>
          <button type="button" onClick={() => copy(location.href, "Link")}>Copy link</button>
        </div>
        {flash && <div className="flash" role="status">{flash}</div>}
      </aside>

      <main>
        <nav className="nav">
          {NAV.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }}>
              {label}
            </a>
          ))}
        </nav>
        <Hero c={c} paper={paper} />
        <Presets c={c} onPick={setC} />
        <Sizes c={c} />
        <Lockups c={c} />
        <Palettes c={c} onApply={setC} />
        <InContext c={c} />
        <TypeSpecimen />
        <Pinned pins={pins} onPick={setC} onRemove={(i) => setPins(pins.filter((_, j) => j !== i))} />
      </main>
    </div>
  );
}
