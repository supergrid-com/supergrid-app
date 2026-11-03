import { useId } from "react";
import type * as React from "react";

// The mark is a square grid of rounded tiles. Everything else is a move on that grid: cut the
// corners that meet in the middle, turn the whole thing, or lift one tile out of place. The grid
// spans 100 units before any of that; the viewBox is a square fitted around what ends up drawn.

export type LiftTile = "none" | "tl" | "tr" | "bl" | "br" | "center";

export type MarkConfig = {
  n: number; // tiles per side
  gap: number; // between tiles, % of the grid
  radius: number; // tile corner radius, % of a tile
  notch: number; // cut on the corners that meet inside the grid, % of a tile
  fill: "solid" | "outline";
  line: number; // outline weight
  rotate: number; // the whole grid, degrees
  spin: number; // each tile about its own centre, degrees
  lift: LiftTile;
  liftAngle: number;
  liftOffset: number; // how far the lifted tile moves away from the centre
  accentOn: "none" | "lifted" | "first";
  fg: string;
  bg: string;
  accent: string;
  gradient: "none" | "tiles" | "ground"; // run g1 → g2 → g3 across the tiles, or behind them
  g1: string;
  g2: string;
  g3: string;
  tile: "none" | "square" | "rounded" | "circle";
  padding: number; // % of the drawing, each side
};

export const defaultMark: MarkConfig = {
  n: 2,
  gap: 7,
  radius: 14,
  notch: 0,
  fill: "solid",
  line: 5,
  rotate: 0,
  spin: 0,
  lift: "tr",
  liftAngle: 14,
  liftOffset: 6,
  accentOn: "none",
  fg: "#ffffff",
  bg: "#000000",
  accent: "#4d7cff",
  gradient: "none",
  g1: "#f2f47a",
  g2: "#f7a8a8",
  g3: "#f36ef0",
  tile: "none",
  padding: 8,
};

// The ground as a CSS background, for stages that sit behind a mark with no tile of its own.
// 45deg runs bottom-left to top-right, the same way the SVG gradients do.
export function groundCss(c: MarkConfig): string {
  return c.gradient === "ground" ? `linear-gradient(45deg, ${c.g1}, ${c.g2}, ${c.g3})` : c.bg;
}

type Pt = [number, number];

function turn([x, y]: Pt, deg: number, [cx, cy]: Pt): Pt {
  const a = (deg * Math.PI) / 180;
  const [dx, dy] = [x - cx, y - cy];
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}

// One tile's outline. A corner that sits on an inside grid intersection gets the notch cut;
// every other corner is rounded.
function tilePath(x: number, y: number, s: number, cut: [boolean, boolean, boolean, boolean], r: number, c: number) {
  const [tl, tr, br, bl] = cut.map((k) => (k && c > 0 ? c : r));
  const corner = (k: boolean, size: number, ex: number, ey: number) =>
    k && c > 0 ? `L${ex} ${ey}` : `A${size} ${size} 0 0 1 ${ex} ${ey}`;
  return [
    `M${x + tl} ${y}`,
    `H${x + s - tr}`,
    corner(cut[1], tr, x + s, y + tr),
    `V${y + s - br}`,
    corner(cut[2], br, x + s - br, y + s),
    `H${x + bl}`,
    corner(cut[3], bl, x, y + s - bl),
    `V${y + tl}`,
    corner(cut[0], tl, x + tl, y),
    "Z",
  ].join(" ");
}

type Placed = { key: string; d: string; transform: string; corners: Pt[]; lifted: boolean; first: boolean };

