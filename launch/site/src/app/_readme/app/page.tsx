import { Frame, Glow } from "../art";
import shot from "./window.png";

// The README's product shot: a real capture of the desktop app (the demo workspace, Muse Code's
// answer beside the Spring Launch report) rising out of the hero's dark card, as the site's hero
// sets its app. window.png is that capture, 1480 × 900 at 2x, taken over the DevTools protocol.

export const metadata = { robots: { index: false } };

export default function ReadmeApp() {
  return (
    <Frame width={1600} height={860}>
      <div className="relative isolate flex h-full w-full justify-center overflow-hidden rounded-[28px] bg-[#1B1D24] [clip-path:inset(0_round_28px)] pt-16">
        <Glow fade={false} />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,#1b1d24_0%,rgb(27_29_36/55%)_45%,rgb(27_29_36/5%)_100%)]" aria-hidden />
        <div className="relative h-fit">
          <div className="absolute -inset-3.5 rounded-[22px] border border-dashed border-white/12" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shot.src} alt="" width={1400} height={851} className="block rounded-xl shadow-[0_0_0_1px_rgb(255_255_255/10%),0_30px_80px_rgb(0_0_0/45%)]" />
          <TrafficLights />
        </div>
      </div>
    </Frame>
  );
}

// macOS draws the window buttons, so the capture has a gap where they sit. They go back in at the
// window's trafficLightPosition (16, 21 in app/src/main/index.ts), 12 px each on 20 px centres,
// scaled to the shot's 1400 of 1480 px.
const S = 1400 / 1480;

function TrafficLights() {
  return (
    <div className="absolute flex" style={{ left: 16 * S, top: 21 * S, gap: 8 * S }} aria-hidden>
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <span key={c} className="rounded-full shadow-[inset_0_0_0_0.5px_rgb(0_0_0/25%)]" style={{ width: 12 * S, height: 12 * S, background: c }} />
      ))}
    </div>
  );
}
