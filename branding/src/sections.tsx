import { useState } from "react";
import type * as React from "react";
import { Segmented, Slider, TextField } from "./controls";
import { groundCss, Mark, type MarkConfig } from "./mark";
import { applyPalette, contrast, palettes } from "./palettes";
import { applyPreset, presets } from "./presets";

export function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section id={id} className="section">
      <header>
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </header>
      {children}
    </section>
  );
}

// The same mark with ink and ground swapped. A gradient ground moves onto the tiles instead.
const inverted = (c: MarkConfig): MarkConfig =>
  c.gradient === "ground" ? { ...c, gradient: "tiles", fg: c.bg, bg: c.fg } : { ...c, fg: c.bg, bg: c.fg };

// A drawing-board stage: the ground colour, optionally with a fine grid ruled in the ink colour.
const stage = (m: MarkConfig): React.CSSProperties => ({
  ...(m.gradient === "ground" ? { background: groundCss(m) } : { backgroundColor: m.bg }),
  ...({ "--ink": m.fg } as React.CSSProperties),
});

export function Hero({ c, paper }: { c: MarkConfig; paper: boolean }): React.ReactElement {
  return (
    <div className="hero">
      {[c, inverted(c)].map((m, i) => (
        <div key={i} className={paper ? "stage paper" : "stage"} style={stage(m)}>
          <Mark c={m} className="hero-mark" />
        </div>
      ))}
    </div>
  );
}

const SIZES = [16, 20, 24, 32, 48, 64, 128];

export function Sizes({ c }: { c: MarkConfig }): React.ReactElement {
  return (
    <Section id="sizes" title="Sizes" note="Down to favicon size. Narrow gaps and small notches are the first things to close up.">
      {[c, inverted(c)].map((m, i) => (
        <div key={i} className="sizes" style={{ background: groundCss(m) }}>
          {SIZES.map((s) => (
            <figure key={s}>
              <Mark c={m} size={s} />
              <figcaption style={{ color: m.fg }}>{s}</figcaption>
            </figure>
          ))}
        </div>
      ))}
    </Section>
  );
}

