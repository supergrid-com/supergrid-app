import Image from "next/image";
import type { ReactNode } from "react";

// The pieces the page is built from, after the launch film's kit (launch/video/film/src/kit.tsx).

// The mark's four diamonds, each with its hole, in the hero's colours: cyan on top, orange on the
// right, magenta at the bottom, violet on the left.
const DIAMONDS = [
  {
    color: "#26d9f0",
    d: "M4.67129 3.14634C4.47603 3.34161 4.47603 3.65819 4.67129 3.85345L7.14616 6.32833C7.34142 6.52359 7.65801 6.52359 7.85327 6.32833L10.3281 3.85345C10.5234 3.65819 10.5234 3.34161 10.3281 3.14634L7.85327 0.671471C7.65801 0.476209 7.34142 0.476209 7.14616 0.671471L4.67129 3.14634ZM7.49971 5.26766L5.73195 3.4999L7.49971 1.73213L9.26748 3.4999L7.49971 5.26766Z",
  },
  {
    color: "#ff5a1f",
    d: "M8.67129 7.14634C8.47603 7.34161 8.47603 7.65819 8.67129 7.85345L11.1462 10.3283C11.3414 10.5236 11.658 10.5236 11.8533 10.3283L14.3281 7.85345C14.5234 7.65819 14.5234 7.34161 14.3281 7.14634L11.8533 4.67147C11.658 4.47621 11.3414 4.47621 11.1462 4.67147L8.67129 7.14634ZM11.4997 9.26766L9.73195 7.4999L11.4997 5.73213L13.2675 7.4999L11.4997 9.26766Z",
  },
  {
    color: "#ec1480",
    d: "M4.67129 11.8535C4.47603 11.6582 4.47603 11.3416 4.67129 11.1463L7.14616 8.67147C7.34142 8.47621 7.65801 8.47621 7.85327 8.67147L10.3281 11.1463C10.5234 11.3416 10.5234 11.6582 10.3281 11.8535L7.85327 14.3283C7.65801 14.5236 7.34142 14.5236 7.14616 14.3283L4.67129 11.8535ZM5.73195 11.4999L7.49971 13.2677L9.26748 11.4999L7.49971 9.73213L5.73195 11.4999Z",
  },
  {
    color: "#9b3dff",
    d: "M0.671288 7.14649C0.476026 7.34175 0.476026 7.65834 0.671288 7.8536L3.14616 10.3285C3.34142 10.5237 3.65801 10.5237 3.85327 10.3285L6.32814 7.8536C6.5234 7.65834 6.5234 7.34175 6.32814 7.14649L3.85327 4.67162C3.65801 4.47636 3.34142 4.47636 3.14616 4.67162L0.671288 7.14649ZM3.49972 9.26781L1.73195 7.50005L3.49972 5.73228L5.26748 7.50005L3.49972 9.26781Z",
  },
];

/** The SuperGrid mark: four diamonds on a grid, each its own colour, or all in the text colour when `mono`. */
export function Mark({ size = 28, mono, className }: { size?: number; mono?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none" className={className} aria-hidden>
      {DIAMONDS.map((p) => (
        <path key={p.color} d={p.d} fill={mono ? "currentColor" : p.color} fillRule="evenodd" clipRule="evenodd" />
      ))}
    </svg>
  );
}

// The infinity loop, as a path in a 100 × 50 box.
const LOOP = (() => {
  const pts: string[] = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const d = 1 + Math.sin(a) ** 2;
    pts.push(`${(50 + (42 * Math.cos(a)) / d).toFixed(2)} ${(25 + (42 * Math.sin(a) * Math.cos(a)) / d).toFixed(2)}`);
  }
  return `M${pts.join(" L")}Z`;
})();

/** Muse's sign: an infinity loop in Meta blue. */
export function MuseGlyph({ size, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size === undefined ? undefined : size / 2} viewBox="0 0 100 50" className={`shrink-0 ${className ?? ""}`} aria-hidden>
      <defs>
        <linearGradient id="muse-loop" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--color-meta)" />
          <stop offset="1" stopColor="var(--color-meta-sky)" />
        </linearGradient>
      </defs>
      <path d={LOOP} fill="none" stroke="url(#muse-loop)" strokeWidth={9} strokeLinejoin="round" />
    </svg>
  );
}

