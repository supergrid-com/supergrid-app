import type { CSSProperties, ReactNode } from "react";

// The pieces the repo README's pictures share, after the site's own (the hero's dark card, the core
// grid's big tiles). Each picture in this folder is a page laid out at a fixed size and captured
// with headless Chrome into the repo's .github/readme/ folder; the leading underscore keeps them off
// the site. See the README for the capture command.

/** A picture's frame: a fixed size, transparent outside its rounded card, and no dev badge. */
export function Frame({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  return (
    <div style={{ width, height }} className="relative">
      <style>{"nextjs-portal{display:none!important}html,body{background:transparent!important}"}</style>
      {children}
    </div>
  );
}

/** The hero's light, still: its five colours under the dark top, then the dot grid. */
export function Glow({ fade = true }: { fade?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
      <div className="hero-blob hero-blob-violet [animation:none]" />
      <div className="hero-blob hero-blob-blue [animation:none]" />
      <div className="hero-blob hero-blob-cyan [animation:none]" />
      <div className="hero-blob hero-blob-magenta [animation:none]" />
      <div className="hero-blob hero-blob-orange [animation:none]" />
      {fade ? <div className="hero-fade" /> : null}
      <div className="hero-dots [animation:none]" />
    </div>
  );
}

/** One of the core grid's dark tiles: a glow rising from the bottom, the dots, a logo, a name and a line. */
export function Tile({ title, logo, glow, children, className, style }: { title: string; logo: ReactNode; glow: string; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`relative isolate flex flex-col items-center justify-center overflow-hidden bg-[#1B1D24] px-8 text-center text-white ${className ?? ""}`} style={style}>
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-x-[-20%] -bottom-1/2 h-full rounded-full blur-3xl" style={{ background: `radial-gradient(closest-side, ${glow}, transparent)` }} />
        <div className="dots absolute inset-0" />
      </div>
      <div className="mb-4 grid h-14 place-items-center">{logo}</div>
      <div className="text-[26px] font-medium tracking-wide">{title}</div>
      <p className="mt-2 max-w-[340px] text-[16px] leading-relaxed text-white/60">{children}</p>
    </div>
  );
}
