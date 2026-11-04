import { AlignLeftIcon, EyeIcon, ImageIcon, LayersIcon, SlidersHorizontalIcon, SquareIcon, TypeIcon, WandSparklesIcon, type LucideIcon } from "lucide-react";
import * as React from "react";
import { C, MONO, MuseGlyph } from "./kit";
import { Button, Spinner, tint } from "./shell";
import { Photo } from "./site";

// Ad Designer, an internal app built on Muse Image: the brief on the left, the canvas with the three
// formats in the middle, layers and properties on the right. `gen` is how far each format's image has
// come in, 0 to 1, from the page that knows the time.

const FORMATS: { name: string; size: string; w: number; h: number; focus: string }[] = [
  { name: "Story", size: "1080 × 1920", w: 180, h: 320, focus: "50% 45%" },
  { name: "Square", size: "1080 × 1080", w: 280, h: 280, focus: "50% 50%" },
  { name: "Landscape", size: "1920 × 1080", w: 300, h: 169, focus: "50% 55%" },
];

const HEADLINE = "The Spring Collection";
const CTA = "Shop Now";

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }): React.ReactElement {
  return <div style={{ fontSize: 11.5, letterSpacing: "0.08em", textTransform: "uppercase", color: C.dim, marginBottom: 8, ...style }}>{children}</div>;
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }): React.ReactElement {
  return (
    <div style={{ display: "flex", alignItems: "center", height: 30, fontSize: 13 }}>
      <span style={{ width: 84, color: C.muted }}>{label}</span>
      <span style={{ flex: 1, color: C.fg, fontFamily: mono ? MONO : undefined, fontSize: mono ? 12.5 : 13, display: "flex", alignItems: "center", gap: 8 }}>{value}</span>
    </div>
  );
}

/** One ad, at the format's size, from the photo, the headline and the call to action. */
function Ad({ w, h, focus, p }: { w: number; h: number; focus: string; p: number }): React.ReactElement {
  const small = h < 200;
  const text = Math.max(0, (p - 0.55) / 0.45);
  return (
    <div style={{ width: w, height: h, borderRadius: 6, overflow: "hidden", position: "relative", background: C.raised, border: `1px solid ${p >= 1 ? C.line : tint(C.meta, 40 + 30 * (1 - p))}`, boxShadow: "0 12px 30px rgb(0 0 0 / 35%)" }}>
      {p > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: Math.min(1, p * 1.4), filter: p < 1 ? `blur(${(1 - p) * 18}px)` : undefined, transform: `scale(${1.1 - 0.1 * p})` }}>
          <Photo n={3} height={h} width={w} focus={focus} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgb(0 0 0 / 55%), rgb(0 0 0 / 0%) 60%)" }} />
        </div>
      ) : null}
      {p < 1 ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, opacity: 1 - p, color: C.meta, fontSize: 12.5, background: tint(C.meta, 6) }}>
          <MuseGlyph size={small ? 26 : 34} />
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Spinner /> Generating
          </span>
        </div>
      ) : null}
      <div style={{ position: "absolute", left: small ? 14 : 16, top: small ? 12 : 16, fontSize: 9, letterSpacing: "0.26em", textTransform: "uppercase", color: "#fff", opacity: text }}>Studio</div>
      <div style={{ position: "absolute", left: small ? 14 : 16, right: 16, bottom: small ? 14 : 18, opacity: text, transform: `translateY(${(1 - text) * 8}px)` }}>
        <div style={{ fontSize: small ? 18 : w < 200 ? 22 : 26, lineHeight: 1.05, letterSpacing: "-0.01em", color: "#fff" }}>{HEADLINE}</div>
        <div style={{ display: "inline-block", marginTop: small ? 8 : 12, padding: small ? "5px 10px" : "6px 12px", borderRadius: 999, background: "#fff", color: "#111", fontSize: small ? 10 : 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>{CTA}</div>
      </div>
    </div>
  );
}

function LayerRow({ icon: Icon, name, active, muted }: { icon: LucideIcon; name: string; active?: boolean; muted?: boolean }): React.ReactElement {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, height: 30, padding: "0 8px", borderRadius: 6, background: active ? C.active : undefined, color: active ? C.strong : muted ? C.dim : C.fg, fontSize: 13 }}>
      <Icon style={{ width: 14, height: 14, color: active ? C.accent : C.muted }} />
      <span style={{ flex: 1 }}>{name}</span>
      <EyeIcon style={{ width: 13, height: 13, color: C.dim }} />
    </div>
  );
}