export function Presets({ c, onPick }: { c: MarkConfig; onPick: (m: MarkConfig) => void }): React.ReactElement {
  return (
    <Section id="variations" title="Variations" note="Moves on a grid of tiles, in your current colours. Click one to load it into the editor.">
      <div className="tiles">
        {presets.map((p) => {
          const m = applyPreset(c, p);
          return (
            <button key={p.name} type="button" className="tile" style={{ background: groundCss(m) }} onClick={() => onPick(m)}>
              <Mark c={m} />
              <span style={{ color: m.fg }}>{p.name}</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

export function Pinned({
  pins,
  onPick,
  onRemove,
}: {
  pins: MarkConfig[];
  onPick: (m: MarkConfig) => void;
  onRemove: (i: number) => void;
}): React.ReactElement {
  return (
    <Section id="pinned" title="Pinned" note="Marks you pinned from the editor. Saved in this browser.">
      {pins.length === 0 ? (
        <p className="empty">Nothing pinned yet. Use Pin in the editor to keep a version you like.</p>
      ) : (
        <div className="tiles">
          {pins.map((m, i) => (
            <div key={i} className="tile pinned" style={{ background: groundCss(m) }}>
              <button type="button" className="tile-hit" aria-label={`Load pin ${i + 1}`} onClick={() => onPick(m)}>
                <Mark c={m} />
              </button>
              <button type="button" className="unpin" style={{ color: m.fg }} onClick={() => onRemove(i)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

type Case = "SuperGrid" | "supergrid" | "SUPERGRID" | "Supergrid";

export function Lockups({ c }: { c: MarkConfig }): React.ReactElement {
  const [word, setWord] = useState<Case>("SuperGrid");
  const [weight, setWeight] = useState(600);
  const [tracking, setTracking] = useState(-0.01);
  const [split, setSplit] = useState<"off" | "on">("off");

  const wordmark = (fontSize: number, color: string) => {
    const style = { fontSize, letterSpacing: `${tracking}em`, color };
    if (split === "off") return <span className="wordmark" style={{ ...style, fontWeight: weight }}>{word}</span>;
    const cut = word.length - 4;
    return (
      <span className="wordmark" style={style}>
        <span style={{ fontWeight: 400 }}>{word.slice(0, cut)}</span>
        <span style={{ fontWeight: 700 }}>{word.slice(cut)}</span>
      </span>
    );
  };

  return (
    <Section id="lockups" title="Lockups" note="The mark next to the name, set in Cal Sans.">
      <div className="inline-controls">
        <Segmented label="Name" value={word} options={["SuperGrid", "Supergrid", "supergrid", "SUPERGRID"]} onChange={setWord} />
        <Slider label="Weight" value={weight} min={400} max={700} step={10} onChange={setWeight} />
        <Slider label="Tracking" value={tracking} min={-0.06} max={0.2} step={0.005} unit="em" onChange={setTracking} />
        <Segmented label="Super light, Grid bold" value={split} options={["off", "on"]} onChange={setSplit} />
      </div>
      <div className="lockups">
        {[c, inverted(c)].map((m, i) => (
          <div key={i} className="lockup-board" style={{ background: groundCss(m) }}>
            <div className="lockup row">
              <Mark c={{ ...m, padding: 4 }} size={56} />
              {wordmark(44, m.fg)}
            </div>
            <div className="lockup stack">
              <Mark c={m} size={88} />
              {wordmark(34, m.fg)}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Palettes({ c, onApply }: { c: MarkConfig; onApply: (m: MarkConfig) => void }): React.ReactElement {
  return (
    <Section id="colour" title="Colour" note="Candidate palettes, each a ground, an ink and one accent. Contrast is the WCAG ratio against the ground.">
      <div className="palettes">
        {palettes.map((p) => {
          const m: MarkConfig = { ...applyPalette(c, p), accentOn: c.accentOn === "none" && !p.gradient ? "lifted" : c.accentOn };
          const word = p.gradient === "tiles" ? { backgroundImage: `linear-gradient(90deg, ${p.stops?.join(", ")})` } : { color: p.accent };
          return (
            <article key={p.name} className="palette">
              <div className="palette-stage" style={{ background: groundCss(m) }}>
                <Mark c={m} size={120} />
                <span className="wordmark" style={{ color: p.fg, fontSize: 28, fontWeight: 600 }}>
                  Super<span className={p.gradient === "tiles" ? "gradient-text" : undefined} style={word}>Grid</span>
                </span>
              </div>
              <div className="palette-body">
                <div className="palette-title">
                  <div>
                    <h4>{p.name}</h4>
                    <p>{p.note}</p>
                  </div>
                  <button type="button" onClick={() => onApply(applyPalette(c, p))}>
                    Apply
                  </button>
                </div>
                <div className="swatches">
                  {(
                    [
                      ["Ground", p.bg],
                      ["Ink", p.fg],
                      ["Accent", p.accent],
                    ] as const
                  ).map(([label, hex]) => (
                    <div key={label} className="swatch">
                      <span className="chip" style={{ background: hex }} />
                      <span>{label}</span>
                      <code>{hex}</code>
                      {label !== "Ground" && <small>{contrast(hex, p.bg).toFixed(1)}:1</small>}
                    </div>
                  ))}
                  {p.stops && (
                    <div className="swatch">
                      <span className="chip" style={{ background: `linear-gradient(45deg, ${p.stops.join(", ")})` }} />
                      <span>Gradient, {p.gradient}</span>
                      <code className="stops">{p.stops.join(" → ")}</code>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}

export function InContext({ c }: { c: MarkConfig }): React.ReactElement {
  const [tagline, setTagline] = useState("Organizations, workspaces, apps and the coding agent, on your machine.");
  const icon: MarkConfig = { ...c, tile: "rounded", padding: Math.max(c.padding, 16) };
  return (
    <Section id="in-context" title="In context" note="Where the mark has to live: an app icon, a browser tab, the app sidebar and a social card.">
      <div className="context-grid">
        <div className="context-card dock">
          <Mark c={icon} size={128} className="app-icon" />
          <Mark c={icon} size={64} className="app-icon" />
          <Mark c={icon} size={32} className="app-icon" />
          <span className="context-label">App icon</span>
        </div>

        <div className="context-card">
          <div className="browser">
            <div className="tab active">
              <Mark c={{ ...c, tile: "square", padding: 6 }} size={16} />
              <span>SuperGrid</span>
            </div>
            <div className="tab">
              <span className="tab-dot" />
              <span>Docs</span>
            </div>
          </div>
          <div className="sidebar-mock" style={{ background: groundCss(c), color: c.fg }}>
            <div className="sidebar-brand">
              <Mark c={{ ...c, padding: 0 }} size={18} />
              <span className="wordmark" style={{ fontSize: 15, fontWeight: 600 }}>SuperGrid</span>
            </div>
            {["Home", "Workspaces", "Apps", "Agent"].map((item, i) => (
              <div key={item} className={i === 0 ? "sidebar-item on" : "sidebar-item"}>{item}</div>
            ))}
          </div>
          <span className="context-label">Tab and sidebar</span>
        </div>

        <div className="context-card wide">
          <div className="social" style={{ background: groundCss(c), color: c.fg }}>
            <Mark c={{ ...c, padding: 0 }} className="social-mark" />
            <div>
              <div className="wordmark social-name">SuperGrid</div>
              <p className="social-tagline">{tagline}</p>
            </div>
            <Mark c={{ ...c, padding: 0, accentOn: "none" }} className="social-ghost" />
          </div>
          <TextField label="Tagline" value={tagline} onChange={setTagline} />
          <span className="context-label">Social card, 1200 × 630</span>
        </div>
      </div>
    </Section>
  );
}

export function TypeSpecimen(): React.ReactElement {
  const [weight, setWeight] = useState(600);
  const [sample, setSample] = useState("Every workspace on one grid.");
  return (
    <Section id="type" title="Type" note="Cal Sans, the variable display face from Cal.com, under the SIL Open Font License.">
      <div className="inline-controls">
        <Slider label="Weight" value={weight} min={400} max={700} step={10} onChange={setWeight} />
        <TextField label="Sample" value={sample} onChange={setSample} />
      </div>
      <div className="specimen" style={{ fontWeight: weight }}>
        <div className="spec-xl">SuperGrid</div>
        {[56, 36, 24, 16].map((size) => (
          <div key={size} className="spec-row">
            <code>{size}</code>
            <span style={{ fontSize: size }}>{sample}</span>
          </div>
        ))}
        <div className="spec-glyphs">
          ABCDEFGHIJKLMNOPQRSTUVWXYZ
          <br />
          abcdefghijklmnopqrstuvwxyz
          <br />
          0123456789 &amp; ! ? @ # → ( ) [ ] / + ×
        </div>
        <div className="spec-weights">
          {[400, 500, 600, 700].map((w) => (
            <div key={w} style={{ fontWeight: w }}>
              <span>SG</span>
              <code>{w}</code>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
