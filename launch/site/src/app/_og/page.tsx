import { Mark, MuseGlyph } from "@/components/brand";

// The share card, laid out at 1200 × 630 in the site's own fonts and captured to
// app/opengraph-image.png with headless Chrome. The leading underscore keeps it off the site; to
// change the card, rename the folder to `og`, edit, capture (see README), and rename it back. The hero in small: the dark card, its
// drifting colour, the dot grid, the headline.

export const metadata = { robots: { index: false } };

export default function OgCard() {
  return (
    <div className="relative isolate flex h-[630px] w-[1200px] flex-col overflow-hidden bg-[#1B1D24] px-20 pt-16 pb-14 text-white">
      {/* keep the dev server's badge out of the capture */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="hero-blob hero-blob-violet [animation:none]" />
        <div className="hero-blob hero-blob-blue [animation:none]" />
        <div className="hero-blob hero-blob-cyan [animation:none]" />
        <div className="hero-blob hero-blob-magenta [animation:none]" />
        <div className="hero-blob hero-blob-orange [animation:none]" />
        <div className="hero-fade" />
        <div className="hero-dots [animation:none]" />
      </div>

      <div className="flex items-center gap-3.5 text-[30px] font-medium tracking-wide">
        <Mark size={36} mono />
        SuperGrid
      </div>

      <div className="mt-auto">
        <div className="text-[18px] font-medium tracking-[0.22em] text-white/70 uppercase">Creators &amp; Marketers</div>
        <div className="hero-title mt-5 text-[76px] leading-[1.05] font-medium tracking-wide">Introducing a new way to build</div>
        <div className="mt-6 max-w-[880px] text-[30px] leading-snug tracking-wide text-balance text-white/80">Build, own and extend your own marketing stack, with the AI you already pay for</div>
      </div>

      <div className="mt-12 flex items-center gap-3 text-[20px] font-medium">
        {["Self-hosted", "Your own Muse Code", "Extend & build"].map((b) => (
          <span key={b} className="flex items-center gap-2.5 rounded-full bg-[#1B1D24]/45 px-5 py-2.5 backdrop-blur-md">
            {b === "Your own Muse Code" ? <MuseGlyph className="h-3 w-6" /> : null}
            {b}
          </span>
        ))}
        <span className="ml-auto text-white/60">supergrid.com</span>
      </div>
    </div>
  );
}