function layout(c: MarkConfig): Placed[] {
  const n = Math.max(1, Math.round(c.n));
  const s = (100 - (n - 1) * c.gap) / n;
  const r = Math.min((c.radius / 100) * s, s / 2);
  const notch = Math.min((c.notch / 100) * s, s / 2);
  const inside = (i: number, j: number) => i > 0 && i < n && j > 0 && j < n;
  const liftAt: Record<Exclude<LiftTile, "none">, Pt> = {
    tl: [0, 0],
    tr: [n - 1, 0],
    bl: [0, n - 1],
    br: [n - 1, n - 1],
    center: [Math.floor(n / 2), Math.floor(n / 2)],
  };
  const lifted = c.lift === "none" || (c.lift === "center" && n % 2 === 0) ? null : liftAt[c.lift];

  const out: Placed[] = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = i * (s + c.gap);
      const y = j * (s + c.gap);
      const centre: Pt = [x + s / 2, y + s / 2];
      const isLifted = !!lifted && lifted[0] === i && lifted[1] === j;

      let angle = c.spin;
      let move: Pt = [0, 0];
      if (isLifted) {
        angle += c.liftAngle;
        const [dx, dy] = [centre[0] - 50, centre[1] - 50];
        const len = Math.hypot(dx, dy);
        move = len ? [(dx / len) * c.liftOffset, (dy / len) * c.liftOffset] : [0, -c.liftOffset];
      }

      const cut: [boolean, boolean, boolean, boolean] = [
        inside(i, j),
        inside(i + 1, j),
        inside(i + 1, j + 1),
        inside(i, j + 1),
      ];
      const box: Pt[] = [
        [x, y],
        [x + s, y],
        [x + s, y + s],
        [x, y + s],
      ];
      out.push({
        key: `${i}-${j}`,
        d: tilePath(x, y, s, cut, r, notch),
        transform: `translate(${move[0]} ${move[1]}) rotate(${angle} ${centre[0]} ${centre[1]})`,
        corners: box.map((p) => {
          const [px, py] = turn(p, angle, centre);
          return turn([px + move[0], py + move[1]], c.rotate, [50, 50]);
        }),
        lifted: isLifted,
        first: i === 0 && j === 0,
      });
    }
  }
  return out;
}

export function Mark({
  c,
  size,
  className,
  style,
}: {
  c: MarkConfig;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}): React.ReactElement {
  const tiles = layout(c);
  const xs = tiles.flatMap((t) => t.corners.map((p) => p[0]));
  const ys = tiles.flatMap((t) => t.corners.map((p) => p[1]));
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const stroke = c.fill === "outline" ? c.line : 0;
  const drawn = Math.max(maxX - minX, maxY - minY) + stroke;
  const side = drawn * (1 + (2 * c.padding) / 100);
  const [cx, cy] = [(minX + maxX) / 2, (minY + maxY) / 2];
  const [vx, vy] = [cx - side / 2, cy - side / 2];

  const id = `m${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const ink = c.gradient === "tiles" ? `url(#${id}-tiles)` : c.fg;
  const ground = c.gradient === "ground" ? `url(#${id}-ground)` : c.bg;
  const colour = (t: Placed) =>
    (c.accentOn === "lifted" && t.lifted) || (c.accentOn === "first" && t.first) ? c.accent : ink;
  const stops = [c.g1, c.g2, c.g3].map((g, i) => <stop key={i} offset={i / 2} stopColor={g} />);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${vx} ${vy} ${side} ${side}`}
      width={size}
      height={size}
      className={className}
      style={style}
      role="img"
      aria-label="SuperGrid mark"
    >
      {c.gradient !== "none" && (
        <defs>
          {/* The tiles sit inside the rotated group, so their gradient is turned back to run
              bottom-left to top-right on screen, across just the drawn tiles. */}
          <linearGradient
            id={`${id}-tiles`}
            gradientUnits="userSpaceOnUse"
            x1={cx - drawn / 2}
            y1={cy + drawn / 2}
            x2={cx + drawn / 2}
            y2={cy - drawn / 2}
            gradientTransform={`rotate(${-c.rotate} 50 50)`}
          >
            {stops}
          </linearGradient>
          <linearGradient id={`${id}-ground`} gradientUnits="userSpaceOnUse" x1={vx} y1={vy + side} x2={vx + side} y2={vy}>
            {stops}
          </linearGradient>
        </defs>
      )}
      {c.tile === "circle" && <circle cx={cx} cy={cy} r={side / 2} fill={ground} />}
      {(c.tile === "square" || c.tile === "rounded") && (
        <rect x={vx} y={vy} width={side} height={side} rx={c.tile === "rounded" ? side * 0.225 : 0} fill={ground} />
      )}
      <g transform={`rotate(${c.rotate} 50 50)`}>
        {tiles.map((t) => (
          <path
            key={t.key}
            d={t.d}
            transform={t.transform}
            fill={c.fill === "solid" ? colour(t) : "none"}
            stroke={c.fill === "outline" ? colour(t) : undefined}
            strokeWidth={stroke || undefined}
            strokeLinejoin="round"
          />
        ))}
      </g>
    </svg>
  );
}