export function AdDesignerBody({ prompt, gen }: { prompt: React.ReactNode; gen: number[] }): React.ReactElement {
  const done = gen.filter((g) => g >= 1).length;
  const started = gen.some((g) => g > 0);
  const panel: React.CSSProperties = { borderRadius: 12, border: `1px solid ${C.line}`, background: C.card, padding: 16, display: "flex", flexDirection: "column" };
  return (
    <div style={{ flex: 1, display: "flex", gap: 16, padding: "0 24px 24px", minHeight: 0 }}>
      <div style={{ ...panel, width: 250, flexShrink: 0, gap: 18 }}>
        <div>
          <Label>Brief</Label>
          <div style={{ minHeight: 86, borderRadius: 8, border: `1px solid ${tint(C.meta, 45)}`, background: C.page, padding: "10px 12px", fontSize: 14, lineHeight: 1.45, color: C.strong }}>{prompt}</div>
          <Button meta style={{ marginTop: 10, height: 32, width: "100%", justifyContent: "center", fontSize: 13.5 }}>
            <WandSparklesIcon style={{ width: 14, height: 14 }} /> Generate with Muse Image
          </Button>
        </div>
        <div>
          <Label>Source Photo</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 54, height: 54, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
              <Photo n={3} width={54} height={54} />
            </div>
            <div style={{ fontSize: 13, color: C.fg, lineHeight: 1.4 }}>
              tulips-02.jpg
              <div style={{ color: C.dim, fontSize: 12.5 }}>Library · 1600 × 2400</div>
            </div>
          </div>
        </div>
        <div>
          <Label>Copy</Label>
          <Field label="Headline" value={HEADLINE} />
          <Field label="Call to Action" value={CTA} />
          <Field
            label="Palette"
            value={["#ffffff", "#111111", "#d99aa0"].map((c) => (
              <span key={c} style={{ width: 16, height: 16, borderRadius: 99, background: c, border: `1px solid ${C.line}` }} />
            ))}
          />
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.5 }}>Muse Image keeps the photo and sets the type on each format</div>
      </div>

      <div style={{ flex: 1, minWidth: 0, borderRadius: 12, border: `1px solid ${C.line}`, background: C.panel, position: "relative", display: "flex", flexDirection: "column" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle, ${C.line} 1px, transparent 1.4px)`, backgroundSize: "22px 22px", borderRadius: 12, opacity: 0.5 }} />
        <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 20, paddingTop: 72 }}>
          {FORMATS.map((f, i) => (
            <div key={f.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{ alignSelf: "stretch", display: "flex", justifyContent: "space-between", fontSize: 12, color: C.dim }}>
                <span style={{ color: C.muted }}>{f.name}</span>
                <span style={{ fontFamily: MONO }}>{f.size}</span>
              </div>
              <Ad w={f.w} h={f.h} focus={f.focus} p={gen[i] ?? 0} />
            </div>
          ))}
        </div>
        <div style={{ position: "relative", height: 40, borderTop: `1px solid ${C.lineSoft}`, display: "flex", alignItems: "center", padding: "0 14px", gap: 14, fontSize: 12.5, color: C.dim }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, color: started ? C.meta : C.dim }}>
            <MuseGlyph size={18} />
            {done === FORMATS.length ? `Muse Image · ${done} of ${FORMATS.length} formats ready` : started ? `Muse Image · generating ${Math.min(FORMATS.length, done + 1)} of ${FORMATS.length}` : "Muse Image · ready"}
          </span>
          <div style={{ flex: 1 }} />
          <span>Fit</span>
          <span style={{ fontFamily: MONO }}>50%</span>
        </div>
      </div>

      <div style={{ ...panel, width: 260, flexShrink: 0, padding: "16px 10px", gap: 6 }}>
        <Label style={{ padding: "0 8px", display: "flex", alignItems: "center", gap: 6 }}>
          <LayersIcon style={{ width: 12, height: 12 }} /> Layers
        </Label>
        <LayerRow icon={TypeIcon} name="Logo" />
        <LayerRow icon={TypeIcon} name="Headline" active />
        <LayerRow icon={SquareIcon} name="Call to Action" />
        <LayerRow icon={SlidersHorizontalIcon} name="Overlay" />
        <LayerRow icon={ImageIcon} name="tulips-02.jpg" />
        <div style={{ height: 1, background: C.lineSoft, margin: "12px -10px 10px" }} />
        <Label style={{ padding: "0 8px" }}>Headline</Label>
        <div style={{ padding: "0 8px" }}>
          <Field label="Font" value="Cal Sans" />
          <Field label="Size" value="56" mono />
          <Field label="Tracking" value="-1%" mono />
          <Field label="Colour" value={<><span style={{ width: 14, height: 14, borderRadius: 4, background: "#fff" }} /> #FFFFFF</>} mono />
          <Field label="Align" value={<AlignLeftIcon style={{ width: 14, height: 14, color: C.fg }} />} />
          <Field label="Position" value="Bottom left" />
        </div>
      </div>
    </div>
  );
}