/** "Muse Code", "Muse Image" and so on, with the loop. */
export function Muse({ product, byMeta, className }: { product?: string; byMeta?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.3em] whitespace-nowrap ${className ?? ""}`}>
      <MuseGlyph className="h-[0.68em] w-[1.36em]" />
      <span>Muse{product ? ` ${product}` : ""}</span>
      {byMeta ? <span className="ml-[0.1em] text-[0.62em] text-muted">by Meta</span> : null}
    </span>
  );
}

/** The page column. */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1200px] px-4 sm:px-6 ${className ?? ""}`}>{children}</div>;
}

/** A section of the page. */
export function Section({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`relative scroll-mt-20 py-20 md:py-32 ${className ?? ""}`}>
      {children}
    </section>
  );
}

/** A small rounded label. `dark` is for inside the dark panels. */
export function Chip({ children, tone = "neutral", dark, className }: { children: ReactNode; tone?: "neutral" | "accent" | "success" | "meta" | "cf"; dark?: boolean; className?: string }) {
  const tones = dark
    ? {
        neutral: "bg-white/[0.08] text-white/85",
        accent: "bg-accent/15 text-[#ff9c8a]",
        success: "bg-green/15 text-[#5ee0a0]",
        meta: "bg-meta/15 text-[#7fb2ff]",
        cf: "bg-cf/15 text-[#ffb067]",
      }[tone]
    : {
        neutral: "bg-soft text-ink-2",
        accent: "bg-accent-soft text-accent-ink",
        success: "bg-green-soft text-green",
        meta: "bg-meta-soft text-meta",
        cf: "bg-cf/10 text-[#b85a0a]",
      }[tone];
  return <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap ${tones} ${className ?? ""}`}>{children}</span>;
}

export function Button({ href, children, primary, dark, className }: { href: string; children: ReactNode; primary?: boolean; dark?: boolean; className?: string }) {
  const look = dark
    ? primary
      ? "bg-white text-ink hover:bg-white/90"
      : "border border-white/20 bg-white/[0.04] text-white hover:bg-white/10"
    : primary
      ? "bg-ink text-white hover:bg-ink-2"
      : "bg-soft text-ink hover:bg-[#ebebef]";
  return (
    <a href={href} className={`inline-flex h-12 items-center gap-2 rounded-full px-6 text-[17px] transition-colors ${look} ${className ?? ""}`}>
      {children}
    </a>
  );
}

/** A frame from the launch film: the app in its dark Pitch theme, lifted off the page. */
export function Shot({ src, alt, priority, className }: { src: string; alt: string; priority?: boolean; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl bg-pitch shadow-shot md:rounded-2xl ${className ?? ""}`}>
      <Image src={src} alt={alt} width={1804} height={946} priority={priority} sizes="(min-width: 1280px) 1200px, 100vw" className="block h-auto w-full scale-[1.004]" />
    </div>
  );
}

/** A section's small lead-in, in the blueprint's mono. */
export function Eyebrow({ children, dark, className }: { children: ReactNode; dark?: boolean; className?: string }) {
  return <div className={`font-mono text-[12px] tracking-[0.2em] uppercase ${dark ? "text-white/45" : "text-accent"} ${className ?? ""}`}>{children}</div>;
}

/** The big line a section leads with. No full stops. */
export function Title({ children, dark, className }: { children: ReactNode; dark?: boolean; className?: string }) {
  return <h2 className={`text-[34px] leading-[1.1] font-medium tracking-wide text-balance md:text-5xl ${dark ? "text-white" : "text-ink"} ${className ?? ""}`}>{children}</h2>;
}

/** The quieter line under a title. */
export function Sub({ children, dark, className }: { children: ReactNode; dark?: boolean; className?: string }) {
  return <p className={`text-lg leading-relaxed tracking-wide text-pretty md:text-xl ${dark ? "text-white/65" : "text-muted"} ${className ?? ""}`}>{children}</p>;
}

/** A soft card on the white page. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`relative overflow-hidden rounded-3xl bg-soft ${className ?? ""}`}>{children}</div>;
}

/** A big inset panel like the hero's card: #1B1D24 with the dot grid and a soft glow in one corner. */
export function Panel({ id, children, glow = "violet", className }: { id?: string; children: ReactNode; glow?: "violet" | "cyan" | "orange" | "magenta" | "none"; className?: string }) {
  return (
    <div id={id} className={`relative isolate overflow-hidden rounded-[22px] bg-[#1B1D24] text-white md:rounded-[32px] ${className ?? ""}`}>
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        {glow !== "none" ? <div className={`panel-glow panel-glow-${glow}`} /> : null}
        <div className="dots absolute inset-0" />
      </div>
      {children}
    </div>
  );
}
