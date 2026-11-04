import { CodeIcon, ServerIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Mark, MuseGlyph } from "@/components/brand";
import { Frame, Glow } from "../art";

// The README's banner: the hero's dark card cut short, its light turned down, with the white mark,
// the name and the one line, and the film's blueprint guides drawn faintly around the content.

export const metadata = { robots: { index: false } };

// where the blueprint guides run, in px from the card's edges
const GX = 64;
const GY = 52;

export default function ReadmeHero() {
  return (
    <Frame width={1600} height={440}>
      <div className="relative isolate h-full w-full overflow-hidden rounded-[28px] bg-[#16181e] [clip-path:inset(0_round_28px)] text-white">
        {/* the glow, quieter than the site's, and kept to the lower edge */}
        <div className="absolute inset-0 -z-10 opacity-45">
          <Glow />
        </div>
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_30%_0%,#16181e_35%,transparent_75%)]" aria-hidden />
        <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/[0.07] ring-inset" aria-hidden />
        <Guides />

        <div className="absolute flex flex-col" style={{ inset: `${GY + 26}px ${GX + 36}px ${GY + 30}px` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[26px] font-medium tracking-wide">
              <Mark size={30} mono className="text-white" />
              SuperGrid
            </div>
            <span className="font-mono text-[13px] tracking-[0.18em] text-white/40 uppercase">supergrid.com</span>
          </div>

          <div className="mt-auto flex items-end justify-between gap-12">
            <div>
              <div className="text-[26px] tracking-wide text-white">A new type of SaaS</div>
              <div className="mt-3 bg-gradient-to-b from-white to-white/75 bg-clip-text text-[62px] leading-[1.04] font-medium tracking-wide text-transparent">The IDE for Creators &amp; Marketers</div>
              <div className="mt-4 flex items-center gap-2.5 text-[24px] tracking-wide text-white/70">
                powered by
                <span className="inline-flex items-center gap-2 text-white">
                  <MuseGlyph className="h-3.5 w-7" />
                  Muse Code
                </span>
              </div>
            </div>
            <ul className="flex flex-col gap-2.5 pb-1.5">
              <Pill icon={<ServerIcon className="size-4 text-white/60" strokeWidth={1.8} />}>Self-hosted on your Cloudflare</Pill>
              <Pill icon={<CodeIcon className="size-4 text-white/60" strokeWidth={1.8} />}>You own every line</Pill>
            </ul>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function Pill({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 self-end rounded-full border border-white/[0.09] bg-white/[0.04] px-4 py-2 text-[16px] tracking-wide text-white/85 backdrop-blur-md">
      {icon}
      {children}
    </li>
  );
}

/** Hairline guides across and down the card, with a small crosshair where they meet, like the film's blueprint. */
function Guides() {
  const line = "absolute bg-white/[0.06]";
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className={`${line} inset-x-0 h-px`} style={{ top: GY }} />
      <div className={`${line} inset-x-0 h-px`} style={{ bottom: GY }} />
      <div className={`${line} inset-y-0 w-px`} style={{ left: GX }} />
      <div className={`${line} inset-y-0 w-px`} style={{ right: GX }} />
      {[
        { left: GX, top: GY },
        { right: GX, top: GY },
        { left: GX, bottom: GY },
        { right: GX, bottom: GY },
      ].map((at, i) => (
        <div key={i} className="absolute size-[15px]" style={{ ...at, translate: `${"left" in at ? "-7px" : "7px"} ${"top" in at ? "-7px" : "7px"}` }}>
          <div className="absolute inset-x-0 top-[7px] h-px bg-white/30" />
          <div className="absolute inset-y-0 left-[7px] w-px bg-white/30" />
        </div>
      ))}
    </div>
  );
}
