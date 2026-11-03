import type * as React from "react";
import { ColorField, Segmented, Slider } from "./controls";
import type { LiftTile, MarkConfig } from "./mark";
import { applyPalette, paletteChip, palettes, usesPalette } from "./palettes";

export function Editor({
  c,
  onChange,
}: {
  c: MarkConfig;
  onChange: (next: MarkConfig) => void;
}): React.ReactElement {
  const set =
    <K extends keyof MarkConfig>(key: K) =>
    (value: MarkConfig[K]) =>
      onChange({ ...c, [key]: value });
  const lifts: (readonly [LiftTile, string])[] = [
    ["none", "none"],
    ["tl", "↖"],
    ["tr", "↗"],
    ["bl", "↙"],
    ["br", "↘"],
    ...(c.n % 2 === 1 ? [["center", "·"] as const] : []),
  ];

  return (
    <div className="editor">
      <Group title="Grid">
        <Segmented
          label="Tiles"
          value={String(c.n)}
          options={[
            ["2", "2 × 2"],
            ["3", "3 × 3"],
          ]}
          onChange={(v) => onChange({ ...c, n: Number(v), lift: c.lift === "center" && v === "2" ? "none" : c.lift })}
        />
        <Slider label="Gap" value={c.gap} min={0} max={20} step={0.5} onChange={set("gap")} />
        <Slider label="Corner radius" value={c.radius} min={0} max={50} unit="%" onChange={set("radius")} />
        <Slider label="Inner notch" value={c.notch} min={0} max={50} unit="%" onChange={set("notch")} />
        <Segmented label="Fill" value={c.fill} options={["solid", "outline"]} onChange={set("fill")} />
        {c.fill === "outline" && (
          <Slider label="Outline weight" value={c.line} min={1} max={14} step={0.5} onChange={set("line")} />
        )}
      </Group>

      <Group title="Turn">
        <Slider label="Rotate grid" value={c.rotate} min={0} max={90} unit="°" onChange={set("rotate")} />
        <Slider label="Spin each tile" value={c.spin} min={-45} max={45} unit="°" onChange={set("spin")} />
      </Group>

      <Group title="Lift">
        <Segmented label="Tile" value={c.lift} options={lifts} onChange={set("lift")} />
        {c.lift !== "none" && (
          <>
            <Slider label="Tilt" value={c.liftAngle} min={-45} max={45} unit="°" onChange={set("liftAngle")} />
            <Slider label="Offset" value={c.liftOffset} min={0} max={25} step={0.5} onChange={set("liftOffset")} />
          </>
        )}
      </Group>

      <Group title="Colour">
        <div className="chips" role="group" aria-label="Palettes">
          {palettes.map((p) => (
            <button
              key={p.name}
              type="button"
              title={p.name}
              aria-label={`${p.name} palette`}
              className={usesPalette(c, p) ? "on" : undefined}
              style={{ background: paletteChip(p) }}
              onClick={() => onChange(applyPalette(c, p))}
            />
          ))}
        </div>
        <ColorField label="Ink" value={c.fg} onChange={set("fg")} />
        <ColorField label="Ground" value={c.bg} onChange={set("bg")} />
        <ColorField label="Accent" value={c.accent} onChange={set("accent")} />
        <Segmented label="Gradient" value={c.gradient} options={["none", "tiles", "ground"]} onChange={set("gradient")} />
        {c.gradient !== "none" && (
          <>
            <div className="gradient-bar" style={{ background: `linear-gradient(90deg, ${c.g1}, ${c.g2}, ${c.g3})` }} />
            <ColorField label="From" value={c.g1} onChange={set("g1")} />
            <ColorField label="Through" value={c.g2} onChange={set("g2")} />
            <ColorField label="To" value={c.g3} onChange={set("g3")} />
          </>
        )}
        <Segmented
          label="Accent on"
          value={c.accentOn}
          options={[
            ["none", "none"],
            ["lifted", "lifted tile"],
            ["first", "first tile"],
          ]}
          onChange={set("accentOn")}
        />
      </Group>

      <Group title="Container">
        <Segmented label="Tile" value={c.tile} options={["none", "square", "rounded", "circle"]} onChange={set("tile")} />
        <Slider label="Padding" value={c.padding} min={0} max={30} unit="%" onChange={set("padding")} />
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section className="group">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
